import * as FileSystem from "expo-file-system/legacy";
import { DB, AIModelRecord } from "../../lib/db";
import { Downloader } from "../downloader/Downloader";
import { DownloadProgress } from "../types";
import { api } from "../../lib/api";
import { AIEngine } from "../engine/AIEngine";

export class ModelManager {
  private static instance: ModelManager | null = null;
  private downloader: Downloader;

  private constructor() {
    this.downloader = Downloader.getInstance();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async getInstalledModels(): Promise<AIModelRecord[]> {
    return await DB.getInstalledModels();
  }

  async checkInstalled(modelId: string): Promise<boolean> {
    const model = await DB.getModelById(modelId);
    if (!model) return false;
    
    // Check if the directory and files actually exist in filesystem
    const modelFile = `${model.path}/model.onnx`;
    const info = await FileSystem.getInfoAsync(modelFile);
    return info.exists;
  }

  async checkServerUpdates(): Promise<{ hasUpdate: boolean; serverModel?: any } | null> {
    try {
      const response = await api.get("/ai/models");
      const serverModels = response.data;
      if (!Array.isArray(serverModels) || serverModels.length === 0) return null;

      const serverModel = serverModels[0]; // Fetch first/default model
      const installed = await DB.getModelById(serverModel.id);

      if (!installed) {
        return { hasUpdate: true, serverModel };
      }

      // Semantic version check (simple string compare or major/minor compare)
      if (serverModel.version !== installed.version) {
        return { hasUpdate: true, serverModel };
      }

      return { hasUpdate: false, serverModel };
    } catch (e) {
      console.warn("[ModelManager] Failed to check updates from server:", e);
      return null;
    }
  }

  async downloadAndInstall(
    modelId: string,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    try {
      // 1. Fetch latest model manifest from server
      const manifestRes = await api.get("/ai/models");
      const models = manifestRes.data;
      const modelMeta = models.find((m: any) => m.id === modelId);
      
      if (!modelMeta) {
        throw new Error(`Model ${modelId} not found in server manifest`);
      }

      const tempFilename = `${modelId}-bundle.tmp`;
      
      // 2. Start download
      const bundleUri = await this.downloader.startDownload(
        modelId,
        modelMeta.downloadUrl,
        tempFilename,
        (p) => onProgress(p)
      );

      // 3. Verify checksum
      onProgress({
        modelId,
        progress: 100,
        bytesWritten: modelMeta.size,
        totalBytes: modelMeta.size,
        status: "verifying",
      });

      const isValid = await this.downloader.verifyChecksum(bundleUri, modelMeta.checksum);
      if (!isValid) {
        throw new Error("SHA-256 checksum verification failed. The bundle may be corrupted.");
      }

      // 4. Extract JSON Bundle
      onProgress({
        modelId,
        progress: 100,
        bytesWritten: modelMeta.size,
        totalBytes: modelMeta.size,
        status: "extracting",
      });

      const modelFolder = `${FileSystem.documentDirectory}models/${modelId}`;
      const bundleDataStr = await FileSystem.readAsStringAsync(bundleUri);
      const bundle = JSON.parse(bundleDataStr);
      
      if (!bundle.files) {
        throw new Error("Invalid bundle format. Missing files object.");
      }

      // Ensure model directory exists before writing files
      await FileSystem.makeDirectoryAsync(modelFolder, { intermediates: true });

      // Write individual files
      for (const [filename, content] of Object.entries(bundle.files)) {
        const filePath = `${modelFolder}/${filename}`;
        await FileSystem.writeAsStringAsync(filePath, content as string);
      }

      // Clean up the temporary bundle file
      await FileSystem.deleteAsync(bundleUri, { idempotent: true });

      // 5. Register in DB
      const record: AIModelRecord = {
        id: modelId,
        name: modelMeta.name,
        version: modelMeta.version,
        path: modelFolder,
        checksum: modelMeta.checksum,
        size: modelMeta.size,
        installedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      await DB.registerModel(record);
      
      // Load model in engine automatically
      await AIEngine.getInstance().loadModel(modelId);

      onProgress({
        modelId,
        progress: 100,
        bytesWritten: modelMeta.size,
        totalBytes: modelMeta.size,
        status: "completed",
      });

      return true;
    } catch (e: any) {
      console.error("[ModelManager] Install failed:", e);
      onProgress({
        modelId,
        progress: 0,
        bytesWritten: 0,
        totalBytes: 0,
        status: "failed",
        error: e.message,
      });
      return false;
    }
  }

  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const activeModelId = AIEngine.getInstance().getState().loadedModelId;
      if (activeModelId === modelId) {
        await AIEngine.getInstance().unload();
      }

      const model = await DB.getModelById(modelId);
      if (model) {
        // Delete directory from filesystem
        await FileSystem.deleteAsync(model.path, { idempotent: true });
        // Delete from database
        await DB.deleteModel(modelId);
      }
      return true;
    } catch (e) {
      console.error(`[ModelManager] Failed to delete model ${modelId}:`, e);
      return false;
    }
  }
}
