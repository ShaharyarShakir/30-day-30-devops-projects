import { Hono } from "hono";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { CreateJournalSchema } from "../validators/core.js";
import { JournalService } from "../services/journal.js";

const journalsRouter = new Hono<{ Variables: AuthContextVariables }>();

journalsRouter.use("*", authMiddleware);

// POST / - Create Journal Entry
journalsRouter.post("/", async (c) => {
  const user = c.get("user");
  try {
    const { tripId, ...journalDetails } = await c.req.json();
    if (!tripId) {
      throw new Error("tripId is required.");
    }
    const validated = CreateJournalSchema.parse(journalDetails);
    const journal = await JournalService.createJournal(user.id, tripId, validated);
    
    return c.json({
      success: true,
      data: journal,
      message: "Journal entry created successfully",
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

// GET / - List Journal Entries
journalsRouter.get("/", async (c) => {
  const user = c.get("user");
  const tripId = c.req.query("tripId");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);

  try {
    if (!tripId) {
      throw new Error("tripId query parameter is required.");
    }
    const result = await JournalService.getJournals(user.id, tripId, { page, limit });
    return c.json({
      success: true,
      data: result,
      message: "Journal entries retrieved successfully",
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

// PATCH /:id - Update Journal Entry
journalsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const validated = CreateJournalSchema.partial().parse(body);

    const journal = await JournalService.updateJournal(user.id, id, validated);
    return c.json({
      success: true,
      data: journal,
      message: "Journal entry updated successfully",
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

// DELETE /:id - Delete Journal Entry
journalsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await JournalService.deleteJournal(user.id, id);
    return c.json({
      success: true,
      data: {},
      message: "Journal entry deleted successfully",
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

export default journalsRouter;
