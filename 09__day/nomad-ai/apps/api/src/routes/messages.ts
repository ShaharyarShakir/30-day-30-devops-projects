import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { MessageModel } from "../db/core-models.js";

const messagesRouter = new Hono<{ Variables: AuthContextVariables }>();

messagesRouter.use("*", authMiddleware);

// GET /:tripId - Fetch trip messages (supports text query search)
messagesRouter.get("/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  const searchQuery = c.req.query("q");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const skip = (page - 1) * limit;

  try {
    const filter: any = { tripId: new mongoose.Types.ObjectId(tripId) };
    
    if (searchQuery) {
      filter.content = { $regex: searchQuery, $options: "i" };
    }

    const messages = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MessageModel.countDocuments(filter);

    return c.json({
      success: true,
      data: {
        messages: messages.reverse(), // chronologically ordered
        total,
        page,
        limit,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /reactions/:messageId - Toggle a message reaction
messagesRouter.post("/reactions/:messageId", async (c) => {
  const user = c.get("user");
  const messageId = c.req.param("messageId");
  const { emoji } = await c.req.json();

  if (!emoji) {
    return c.json({ success: false, error: "Emoji is required." }, 400);
  }

  try {
    const message = await MessageModel.findById(messageId);
    if (!message) {
      return c.json({ success: false, error: "Message not found." }, 404);
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r: any) => r.userId.toString() === user.id && r.emoji === emoji
    );

    let updatedMessage;
    if (existingReactionIndex > -1) {
      // Remove reaction if user already selected this emoji
      updatedMessage = await MessageModel.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { userId: new mongoose.Types.ObjectId(user.id), emoji } } },
        { new: true }
      );
    } else {
      // Add new reaction
      updatedMessage = await MessageModel.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { userId: new mongoose.Types.ObjectId(user.id), emoji } } },
        { new: true }
      );
    }

    return c.json({
      success: true,
      data: updatedMessage?.reactions || [],
      message: "Reaction toggled successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default messagesRouter;
