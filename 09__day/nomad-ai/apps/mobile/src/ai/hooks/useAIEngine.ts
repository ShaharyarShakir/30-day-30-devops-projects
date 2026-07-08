import { useEffect } from "react";
import { useAIStore } from "../../store/ai.store";
import { AIEngine } from "../engine/AIEngine";
import { ProviderId } from "../types";

export function useAIEngine() {
  const store = useAIStore();
  
  useEffect(() => {
    if (!store.isInitialized && !store.isLoading) {
      store.initialize();
    }
  }, []);

  const generate = async (prompt: string, options?: any) => {
    return await AIEngine.getInstance().generate(prompt, options);
  };

  const embeddings = async (text: string) => {
    return await AIEngine.getInstance().embeddings(text);
  };

  const tokenize = async (text: string) => {
    return await AIEngine.getInstance().tokenize(text);
  };

  return {
    isInitialized: store.isInitialized,
    activeProvider: store.activeProvider,
    loadedModelId: store.loadedModelId,
    localAIEnabled: store.localAIEnabled,
    availableProviders: store.availableProviders,
    isLoading: store.isLoading,
    error: store.error,
    
    initialize: store.initialize,
    loadModel: store.loadModel,
    setLocalAIEnabled: store.setLocalAIEnabled,
    setPreferredProvider: store.setPreferredProvider,
    refreshState: store.refreshState,
    
    generate,
    embeddings,
    tokenize,
  };
}
