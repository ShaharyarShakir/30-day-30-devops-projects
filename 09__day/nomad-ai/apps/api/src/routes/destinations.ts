import { Hono } from "hono";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { AddDestinationSchema } from "../validators/core.js";
import { DestinationService } from "../services/destination.js";

const destinationsRouter = new Hono<{ Variables: AuthContextVariables }>();

destinationsRouter.use("*", authMiddleware);

// POST / - Add Destination to a Trip
destinationsRouter.post("/", async (c) => {
  const user = c.get("user");
  try {
    const { tripId, ...destDetails } = await c.req.json();
    if (!tripId) {
      throw new Error("tripId is required.");
    }
    const validated = AddDestinationSchema.parse(destDetails);
    const dest = await DestinationService.createDestination(user.id, tripId, validated);
    
    return c.json({
      success: true,
      data: dest,
      message: "Destination added successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message,
        },
      },
      400
    );
  }
});

// GET / - List Destinations for a Trip
destinationsRouter.get("/", async (c) => {
  const user = c.get("user");
  const tripId = c.req.query("tripId");
  try {
    if (!tripId) {
      throw new Error("tripId query parameter is required.");
    }
    const list = await DestinationService.getDestinations(user.id, tripId);
    return c.json({
      success: true,
      data: list,
      message: "Destinations retrieved successfully",
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
      400
    );
  }
});

// PATCH /:id - Update Destination
destinationsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const validated = AddDestinationSchema.partial().parse(body);

    const dest = await DestinationService.updateDestination(user.id, id, validated);
    return c.json({
      success: true,
      data: dest,
      message: "Destination updated successfully",
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

// DELETE /:id - Delete Destination
destinationsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await DestinationService.deleteDestination(user.id, id);
    return c.json({
      success: true,
      data: {},
      message: "Destination deleted successfully",
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

// POST /reorder - Reorder Destinations
destinationsRouter.post("/reorder", async (c) => {
  const user = c.get("user");
  try {
    const { tripId, destinationIds } = await c.req.json();
    if (!tripId || !Array.isArray(destinationIds)) {
      throw new Error("tripId and destinationIds array are required.");
    }
    const list = await DestinationService.reorderDestinations(user.id, tripId, destinationIds);
    return c.json({
      success: true,
      data: list,
      message: "Destinations reordered successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "REORDER_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

export default destinationsRouter;
