import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { NotificationService } from "../services/notification.js";
import { UserDeviceTokenModel } from "../db/core-models.js";

const notificationsRouter = new Hono<{ Variables: AuthContextVariables }>();

notificationsRouter.use("*", authMiddleware);

// GET / - List user's notifications
notificationsRouter.get("/", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "20", 10);

  try {
    const result = await NotificationService.getNotifications(user.id, { page, limit });
    return c.json({
      success: true,
      data: result,
      message: "Notifications retrieved successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: error.message,
        },
      },
      500
    );
  }
});

// PATCH /:id/read - Mark notification as read
notificationsRouter.patch("/:id/read", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const notification = await NotificationService.markAsRead(user.id, id);
    return c.json({
      success: true,
      data: notification,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "UPDATE_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

// DELETE /:id - Delete notification
notificationsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await NotificationService.deleteNotification(user.id, id);
    return c.json({
      success: true,
      data: {},
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "DELETE_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

// POST /token - Register Expo push token
notificationsRouter.post("/token", async (c) => {
  const user = c.get("user");
  const { token, platform } = await c.req.json();

  if (!token || !platform) {
    return c.json({ success: false, error: "token and platform are required." }, 400);
  }

  try {
    const deviceToken = await UserDeviceTokenModel.findOneAndUpdate(
      { token },
      { userId: new mongoose.Types.ObjectId(user.id), platform },
      { upsert: true, new: true }
    );

    return c.json({
      success: true,
      data: deviceToken,
      message: "Device token registered successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /settings - Retrieve user notification settings
notificationsRouter.get("/settings", async (c) => {
  const user = c.get("user");

  try {
    const settingsRecord = await UserDeviceTokenModel.findOne({
      userId: new mongoose.Types.ObjectId(user.id)
    });

    // Default settings if none registered yet
    const settings = settingsRecord?.settings || {
      invitations: true,
      chat: true,
      uploads: true,
      arrivals: true,
      ai: true,
    };

    return c.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /settings - Update notification settings
notificationsRouter.put("/settings", async (c) => {
  const user = c.get("user");
  const { settings } = await c.req.json();

  if (!settings) {
    return c.json({ success: false, error: "settings object is required." }, 400);
  }

  try {
    const updated = await UserDeviceTokenModel.updateMany(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { $set: { settings } }
    );

    return c.json({
      success: true,
      data: settings,
      message: "Notification settings updated successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default notificationsRouter;
