import { upgradeWebSocket } from "@hono/node-server";
import { Hono } from "hono";
import { Redis } from "ioredis";
import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";

import { verifyAccessToken } from "../auth/session.js";
import { MessageModel, LiveLocationModel, VoteModel } from "../db/core-models.js";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_CHANNEL = "nomad-ai:collaboration";

// Redis Clients
const pubClient = new Redis(REDIS_URL);
const subClient = new Redis(REDIS_URL);

// Local memory mapping: tripId -> Set of local websocket connections
const tripSockets = new Map<string, Set<any>>();

export const websocketRouter = new Hono();

// Subscribe to global Redis Pub/Sub channel
subClient.subscribe(REDIS_CHANNEL, (err) => {
  if (err) {
    console.error("[WS] Redis Sub subscription failed:", err);
  } else {
    console.log(`[WS] Subscribed to Redis channel: ${REDIS_CHANNEL}`);
  }
});

// Listen for updates from Redis Pub/Sub (broadcasted by other node instances)
subClient.on("message", (channel, messageStr) => {
  if (channel === REDIS_CHANNEL) {
    try {
      const { tripId, senderSocketId, data } = JSON.parse(messageStr);
      const sockets = tripSockets.get(tripId);
      
      if (sockets) {
        const payloadStr = JSON.stringify(data);
        for (const ws of sockets) {
          // Skip the socket that originally published the event to avoid duplicate echoes
          if (ws.id !== senderSocketId) {
            try {
              ws.send(payloadStr);
            } catch (err) {
              console.error(`[WS] Failed to relay message to local socket in trip ${tripId}:`, err);
            }
          }
        }
      }
    } catch (e) {
      console.error("[WS] Error parsing Redis Pub/Sub broadcast:", e);
    }
  }
});

