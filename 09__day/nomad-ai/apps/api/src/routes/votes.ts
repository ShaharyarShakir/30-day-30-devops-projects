import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { VoteModel } from "../db/core-models.js";
import { broadcastToTrip } from "../websocket/server.js";

const votesRouter = new Hono<{ Variables: AuthContextVariables }>();

votesRouter.use("*", authMiddleware);

// GET /:tripId - Fetch polls
votesRouter.get("/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  try {
    const votes = await VoteModel.find({
      tripId: new mongoose.Types.ObjectId(tripId)
    }).sort({ createdAt: -1 });

    return c.json({
      success: true,
      data: votes,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:tripId - Create poll
votesRouter.post("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");
  const { title, options } = await c.req.json();

  if (!title || !Array.isArray(options) || options.length < 2) {
    return c.json({ success: false, error: "Title and at least 2 options are required." }, 400);
  }

  try {
    const formattedOptions = options.map((opt: string) => ({ text: opt, votes: [] }));

    const newVote = await VoteModel.create({
      tripId: new mongoose.Types.ObjectId(tripId),
      creatorId: new mongoose.Types.ObjectId(user.id),
      title,
      options: formattedOptions,
      status: "open",
    });

    broadcastToTrip(tripId, {
      event: "vote_created",
      payload: newVote,
    });

    return c.json({
      success: true,
      data: newVote,
      message: "Poll created successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cast/:voteId - Cast/toggle vote
votesRouter.post("/cast/:voteId", async (c) => {
  const user = c.get("user");
  const voteId = c.req.param("voteId");
  const { optionText } = await c.req.json();

  if (!optionText) {
    return c.json({ success: false, error: "Option text is required." }, 400);
  }

  try {
    // Clear user's previous votes in this specific poll
    await VoteModel.updateMany(
      { _id: new mongoose.Types.ObjectId(voteId) },
      { $pull: { "options.$[].votes": new mongoose.Types.ObjectId(user.id) } }
    );

    // Register the new vote
    const updatedVote = await VoteModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(voteId), "options.text": optionText },
      { $addToSet: { "options.$.votes": new mongoose.Types.ObjectId(user.id) } },
      { new: true }
    );

    if (!updatedVote) {
      return c.json({ success: false, error: "Poll or option not found." }, 404);
    }

    broadcastToTrip(updatedVote.tripId.toString(), {
      event: "vote_updated",
      payload: updatedVote,
    });

    return c.json({
      success: true,
      data: updatedVote,
      message: "Vote cast successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /close/:voteId - Close poll
votesRouter.post("/close/:voteId", async (c) => {
  const user = c.get("user");
  const voteId = c.req.param("voteId");

  try {
    const vote = await VoteModel.findById(voteId);
    if (!vote) {
      return c.json({ success: false, error: "Poll not found." }, 404);
    }

    if (vote.creatorId.toString() !== user.id) {
      return c.json({ success: false, error: "Unauthorized. Only creator can close poll." }, 403);
    }

    vote.status = "closed";
    await vote.save();

    broadcastToTrip(vote.tripId.toString(), {
      event: "vote_closed",
      payload: vote,
    });

    return c.json({
      success: true,
      data: vote,
      message: "Poll closed successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default votesRouter;
