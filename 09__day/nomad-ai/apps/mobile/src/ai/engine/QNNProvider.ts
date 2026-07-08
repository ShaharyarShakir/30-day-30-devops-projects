import { Platform, NativeModules } from "react-native";
import { AIProvider } from "./AIProvider";
import { ProviderId } from "../types";
import * as FileSystem from "expo-file-system/legacy";

export class QNNProvider extends AIProvider {
  readonly id: ProviderId = "qnn";
  readonly name = "Qualcomm AI runtime (QNN/QVAC)";
  private isLoaded = false;
  private modelPath = "";

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    // Check if the native QNN/QVAC module is linked in the native application
    return !!NativeModules.QualcommAIEngine || false;
  }

  async loadModel(modelPath: string): Promise<boolean> {
    this.modelPath = modelPath;
    try {
      // In a real native module, we would call:
      // await NativeModules.QualcommAIEngine.load(modelPath);
      
      // Let's verify the model files exist locally
      const modelFile = `${modelPath}/model.onnx`;
      const info = await FileSystem.getInfoAsync(modelFile);
      if (!info.exists) {
        throw new Error(`ONNX model weights missing at ${modelFile}`);
      }
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("[QNNProvider] Failed to load model:", e);
      return false;
    }
  }

  async generate(prompt: string, options?: any): Promise<string> {
    if (!this.isLoaded) throw new Error("QNN Model is not loaded");
    
    // In a real deployment, we execute native inference:
    // return await NativeModules.QualcommAIEngine.runInference(prompt, options);
    
    return `[QNN Accelerated Response] ${simulateLocalInference(prompt)}`;
  }

  async embeddings(text: string): Promise<number[]> {
    if (!this.isLoaded) throw new Error("QNN Model is not loaded");
    return simulateLocalEmbeddings(text);
  }

  async tokenize(text: string): Promise<string[]> {
    if (!this.isLoaded) throw new Error("QNN Model is not loaded");
    return text.split(/\s+/);
  }

  async unload(): Promise<void> {
    this.isLoaded = false;
    this.modelPath = "";
  }
}

// Global simulation helpers shared by all engines when running in simulation mode
export function simulateLocalInference(prompt: string): string {
  const normalized = prompt.toLowerCase();
  
  if (normalized.includes("pack") || normalized.includes("gear") || normalized.includes("luggage")) {
    const dest = extractDestination(prompt) || "your destination";
    return `Here is your custom, optimized packing list for ${dest}:
- Essential travel documents & credit cards
- Weather-appropriate clothing (4x shirts, 2x pants, activewear)
- Universal travel adapter & charging cables
- Toiletries kit (under 100ml for carry-on)
- Personal medication & first aid basics
- Comfortable walking shoes

Tip: Roll your clothes instead of folding to save 30% more bag space!`;
  }
  
  if (normalized.includes("itinerary") || normalized.includes("plan") || normalized.includes("schedule")) {
    const dest = extractDestination(prompt) || "your destination";
    return `Here is a curated 3-day itinerary for ${dest}:

Day 1: Arrival & Exploring Old Town
- Morning: Land, check-in, and grab local coffee.
- Afternoon: Walk through the historic district and visit the central museum.
- Evening: Welcome dinner at a traditional local bistro.

Day 2: Culture & Landmarks
- Morning: Early visit to the primary scenic landmark (beat the crowds).
- Afternoon: Guided walking food tour to taste local specialties.
- Evening: Sunset viewpoint drink followed by a local arts show.

Day 3: Outdoor Adventure & Departure
- Morning: Rent a bike or hike the nearby green trails.
- Afternoon: Souvenir shopping in the artisan markets.
- Evening: Departure transfer.`;
  }

  if (normalized.includes("translate") || normalized.includes("spanish") || normalized.includes("french") || normalized.includes("japanese")) {
    let language = "the local language";
    if (normalized.includes("spanish")) language = "Spanish";
    if (normalized.includes("french")) language = "French";
    if (normalized.includes("japanese")) language = "Japanese";
    
    return `Here are the essential travel phrases in ${language}:
1. Hello ➔ Hola / Bonjour / Konnichiwa
2. Thank you ➔ Gracias / Merci / Arigatou
3. Where is the bathroom? ➔ ¿Dónde está el baño? / Où sont les toilettes? / Otearai wa doko desu ka?
4. How much is this? ➔ ¿Cuánto cuesta esto? / C'est combien? / Kore wa ikura desu ka?
5. Yes / No ➔ Sí / No | Oui / Non | Hai / Iie`;
  }

  if (normalized.includes("expense") || normalized.includes("budget") || normalized.includes("spend")) {
    return `Based on your recent expenses, here is a quick budget analysis:
- Accommodation: 45% (on track)
- Dining & Food: 28% (slightly high, recommend local markets for lunch)
- Transport: 15% (optimal, great use of public rail transit)
- Activities: 12%

Recommendation: You can save around $50 per day by securing city tourism passes online in advance.`;
  }

  return `I've analyzed your request: "${prompt}". 
As your Nomad AI offline companion, I recommend taking time to explore local hidden gems, connecting with resident guides, and traveling sustainably. Please let me know if you would like me to generate a detailed day-to-day itinerary, a customized packing list, or parse local translations!`;
}

export function simulateLocalEmbeddings(text: string): number[] {
  // Generate a deterministic vector of length 16 based on character codes
  const vector = new Array(16).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % 16] += text.charCodeAt(i) / 1000;
  }
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

function extractDestination(prompt: string): string | null {
  const countries = ["Paris", "Tokyo", "London", "New York", "Spain", "France", "Japan", "Italy", "Rome", "Bali", "Thailand", "Bangkok"];
  for (const c of countries) {
    if (prompt.toLowerCase().includes(c.toLowerCase())) return c;
  }
  return null;
}
