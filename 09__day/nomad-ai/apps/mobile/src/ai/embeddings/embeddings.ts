import { simulateLocalEmbeddings } from "../engine/QNNProvider";

export class LocalEmbeddings {
  /**
   * Generates a high-dimensional vector representation of text offline.
   * Useful for finding similarity matches in itineraries, packing lists, and local translation searches.
   */
  static generate(text: string): number[] {
    return simulateLocalEmbeddings(text);
  }

  /**
   * Calculates cosine similarity between two vectors.
   */
  static cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
