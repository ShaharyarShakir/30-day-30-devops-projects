import { Queue } from "bullmq";
import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create shared Redis connection for BullMQ producer
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const travelQueue = new Queue("travelTasks", {
  connection: redisConnection as any,
});

/**
 * Enqueue a background task.
 */
export async function enqueueTask(
  taskName: "reminder_notification" | "itinerary_generation" | "ai_processing" | "image_optimization" | "cleanup_job",
  data: any
) {
  try {
    const job = await travelQueue.add(taskName, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
    console.log(`[Queue] Successfully enqueued job ${job.id} for task: ${taskName}`);
    return job;
  } catch (error) {
    console.error(`[Queue] Failed to enqueue task ${taskName}:`, error);
    throw error;
  }
}
