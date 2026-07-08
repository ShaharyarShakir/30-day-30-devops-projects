import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { NotificationRepository } from "../repositories/notification.js";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let worker: Worker | null = null;

// Helper to simulate slow heavy computations (e.g. AI processing)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Initializes and starts the background worker.
 */
export function startWorker() {
  if (worker) return;

  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  worker = new Worker(
    "travelTasks",
    async (job: Job) => {
      const startTime = Date.now();
      console.log(
        JSON.stringify({
          level: "info",
          message: `[Worker] Starting job ${job.id} [${job.name}]`,
          timestamp: new Date().toISOString(),
        })
      );

      try {
        switch (job.name) {
          case "reminder_notification": {
            const { userId, title, body } = job.data;
            if (!userId || !title || !body) {
              throw new Error("Missing notification fields in payload.");
            }
            await NotificationRepository.create(userId, {
              title,
              body,
              type: "system",
            });
            break;
          }

          case "itinerary_generation": {
            // Simulate daily itinerary generation
            await sleep(2000);
            console.log(`[Worker] Itinerary generation complete for trip ${job.data.tripId}`);
            break;
          }

          case "ai_processing": {
            // Simulate AI heavy summarization or planning task
            await sleep(3000);
            console.log(`[Worker] AI processing task finished for chat ${job.data.chatId}`);
            break;
          }

          case "image_optimization": {
            // Simulate media compression
            await sleep(1500);
            console.log(`[Worker] Resized and compressed image ${job.data.imageUrl}`);
            break;
          }

          case "cleanup_job": {
            console.log("[Worker] Cleanup job executed successfully.");
            break;
          }

          default:
            console.warn(`[Worker] Unhandled task name: ${job.name}`);
        }

        const duration = Date.now() - startTime;
        console.log(
          JSON.stringify({
            level: "info",
            message: `[Worker] Finished job ${job.id} [${job.name}]`,
            duration_ms: duration,
            success: true,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(
          JSON.stringify({
            level: "error",
            message: `[Worker] Job ${job.id} failed: ${error.message}`,
            duration_ms: duration,
            success: false,
            timestamp: new Date().toISOString(),
          })
        );
        throw error;
      }
    },
    { connection: connection as any }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed persistently:`, err);
  });

  console.log("[Worker] Background task worker started successfully.");
}

/**
 * Gracefully shuts down the background worker.
 */
export async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    console.log("[Worker] Worker shutdown complete.");
  }
}
