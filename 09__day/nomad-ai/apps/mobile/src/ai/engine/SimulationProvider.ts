import { AIProvider } from "./AIProvider";
import { ProviderId } from "../types";
import * as FileSystem from "expo-file-system/legacy";
import { simulateLocalInference, simulateLocalEmbeddings } from "./QNNProvider";

export class SimulationProvider extends AIProvider {
  readonly id: ProviderId = "simulation";
  readonly name = "Local JavaScript AI Simulator";
  private isLoaded = false;
  private modelPath = "";

  async isAvailable(): Promise<boolean> {
    // Pure JS fallback, always available
    return true;
  }

  async loadModel(modelPath: string): Promise<boolean> {
    this.modelPath = modelPath;
    try {
      const modelFile = `${modelPath}/model.onnx`;
      const configFile = `${modelPath}/config.json`;
      
      const modelInfo = await FileSystem.getInfoAsync(modelFile);
      const configInfo = await FileSystem.getInfoAsync(configFile);
      
      if (!modelInfo.exists || !configInfo.exists) {
        throw new Error("Missing model files for simulation");
      }
      
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("[SimulationProvider] Failed to load model:", e);
      return false;
    }
  }

  async generate(prompt: string, options?: any): Promise<string> {
    if (!this.isLoaded) throw new Error("Simulation Model is not loaded");
    
    // Simulate slight processing latency (200-800ms) to mimic local model calculations
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
    
    return `[Local Offline Model] ${simulateLocalInference(prompt)}`;
  }

  async embeddings(text: string): Promise<number[]> {
    if (!this.isLoaded) throw new Error("Simulation Model is not loaded");
    return simulateLocalEmbeddings(text);
  }

  async tokenize(text: string): Promise<string[]> {
    if (!this.isLoaded) throw new Error("Simulation Model is not loaded");
    return text.split(/\s+/);
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
    this.modelPath = "";
  }
}
