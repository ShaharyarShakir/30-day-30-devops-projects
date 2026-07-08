import { NativeModules } from "react-native";
import { AIProvider } from "./AIProvider";
import { ProviderId } from "../types";
import * as FileSystem from "expo-file-system/legacy";
import { simulateLocalInference, simulateLocalEmbeddings } from "./QNNProvider";

export class ONNXProvider extends AIProvider {
  readonly id: ProviderId = "onnx";
  readonly name = "ONNX Runtime Mobile";
  private isLoaded = false;
  private modelPath = "";

  async isAvailable(): Promise<boolean> {
    // Check if the native ONNX module is linked
    return !!NativeModules.ONNXRuntimeMobileEngine || false;
  }

  async loadModel(modelPath: string): Promise<boolean> {
    this.modelPath = modelPath;
    try {
      // Check if files exist locally
      const modelFile = `${modelPath}/model.onnx`;
      const info = await FileSystem.getInfoAsync(modelFile);
      if (!info.exists) {
        throw new Error(`ONNX model weights missing at ${modelFile}`);
      }
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("[ONNXProvider] Failed to load model:", e);
      return false;
    }
  }

  async generate(prompt: string, options?: any): Promise<string> {
    if (!this.isLoaded) throw new Error("ONNX Model is not loaded");
    
    // In a real native application with ORT:
    // return await NativeModules.ONNXRuntimeMobileEngine.run(prompt, options);
    
    return `[ONNX Local Response] ${simulateLocalInference(prompt)}`;
  }

  async embeddings(text: string): Promise<number[]> {
    if (!this.isLoaded) throw new Error("ONNX Model is not loaded");
    return simulateLocalEmbeddings(text);
  }

  async tokenize(text: string): Promise<string[]> {
    if (!this.isLoaded) throw new Error("ONNX Model is not loaded");
    return text.split(/\s+/);
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
    this.modelPath = "";
  }
}
