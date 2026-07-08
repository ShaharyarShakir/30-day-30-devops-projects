import { Hono } from "hono";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { CreateTripSchema, UpdateTripSchema } from "../validators/core.js";
import { TripService } from "../services/trip.js";

const tripsRouter = new Hono<{ Variables: AuthContextVariables }>();

// All routes are protected
tripsRouter.use("*", authMiddleware);

// POST / - Create Trip
tripsRouter.post("/", async (c) => {
  const user = c.get("user");
  try {
    const body = await c.req.json();
    const validated = CreateTripSchema.parse(body);

    const trip = await TripService.createTrip(user.id, validated);
    return c.json({
      success: true,
      data: trip,
      message: "Trip created successfully",
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

// GET / - List user's Trips
tripsRouter.get("/", async (c) => {
  const user = c.get("user");
  const search = c.req.query("search");
  const country = c.req.query("country");
  const status = c.req.query("status") as any;
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);

  try {
    const result = await TripService.getTrips(user.id, { search, country, status, page, limit });
    return c.json({
      success: true,
      data: result,
      message: "Trips retrieved successfully",
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

// GET /:id - Single Trip
tripsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const trip = await TripService.getTrip(user.id, id);
    return c.json({
      success: true,
      data: trip,
      message: "Trip retrieved successfully",
    });
  } catch (error: any) {
    const status = error.message.includes("Unauthorized") ? 403 : 404;
    return c.json(
      {
        success: false,
        error: {
          code: status === 403 ? "UNAUTHORIZED" : "TRIP_NOT_FOUND",
          message: error.message,
        },
      },
      status
    );
  }
});

// PATCH /:id - Update Trip
tripsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const validated = UpdateTripSchema.parse(body);

    const trip = await TripService.updateTrip(user.id, id, validated);
    return c.json({
      success: true,
      data: trip,
      message: "Trip updated successfully",
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

// DELETE /:id - Delete Trip
tripsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await TripService.deleteTrip(user.id, id);
    return c.json({
      success: true,
      data: {},
      message: "Trip deleted successfully",
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

// POST /:id/invite - Invite Member
tripsRouter.post("/:id/invite", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const { email } = await c.req.json();
    if (!email) {
      throw new Error("Email address is required for invitation.");
    }

    const trip = await TripService.inviteMember(user.id, id, email);
    return c.json({
      success: true,
      data: trip,
      message: "Member invited successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVITATION_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

export default tripsRouter;
