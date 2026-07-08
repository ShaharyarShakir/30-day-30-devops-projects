import { Hono } from "hono";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const uploadsRouter = new Hono<{ Variables: AuthContextVariables }>();

// All upload actions are protected
uploadsRouter.use("*", authMiddleware);

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure upload directory exists
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}
ensureUploadsDir();

// POST / - File upload endpoint
uploadsRouter.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File | undefined;

    if (!file) {
      throw new Error("No file provided in field 'file'.");
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Validate file size (e.g. max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error("File size exceeds 10MB limit.");
    }

    // Generate safe unique filename
    const originalExt = path.extname(file.name) || ".jpg";
    const uniqueName = `${crypto.randomUUID()}${originalExt}`;
    const destinationPath = path.join(UPLOADS_DIR, uniqueName);

    // Save to disk
    await fs.writeFile(destinationPath, fileBuffer);

    // Expose URL
    const fileUrl = `/uploads/${uniqueName}`;

    return c.json({
      success: true,
      data: {
        url: fileUrl,
        filename: uniqueName,
        originalName: file.name,
        size: fileBuffer.length,
      },
      message: "File uploaded successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: error.message,
        },
      },
      400
    );
  }
});

export default uploadsRouter;
