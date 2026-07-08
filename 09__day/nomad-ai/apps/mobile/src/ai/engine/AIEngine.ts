import { QNNProvider } from "./QNNProvider";
import { CoreMLProvider } from "./CoreMLProvider";
import { ONNXProvider } from "./ONNXProvider";
import { SimulationProvider } from "./SimulationProvider";
import { AIProvider } from "./AIProvider";
import { ProviderId, AIEngineState } from "../types";
import { DB } from "../../lib/db";
import * as SecureStore from "expo-secure-store";

export class AIEngine {
  private static instance: AIEngine | null = null;
  
  private providers: AIProvider[] = [];
  private activeProvider: AIProvider | null = null;
  private loadedModelId: string | null = null;
  private initialized = false;
  private isLocalEnabled = true;

  private constructor() {
    this.providers = [
      new QNNProvider(),
      new CoreMLProvider(),
      new ONNXProvider(),
      new SimulationProvider(),
    ];
  }

  static getInstance(): AIEngine {
    if (!AIEngine.instance) {
      AIEngine.instance = new AIEngine();
    }
    return AIEngine.instance;
  }

  async initialize(): Promise<AIEngineState> {
    if (this.initialized) {
      return this.getState();
    }

    // 1. Read settings from SecureStore/Zustand equivalents
    try {
      const enabledStr = await SecureStore.getItemAsync("local_ai_enabled");
      this.isLocalEnabled = enabledStr === null ? true : enabledStr === "true";
      
      const preferredProvider = await SecureStore.getItemAsync("preferred_ai_provider") as ProviderId | null;
      
      if (preferredProvider) {
        const found = this.providers.find((p) => p.id === preferredProvider);
        if (found && (await found.isAvailable())) {
          this.activeProvider = found;
        }
      }
    } catch (e) {
      console.warn("Failed to load AI settings:", e);
    }

    // 2. Fallback to auto-select if no provider was selected or available
    if (!this.activeProvider) {
      for (const provider of this.providers) {
        if (await provider.isAvailable()) {
          this.activeProvider = provider;
          break;
        }
      }
    }

    this.initialized = true;
    console.log(`[AIEngine] Initialized with provider: ${this.activeProvider?.name}`);
    return this.getState();
  }

  async getAvailableProviders(): Promise<{ id: ProviderId; name: string; available: boolean }[]> {
    const list: { id: ProviderId; name: string; available: boolean }[] = [];
    for (const p of this.providers) {
      const available = await p.isAvailable();
      list.push({ id: p.id, name: p.name, available });
    }
    return list;
  }

  async setPreferredProvider(providerId: ProviderId): Promise<boolean> {
    const provider = this.providers.find((p) => p.id === providerId);
    if (!provider || !(await provider.isAvailable())) {
      return false;
    }
    
    const wasLoaded = !!this.loadedModelId;
    const currentModelId = this.loadedModelId;
    const modelRecord = currentModelId ? await DB.getModelById(currentModelId) : null;
    
    if (wasLoaded && modelRecord) {
      await this.unload();
    }

    this.activeProvider = provider;
    await SecureStore.setItemAsync("preferred_ai_provider", providerId);

    if (wasLoaded && modelRecord) {
      await this.loadModel(modelRecord.id);
    }

    return true;
  }

  async setLocalAIEnabled(enabled: boolean): Promise<void> {
    this.isLocalEnabled = enabled;
    await SecureStore.setItemAsync("local_ai_enabled", enabled ? "true" : "false");
  }

  getIsLocalAIEnabled(): boolean {
    return this.isLocalEnabled;
  }

  async loadModel(modelId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    if (!this.activeProvider) throw new Error("No AI Provider is initialized");

    const modelRecord = await DB.getModelById(modelId);
    if (!modelRecord) {
      console.warn(`[AIEngine] Model not registered in DB: ${modelId}`);
      return false;
    }

    // Load in provider
    const success = await this.activeProvider.loadModel(modelRecord.path);
    if (success) {
      this.loadedModelId = modelId;
      await DB.updateModelLastUsed(modelId);
      console.log(`[AIEngine] Model ${modelId} loaded successfully in ${this.activeProvider.name}`);
    }
    return success;
  }

  async generate(prompt: string, options?: { useCache?: boolean; cacheType?: string }): Promise<string> {
    if (!this.isLocalEnabled) {
      return "Local AI is currently disabled in Settings.";
    }
    if (!this.activeProvider || !this.loadedModelId) {
      throw new Error("No model loaded in AIEngine. Please install and load a model.");
    }

    const useCache = options?.useCache ?? true;
    const cacheType = options?.cacheType ?? "response";
    
    // Create cache key: composite of model ID, active provider, and prompt
    const cacheKey = `${this.loadedModelId}:${this.activeProvider.id}:${prompt.trim().toLowerCase()}`;

    if (useCache) {
      const cached = await DB.getCache(cacheKey);
      if (cached) {
        console.log("[AIEngine] Cache hit for response!");
        return cached;
      }
    }

    // Call active provider
    const result = await this.activeProvider.generate(prompt, options);

    if (useCache) {
      await DB.setCache(cacheKey, cacheType, result);
    }

    return result;
  }

  async embeddings(text: string, options?: { useCache?: boolean }): Promise<number[]> {
    if (!this.activeProvider || !this.loadedModelId) {
      throw new Error("No model loaded in AIEngine.");
    }

    const useCache = options?.useCache ?? true;
    const cacheKey = `emb:${this.loadedModelId}:${text.trim().toLowerCase()}`;

    if (useCache) {
      const cached = await DB.getCache(cacheKey);
      if (cached) {
        console.log("[AIEngine] Cache hit for embeddings!");
        return JSON.parse(cached);
      }
    }

    const vector = await this.activeProvider.embeddings(text);

    if (useCache) {
      await DB.setCache(cacheKey, "embedding", JSON.stringify(vector));
    }

    return vector;
  }

  async tokenize(text: string): Promise<string[]> {
    if (!this.activeProvider || !this.loadedModelId) {
      throw new Error("No model loaded in AIEngine.");
    }
    return await this.activeProvider.tokenize(text);
  }

  async unload(): Promise<void> {
    if (this.activeProvider) {
      await this.activeProvider.unload();
    }
    this.loadedModelId = null;
    console.log("[AIEngine] Model unloaded");
  }

  getState(): AIEngineState {
    return {
      isInitialized: this.initialized && this.isLocalEnabled,
      activeProvider: this.activeProvider?.id || null,
      loadedModelId: this.loadedModelId,
    };
  }
}
