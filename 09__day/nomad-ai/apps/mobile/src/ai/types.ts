export interface AIModel {
  id: string;
  name: string;
  version: string;
  path: string;
  checksum: string;
  size: number;
  installedAt: string;
  lastUsed: string;
  description?: string;
}

export type ProviderId = "qnn" | "coreml" | "onnx" | "simulation";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  available: boolean;
}

export interface AIEngineState {
  isInitialized: boolean;
  activeProvider: ProviderId | null;
  loadedModelId: string | null;
}

export interface DownloadProgress {
  modelId: string;
  progress: number; // 0 to 100
  bytesWritten: number;
  totalBytes: number;
  status: "idle" | "downloading" | "paused" | "verifying" | "extracting" | "completed" | "failed";
  error?: string;
  etaSeconds?: number;
}
