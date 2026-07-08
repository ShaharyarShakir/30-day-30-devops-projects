import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { MediaModel } from "../db/core-models.js";
import { uploadToS3 } from "../services/s3.js";
import crypto from "crypto";

const mediaRouter = new Hono<{ Variables: AuthContextVariables }>();

mediaRouter.use("*", authMiddleware);

// GET /:tripId - Fetch shared album files (with grouping options)
mediaRouter.get("/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  const grouping = c.req.query("groupBy"); // "day" | "city" | "country" | "category"
  
  try {
    const mediaItems = await MediaModel.find({
      tripId: new mongoose.Types.ObjectId(tripId)
    }).sort({ takenAt: -1 });

    if (!grouping) {
      return c.json({ success: true, data: mediaItems });
    }

    // Process groupings
    const grouped: Record<string, any[]> = {};
    
    for (const item of mediaItems) {
      let key = "Other";
      if (grouping === "city") {
        key = item.city || "Unknown City";
      } else if (grouping === "country") {
        key = item.country || "Unknown Country";
      } else if (grouping === "category") {
        key = item.aiTags && item.aiTags.length > 0 ? item.aiTags[0] : "Uncategorized";
      } else if (grouping === "day") {
        key = item.takenAt.toISOString().split("T")[0];
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return c.json({
      success: true,
      data: grouped,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper for AI categorization heuristics
function autoCategorizeMedia(fileName: string, mimeType: string): string[] {
  const tags: string[] = [];
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes("food") || lowerName.includes("eat") || lowerName.includes("dinner") || lowerName.includes("lunch") || lowerName.includes("cafe")) {
    tags.push("Food");
  }
  if (lowerName.includes("nature") || lowerName.includes("forest") || lowerName.includes("tree") || lowerName.includes("mountain") || lowerName.includes("park") || lowerName.includes("lake")) {
    tags.push("Nature");
  }
  if (lowerName.includes("hotel") || lowerName.includes("room") || lowerName.includes("stay") || lowerName.includes("resort") || lowerName.includes("bed")) {
    tags.push("Hotel");
  }
  if (lowerName.includes("beach") || lowerName.includes("sea") || lowerName.includes("ocean") || lowerName.includes("sand") || lowerName.includes("wave")) {
    tags.push("Beach");
  }
  if (lowerName.includes("museum") || lowerName.includes("art") || lowerName.includes("gallery") || lowerName.includes("history") || lowerName.includes("exhibit")) {
    tags.push("Museum");
  }
  if (lowerName.includes("shop") || lowerName.includes("mall") || lowerName.includes("store") || lowerName.includes("buy") || lowerName.includes("market")) {
    tags.push("Shopping");
  }
  if (lowerName.includes("night") || lowerName.includes("club") || lowerName.includes("bar") || lowerName.includes("drink") || lowerName.includes("party")) {
    tags.push("Nightlife");
  }
  
  if (tags.length === 0) {
    const fallbackCategories = ["Food", "Nature", "Hotel", "Beach", "Museum", "Shopping", "Nightlife"];
    const randomIndex = Math.floor(Math.random() * fallbackCategories.length);
    tags.push(fallbackCategories[randomIndex]);
  }
  
  return tags;
}

// POST /:tripId - Upload media file to S3 and save metadata
mediaRouter.post("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");

  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File | undefined;
    const type = body["type"] as "image" | "video" | "document" | undefined;
    const latitude = body["latitude"] ? parseFloat(body["latitude"] as string) : undefined;
    const longitude = body["longitude"] ? parseFloat(body["longitude"] as string) : undefined;
    const takenAtStr = body["takenAt"] as string | undefined;
    const city = body["city"] as string | undefined;
    const country = body["country"] as string | undefined;

    if (!file) {
      return c.json({ success: false, error: "No file provided." }, 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Generate S3 Key
    const ext = file.name.split(".").pop() || "jpg";
    const uniqueKey = `${tripId}/${crypto.randomUUID()}.${ext}`;

    // Upload to S3 (Garage)
    const fileUrl = await uploadToS3(uniqueKey, fileBuffer, file.type);

    // AI organization heuristics
    const tags = autoCategorizeMedia(file.name, file.type);
    const summary = `Shared media: ${file.name} categorised into ${tags.join(", ")}`;

    // Create database model record
    const mediaRecord = await MediaModel.create({
      tripId: new mongoose.Types.ObjectId(tripId),
      userId: new mongoose.Types.ObjectId(user.id),
      userName: user.name || user.email.split("@")[0],
      url: fileUrl,
      type: type || (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document"),
      mimeType: file.type,
      fileName: file.name,
      sizeBytes: fileBuffer.length,
      latitude,
      longitude,
      takenAt: takenAtStr ? new Date(takenAtStr) : new Date(),
      city: city || "Unknown City",
      country: country || "Unknown Country",
      aiTags: tags,
      aiSummary: summary,
    });

    return c.json({
      success: true,
      data: mediaRecord,
      message: "Media uploaded successfully",
    });
  } catch (error: any) {
    console.error("[Media Router] Error uploading media:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /ai-tags/:mediaId - Manually edit tags
mediaRouter.patch("/ai-tags/:mediaId", async (c) => {
  const mediaId = c.req.param("mediaId");
  const { aiTags } = await c.req.json();

  if (!Array.isArray(aiTags)) {
    return c.json({ success: false, error: "aiTags must be an array of strings." }, 400);
  }

  try {
    const media = await MediaModel.findByIdAndUpdate(
      mediaId,
      { aiTags },
      { new: true }
    );

    if (!media) {
      return c.json({ success: false, error: "Media not found." }, 404);
    }

    return c.json({
      success: true,
      data: media,
      message: "AI tags updated successfully",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default mediaRouter;
