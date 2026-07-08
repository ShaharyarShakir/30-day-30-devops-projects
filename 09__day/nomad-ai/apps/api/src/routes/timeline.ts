import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { DestinationModel, ExpenseModel, JournalModel, MediaModel } from "../db/core-models.js";

const timelineRouter = new Hono<{ Variables: AuthContextVariables }>();

timelineRouter.use("*", authMiddleware);

// GET /:tripId - Fetch rich travel timeline events
timelineRouter.get("/:tripId", async (c) => {
  const tripId = c.req.param("tripId");

  try {
    const objectId = new mongoose.Types.ObjectId(tripId);

    // Fetch related records in parallel
    const [destinations, expenses, journals, media] = await Promise.all([
      DestinationModel.find({ tripId: objectId }).sort({ arrivalDate: 1 }),
      ExpenseModel.find({ tripId: objectId }).sort({ createdAt: 1 }),
      JournalModel.find({ tripId: objectId }).sort({ createdAt: 1 }),
      MediaModel.find({ tripId: objectId }).sort({ takenAt: 1 }),
    ]);

    const timelineEvents: any[] = [];

    // Destinations
    destinations.forEach((d) => {
      timelineEvents.push({
        id: `dest-${d._id}`,
        type: "destination",
        date: d.arrivalDate,
        title: `Arrived at ${d.name}`,
        description: d.notes || d.address || "Destination event",
        metadata: {
          destinationId: d._id,
          order: d.order,
          arrivalDate: d.arrivalDate,
          departureDate: d.departureDate,
          latitude: d.latitude,
          longitude: d.longitude,
        },
      });
    });

    // Expenses
    expenses.forEach((e) => {
      timelineEvents.push({
        id: `exp-${e._id}`,
        type: "expense",
        date: e.createdAt,
        title: `Spent ${e.amount} ${e.currency}`,
        description: `${e.category}: ${e.description || "No description"}`,
        metadata: {
          expenseId: e._id,
          category: e.category,
          amount: e.amount,
          currency: e.currency,
          location: e.location,
        },
      });
    });

    // Journals
    journals.forEach((j) => {
      timelineEvents.push({
        id: `journ-${j._id}`,
        type: "journal",
        date: j.createdAt,
        title: `Journal Entry: ${j.title}`,
        description: j.content,
        metadata: {
          journalId: j._id,
          photos: j.photos,
          videos: j.videos,
          voiceNotes: j.voiceNotes,
          location: j.location,
          weather: j.weather,
        },
      });
    });

    // Media Uploads
    media.forEach((m) => {
      timelineEvents.push({
        id: `med-${m._id}`,
        type: "media",
        date: m.takenAt,
        title: `Uploaded ${m.type}`,
        description: m.fileName,
        metadata: {
          mediaId: m._id,
          url: m.url,
          mimeType: m.mimeType,
          aiTags: m.aiTags,
          city: m.city,
          country: m.country,
        },
      });
    });

    // Sort chronologically ascending
    timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return c.json({
      success: true,
      data: timelineEvents,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default timelineRouter;
