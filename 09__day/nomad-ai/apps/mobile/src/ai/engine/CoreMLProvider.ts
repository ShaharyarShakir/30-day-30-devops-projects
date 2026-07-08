import { Platform, NativeModules } from "react-native";
import { AIProvider } from "./AIProvider";
import { ProviderId } from "../types";
import * as FileSystem from "expo-file-system/legacy";
import { simulateLocalInference, simulateLocalEmbeddings } from "./QNNProvider";

export class CoreMLProvider extends AIProvider {
  readonly id: ProviderId = "coreml";
  readonly name = "Apple Core ML Runtime";
  private isLoaded = false;
  private modelPath = "";

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    // Check if the native CoreML module is linked in the native application
    return !!NativeModules.AppleCoreMLEngine || false;
  }

  async loadModel(modelPath: string): Promise<boolean> {
    this.modelPath = modelPath;
    try {
      // In a real iOS application, we compile and load the .mlmodel / .mlmodelc:
      // await NativeModules.AppleCoreMLEngine.load(modelPath);
      
      const modelFile = `${modelPath}/model.onnx`;
      const info = await FileSystem.getInfoAsync(modelFile);
      if (!info.exists) {
        throw new Error(`Model weights missing at ${modelFile}`);
      }
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("[CoreMLProvider] Failed to load model:", e);
      return false;
    }
  }

  async generate(prompt: string, options?: any): Promise<string> {
    if (!this.isLoaded) throw new Error("Core ML Model is not loaded");
    
    // In a real iOS native app, we invoke native inference:
    // return await NativeModules.AppleCoreMLEngine.runInference(prompt, options);
    
    return `[CoreML Accelerated Response] ${simulateLocalInference(prompt)}`;
  }

  async embeddings(text: string): Promise<number[]> {
    if (!this.isLoaded) throw new Error("Core ML Model is not loaded");
    return simulateLocalEmbeddings(text);
  }

  async tokenize(text: string): Promise<string[]> {
    if (!this.isLoaded) throw new Error("Core ML Model is not loaded");
    return text.split(/\s+/);
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
    this.modelPath = "";
  }
}
