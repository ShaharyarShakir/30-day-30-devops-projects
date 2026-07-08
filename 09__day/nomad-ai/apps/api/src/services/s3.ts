import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
const endpoint = process.env.S3_ENDPOINT || "http://localhost:3900";
const region = process.env.S3_REGION || "garage";
export const BUCKET_NAME = process.env.S3_BUCKET || "nomad-media";

// Initialize S3 Client
export const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Required for local compatibility
});

/**
 * Uploads a file to S3 compatible object storage (Garage)
 */
export async function uploadToS3(
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Return S3 URL
    const fileUrl = `${endpoint}/${BUCKET_NAME}/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error("[S3 Service] Upload failed:", error);
    throw new Error(`S3 upload failed: ${(error as Error).message}`);
  }
}

/**
 * Deletes a file from S3 compatible object storage
 */
export async function deleteFromS3(fileName: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("[S3 Service] Delete failed:", error);
    throw new Error(`S3 deletion failed: ${(error as Error).message}`);
  }
}
