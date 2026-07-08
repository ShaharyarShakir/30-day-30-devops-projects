import { ProviderId } from "../types";

export abstract class AIProvider {
  abstract readonly id: ProviderId;
  abstract readonly name: string;

  /**
   * Checks if this engine provider is supported/available on the current platform and device.
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Loads the model from the specified directory path.
   */
  abstract loadModel(modelPath: string): Promise<boolean>;

  /**
   * Generates text response based on prompt.
   */
  abstract generate(prompt: string, options?: any): Promise<string>;

  /**
   * Generates text embeddings for similarity matching.
   */
  abstract embeddings(text: string): Promise<number[]>;

  /**
   * Tokenizes text.
   */
  abstract tokenize(text: string): Promise<string[]>;

  /**
   * Unloads the currently active model from memory.
   */
  abstract unload(): Promise<void>;
}