websocketRouter.get(
  "/:tripId",
  upgradeWebSocket((c) => {
    const tripId = c.req.param("tripId");
    const token = c.req.query("token");
    
    if (!tripId) {
      throw new Error("tripId is required");
    }

    // Authenticate client
    let userPayload: any = null;
    if (token) {
      userPayload = verifyAccessToken(token);
    }

    return {
      onOpen(event, ws) {
        // Assign a unique connection ID and attach user info
        ws.id = crypto.randomUUID();
        ws.user = userPayload;
        
        console.log(`[WS] Connection opened for trip: ${tripId} (User: ${userPayload?.email || "Anonymous"}, ConnID: ${ws.id})`);
        
        if (!tripSockets.has(tripId)) {
          tripSockets.set(tripId, new Set());
        }
        tripSockets.get(tripId)!.add(ws);
      },

      async onMessage(event, ws) {
        try {
          const rawData = JSON.parse(event.data.toString());
          const { event: clientEvent, payload } = rawData;

          if (!clientEvent) return;

          console.log(`[WS] Event received: ${clientEvent} in trip ${tripId}`);

          switch (clientEvent) {
            case "SEND_MESSAGE": {
              if (!ws.user) {
                ws.send(JSON.stringify({ event: "ERROR", payload: { message: "Unauthorized. Authentication required." } }));
                return;
              }

              const { content, type, repliedTo, mediaUrl, metadata } = payload;
              
              // Save message to database
              const newMessage = await MessageModel.create({
                tripId: new mongoose.Types.ObjectId(tripId),
                senderId: new mongoose.Types.ObjectId(ws.user.id),
                senderName: ws.user.name || ws.user.email.split("@")[0],
                senderImage: ws.user.image,
                content,
                type: type || "text",
                mediaUrl,
                metadata,
                repliedTo: repliedTo ? new mongoose.Types.ObjectId(repliedTo) : undefined,
                reactions: [],
                readBy: [{ userId: new mongoose.Types.ObjectId(ws.user.id), readAt: new Date() }],
              });

              const messageData = await MessageModel.findById(newMessage._id).populate("senderId", "name email image");

              // Broadcast globally
              publishToRedis(tripId, ws.id, {
                event: "message_received",
                payload: messageData,
              });
              break;
            }

            case "TYPING_INDICATOR": {
              if (!ws.user) return;
              const { isTyping } = payload;
              
              publishToRedis(tripId, ws.id, {
                event: "typing_status",
                payload: {
                  userId: ws.user.id,
                  userName: ws.user.name || ws.user.email.split("@")[0],
                  isTyping,
                },
              });
              break;
            }

            case "ADD_REACTION": {
              if (!ws.user) return;
              const { messageId, emoji } = payload;
              
              const updatedMessage = await MessageModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(messageId) },
                { 
                  $pull: { reactions: { userId: new mongoose.Types.ObjectId(ws.user.id) } } 
                },
                { new: true }
              );

              const messageWithNewReaction = await MessageModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(messageId) },
                { 
                  $push: { reactions: { userId: new mongoose.Types.ObjectId(ws.user.id), emoji } } 
                },
                { new: true }
              );

              if (messageWithNewReaction) {
                publishToRedis(tripId, null, {
                  event: "reaction_updated",
                  payload: {
                    messageId,
                    reactions: messageWithNewReaction.reactions,
                  },
                });
              }
              break;
            }

            case "MARK_READ": {
              if (!ws.user) return;
              const { messageIds } = payload;
              if (!Array.isArray(messageIds) || messageIds.length === 0) return;

              const objectIds = messageIds.map(id => new mongoose.Types.ObjectId(id));
              
              await MessageModel.updateMany(
                { 
                  _id: { $in: objectIds }, 
                  "readBy.userId": { $ne: new mongoose.Types.ObjectId(ws.user.id) } 
                },
                { 
                  $push: { readBy: { userId: new mongoose.Types.ObjectId(ws.user.id), readAt: new Date() } } 
                }
              );

              publishToRedis(tripId, ws.id, {
                event: "messages_read",
                payload: {
                  userId: ws.user.id,
                  messageIds,
                },
              });
              break;
            }

            case "SHARE_LOCATION": {
              if (!ws.user) return;
              const { latitude, longitude, durationMinutes } = payload;
              
              const expiresAt = new Date();
              expiresAt.setMinutes(expiresAt.getMinutes() + (durationMinutes || 60));

              const locationRecord = await LiveLocationModel.findOneAndUpdate(
                { userId: new mongoose.Types.ObjectId(ws.user.id), tripId: new mongoose.Types.ObjectId(tripId) },
                { latitude, longitude, expiresAt, isActive: true },
                { upsert: true, new: true }
              );

              publishToRedis(tripId, ws.id, {
                event: "location_updated",
                payload: {
                  userId: ws.user.id,
                  userName: ws.user.name || ws.user.email.split("@")[0],
                  latitude,
                  longitude,
                  expiresAt: expiresAt.toISOString(),
                },
              });
              break;
            }

            case "CAST_VOTE": {
              if (!ws.user) return;
              const { voteId, optionText } = payload;

              // Clear user's previous votes in this specific poll
              await VoteModel.updateMany(
                { _id: new mongoose.Types.ObjectId(voteId) },
                { $pull: { "options.$[].votes": new mongoose.Types.ObjectId(ws.user.id) } }
              );

              // Register the new vote
              const updatedVote = await VoteModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(voteId), "options.text": optionText },
                { $addToSet: { "options.$.votes": new mongoose.Types.ObjectId(ws.user.id) } },
                { new: true }
              );

              if (updatedVote) {
                publishToRedis(tripId, null, {
                  event: "vote_updated",
                  payload: updatedVote,
                });
              }
              break;
            }

            default:
              console.warn(`[WS] Unhandled client event: ${clientEvent}`);
          }
        } catch (err) {
          console.error("[WS] Error handling socket message:", err);
        }
      },

      onClose(event, ws) {
        console.log(`[WS] Connection closed for trip: ${tripId} (ConnID: ${ws.id})`);
        const sockets = tripSockets.get(tripId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            tripSockets.delete(tripId);
          }
        }
      },

      onError(event, ws) {
        console.error(`[WS] Error on trip ${tripId} (ConnID: ${ws.id}):`, event);
      },
    };
  })
);

/**
 * Publishes events to the global Redis channel for inter-process broadcasting.
 */
function publishToRedis(tripId: string, senderSocketId: string | null, data: { event: string; payload: any }) {
  const payload = {
    tripId,
    senderSocketId,
    data,
  };
  pubClient.publish(REDIS_CHANNEL, JSON.stringify(payload)).catch((err) => {
    console.error("[WS] Redis Pub publish failed:", err);
  });
}

/**
 * Broadcasts a real-time event directly to all clients connected locally to a specific trip.
 */
export function broadcastToTrip(tripId: string, message: { event: string; payload: any }) {
  // Push to Redis so that all server nodes broadcast it
  publishToRedis(tripId, null, message);
}
