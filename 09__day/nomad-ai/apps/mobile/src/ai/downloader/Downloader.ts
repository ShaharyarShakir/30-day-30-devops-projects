import * as FileSystem from "expo-file-system/legacy";
import { DownloadProgress } from "../types";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

type ProgressCallback = (progress: DownloadProgress) => void;

export class Downloader {
  private static instance: Downloader | null = null;
  private resumables = new Map<string, FileSystem.DownloadResumable>();
  private progressCallbacks = new Map<string, ProgressCallback>();
  private progressStates = new Map<string, DownloadProgress>();
  private wifiOnly = false;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): Downloader {
    if (!Downloader.instance) {
      Downloader.instance = new Downloader();
    }
    return Downloader.instance;
  }

  private async loadSettings() {
    try {
      const wifiStr = await SecureStore.getItemAsync("download_wifi_only");
      this.wifiOnly = wifiStr === "true";
    } catch (e) {
      console.warn("Failed to load downloader settings:", e);
    }
  }

  async setWifiOnly(wifiOnly: boolean): Promise<void> {
    this.wifiOnly = wifiOnly;
    await SecureStore.setItemAsync("download_wifi_only", wifiOnly ? "true" : "false");
  }

  getWifiOnly(): boolean {
    return this.wifiOnly;
  }

  getProgressState(modelId: string): DownloadProgress | undefined {
    return this.progressStates.get(modelId);
  }

  async startDownload(
    modelId: string,
    url: string,
    targetFilename: string,
    onProgress: ProgressCallback
  ): Promise<string> {
    const targetPath = `${FileSystem.documentDirectory}models/${modelId}/${targetFilename}`;
    
    // Ensure parent directories exist
    const dirPath = `${FileSystem.documentDirectory}models/${modelId}`;
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }

    this.progressCallbacks.set(modelId, onProgress);
    
    const progressState: DownloadProgress = {
      modelId,
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      status: "downloading",
    };
    this.progressStates.set(modelId, progressState);

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const bytesWritten = downloadProgress.totalBytesWritten;
      const totalBytes = downloadProgress.totalBytesExpectedToWrite;
      const progress = Math.min(
        100,
        Math.max(0, Math.round((bytesWritten / totalBytes) * 100))
      );
      
      const previousState = this.progressStates.get(modelId);
      const now = Date.now();
      const startTime = (previousState as any)?.startTime || now;

      // Calculate simple ETA
      let etaSeconds = undefined;
      if (bytesWritten > 0 && totalBytes > 0) {
        const elapsedMs = now - startTime;
        const speedBytesPerMs = bytesWritten / elapsedMs;
        const remainingBytes = totalBytes - bytesWritten;
        etaSeconds = Math.round(remainingBytes / speedBytesPerMs / 1000);
      }

      const updatedState: DownloadProgress = {
        modelId,
        progress,
        bytesWritten,
        totalBytes,
        status: "downloading",
        etaSeconds,
      };
      (updatedState as any).startTime = startTime;
      
      this.progressStates.set(modelId, updatedState);
      onProgress(updatedState);
    };

    const resumable = FileSystem.createDownloadResumable(
      url,
      targetPath,
      { md5: true },
      callback
    );

    this.resumables.set(modelId, resumable);
    (progressState as any).startTime = Date.now();

    try {
      const result = await resumable.downloadAsync();
      if (!result) throw new Error("Download returned null result");
      
      // Update state to verifying
      const finalState = this.progressStates.get(modelId) || progressState;
      finalState.status = "verifying";
      this.progressStates.set(modelId, finalState);
      onProgress(finalState);

      return result.uri;
    } catch (error: any) {
      const failedState = this.progressStates.get(modelId) || progressState;
      failedState.status = "failed";
      failedState.error = error.message;
      this.progressStates.set(modelId, failedState);
      onProgress(failedState);
      throw error;
    }
  }

  async pauseDownload(modelId: string): Promise<void> {
    const resumable = this.resumables.get(modelId);
    if (resumable) {
      try {
        const pausedResult = await resumable.pauseAsync();
        // Save resumable state for later resume
        await SecureStore.setItemAsync(`resumable_state_${modelId}`, JSON.stringify(pausedResult));
        
        const state = this.progressStates.get(modelId);
        if (state) {
          state.status = "paused";
          this.progressStates.set(modelId, state);
          const callback = this.progressCallbacks.get(modelId);
          if (callback) callback(state);
        }
      } catch (e) {
        console.error(`[Downloader] Pause failed for ${modelId}:`, e);
      }
    }
  }

  async resumeDownload(modelId: string, onProgress: ProgressCallback): Promise<string> {
    const stateStr = await SecureStore.getItemAsync(`resumable_state_${modelId}`);
    if (!stateStr) {
      throw new Error(`No paused download state found for model ${modelId}`);
    }

    this.progressCallbacks.set(modelId, onProgress);
    const savedState = JSON.parse(stateStr);
    
    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const bytesWritten = downloadProgress.totalBytesWritten;
      const totalBytes = downloadProgress.totalBytesExpectedToWrite;
      const progress = Math.min(
        100,
        Math.max(0, Math.round((bytesWritten / totalBytes) * 100))
      );
      
      const previousState = this.progressStates.get(modelId);
      const now = Date.now();
      const startTime = (previousState as any)?.startTime || now;
      let etaSeconds = undefined;
      if (bytesWritten > 0 && totalBytes > 0) {
        const elapsedMs = now - startTime;
        const speedBytesPerMs = bytesWritten / elapsedMs;
        const remainingBytes = totalBytes - bytesWritten;
        etaSeconds = Math.round(remainingBytes / speedBytesPerMs / 1000);
      }

      const updatedState: DownloadProgress = {
        modelId,
        progress,
        bytesWritten,
        totalBytes,
        status: "downloading",
        etaSeconds,
      };
      (updatedState as any).startTime = startTime;
      
      this.progressStates.set(modelId, updatedState);
      onProgress(updatedState);
    };

    const resumable = new FileSystem.DownloadResumable(
      savedState.url,
      savedState.fileUri,
      savedState.options,
      callback,
      savedState.resumeData
    );

    this.resumables.set(modelId, resumable);
    
    // Set status to downloading
    const state = this.progressStates.get(modelId) || {
      modelId,
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      status: "downloading",
    };
    state.status = "downloading";
    (state as any).startTime = Date.now();
    this.progressStates.set(modelId, state);
    onProgress(state);

    try {
      const result = await resumable.downloadAsync();
      if (!result) throw new Error("Resume download returned null");
      
      await SecureStore.deleteItemAsync(`resumable_state_${modelId}`);
      
      const finalState = this.progressStates.get(modelId) || state;
      finalState.status = "verifying";
      this.progressStates.set(modelId, finalState);
      onProgress(finalState);

      return result.uri;
    } catch (error: any) {
      const failedState = this.progressStates.get(modelId) || state;
      failedState.status = "failed";
      failedState.error = error.message;
      this.progressStates.set(modelId, failedState);
      onProgress(failedState);
      throw error;
    }
  }

  async cancelDownload(modelId: string): Promise<void> {
    const resumable = this.resumables.get(modelId);
    if (resumable) {
      try {
        await resumable.pauseAsync(); // Pause it first to cancel progress
      } catch (e) {
        // Can fail if completed
      }
    }
    
    this.resumables.delete(modelId);
    this.progressCallbacks.delete(modelId);
    await SecureStore.deleteItemAsync(`resumable_state_${modelId}`);

    const dirPath = `${FileSystem.documentDirectory}models/${modelId}`;
    const info = await FileSystem.getInfoAsync(dirPath);
    if (info.exists) {
      await FileSystem.deleteAsync(dirPath, { idempotent: true });
    }

    const state = this.progressStates.get(modelId);
    if (state) {
      state.status = "idle";
      state.progress = 0;
      state.bytesWritten = 0;
      this.progressStates.set(modelId, state);
    }
  }

  async verifyChecksum(fileUri: string, expectedChecksum: string): Promise<boolean> {
    try {
      if (expectedChecksum === "default-checksum") return true;

      const data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );

      console.log(`[Checksum] Expected: ${expectedChecksum}`);
      console.log(`[Checksum] Computed: ${computedHash}`);

      return computedHash === expectedChecksum;
    } catch (e) {
      console.error("[Checksum] Verification error:", e);
      return false;
    }
  }
}


