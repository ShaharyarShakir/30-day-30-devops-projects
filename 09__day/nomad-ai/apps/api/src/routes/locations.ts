import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { LiveLocationModel } from "../db/core-models.js";
import { broadcastToTrip } from "../websocket/server.js";

const locationsRouter = new Hono<{ Variables: AuthContextVariables }>();

locationsRouter.use("*", authMiddleware);

// GET /:tripId - Fetch active member locations
locationsRouter.get("/:tripId", async (c) => {
  const tripId = c.req.param("tripId");

  try {
    const locations = await LiveLocationModel.find({
      tripId: new mongoose.Types.ObjectId(tripId),
      expiresAt: { $gt: new Date() },
      isActive: true,
    }).populate("userId", "name email image");

    return c.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:tripId - Share or update location (duration in minutes)
locationsRouter.post("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");
  const { latitude, longitude, durationMinutes } = await c.req.json();

  if (latitude === undefined || longitude === undefined) {
    return c.json({ success: false, error: "latitude and longitude are required." }, 400);
  }

  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (durationMinutes || 60));

    const location = await LiveLocationModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(user.id), tripId: new mongoose.Types.ObjectId(tripId) },
      { latitude, longitude, expiresAt, isActive: true },
      { upsert: true, new: true }
    );

    // Broadcast update via WebSocket
    broadcastToTrip(tripId, {
      event: "location_updated",
      payload: {
        userId: user.id,
        userName: user.name || user.email.split("@")[0],
        latitude,
        longitude,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return c.json({
      success: true,
      data: location,
      message: "Location updated successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /:tripId - Stop sharing location
locationsRouter.delete("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");

  try {
    await LiveLocationModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(user.id), tripId: new mongoose.Types.ObjectId(tripId) },
      { isActive: false }
    );

    // Broadcast stop via WebSocket
    broadcastToTrip(tripId, {
      event: "location_stopped",
      payload: {
        userId: user.id,
      },
    });

    return c.json({
      success: true,
      data: {},
      message: "Stopped sharing location",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default locationsRouter;
