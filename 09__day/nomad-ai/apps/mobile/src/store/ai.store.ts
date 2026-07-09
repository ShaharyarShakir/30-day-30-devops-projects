import { create } from "zustand";
import { AIEngine } from "../ai/engine/AIEngine";
import { ProviderId, ProviderInfo } from "../ai/types";

interface AIState {
  isInitialized: boolean;
  activeProvider: ProviderId | null;
  loadedModelId: string | null;
  localAIEnabled: boolean;
  availableProviders: ProviderInfo[];
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  loadModel: (modelId: string) => Promise<boolean>;
  setLocalAIEnabled: (enabled: boolean) => Promise<void>;
  setPreferredProvider: (providerId: ProviderId) => Promise<boolean>;
  refreshState: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  isInitialized: false,
  activeProvider: null,
  loadedModelId: null,
  localAIEnabled: true,
  availableProviders: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const engine = AIEngine.getInstance();
      const state = await engine.initialize();
      const providers = await engine.getAvailableProviders();
      const enabled = engine.getIsLocalAIEnabled();
      
      set({
        isInitialized: state.isInitialized,
        activeProvider: state.activeProvider,
        loadedModelId: state.loadedModelId,
        localAIEnabled: enabled,
        availableProviders: providers,
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message || "Failed to initialize AI Engine" });
    }
  },

  loadModel: async (modelId: string) => {
    set({ isLoading: true, error: null });
    try {
      const success = await AIEngine.getInstance().loadModel(modelId);
      get().refreshState();
      return success;
    } catch (e: any) {
      set({ isLoading: false, error: e.message || `Failed to load model ${modelId}` });
      return false;
    }
  },

  setLocalAIEnabled: async (enabled: boolean) => {
    await AIEngine.getInstance().setLocalAIEnabled(enabled);
    get().refreshState();
  },

  setPreferredProvider: async (providerId: ProviderId) => {
    set({ isLoading: true, error: null });
    try {
      const success = await AIEngine.getInstance().setPreferredProvider(providerId);
      get().refreshState();
      return success;
    } catch (e: any) {
      set({ isLoading: false, error: e.message || `Failed to set provider ${providerId}` });
      return false;
    }
  },

  refreshState: () => {
    const engine = AIEngine.getInstance();
    const state = engine.getState();
    const enabled = engine.getIsLocalAIEnabled();
    set({
      isInitialized: state.isInitialized,
      activeProvider: state.activeProvider,
      loadedModelId: state.loadedModelId,
      localAIEnabled: enabled,
      isLoading: false,
    });
  },
}));
