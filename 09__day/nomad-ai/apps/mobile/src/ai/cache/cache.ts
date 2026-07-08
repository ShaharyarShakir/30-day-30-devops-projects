import { DB } from "../../lib/db";

export class AICacheManager {
  static async getCachedResponse(
    prompt: string,
    modelId: string,
    providerId: string
  ): Promise<string | null> {
    const key = `res:${modelId}:${providerId}:${prompt.trim().toLowerCase()}`;
    return await DB.getCache(key);
  }

  static async setCachedResponse(
    prompt: string,
    modelId: string,
    providerId: string,
    response: string
  ): Promise<void> {
    const key = `res:${modelId}:${providerId}:${prompt.trim().toLowerCase()}`;
    await DB.setCache(key, "response", response);
  }

  static async getCachedEmbedding(text: string, modelId: string): Promise<number[] | null> {
    const key = `emb:${modelId}:${text.trim().toLowerCase()}`;
    const result = await DB.getCache(key);
    return result ? JSON.parse(result) : null;
  }

  static async setCachedEmbedding(text: string, modelId: string, vector: number[]): Promise<void> {
    const key = `emb:${modelId}:${text.trim().toLowerCase()}`;
    await DB.setCache(key, "embedding", JSON.stringify(vector));
  }

  static async clearAllCache(): Promise<void> {
    await DB.clearCache();
  }

  static async getCacheCount(): Promise<number> {
    return await DB.getCacheSize();
  }
}
