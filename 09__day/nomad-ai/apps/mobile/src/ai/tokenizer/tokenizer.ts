import * as FileSystem from "expo-file-system/legacy";

export class LocalTokenizer {
  private vocab: Record<string, number> = {};

  async load(modelPath: string): Promise<boolean> {
    try {
      const vocabPath = `${modelPath}/vocab.json`;
      const exists = await FileSystem.getInfoAsync(vocabPath);
      if (exists.exists) {
        const data = await FileSystem.readAsStringAsync(vocabPath);
        this.vocab = JSON.parse(data);
        return true;
      }
      return false;
    } catch (e) {
      console.warn("[LocalTokenizer] Failed to load vocab.json:", e);
      return false;
    }
  }

  tokenize(text: string): string[] {
    const words = text.split(/\s+/);
    const tokens: string[] = [];
    
    for (const word of words) {
      const cleaned = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
      if (cleaned.length === 0) continue;
      
      if (this.vocab[cleaned] !== undefined) {
        tokens.push(cleaned);
      } else {
        // Break into character segments
        let temp = cleaned;
        while (temp.length > 0) {
          let found = false;
          for (let len = temp.length; len > 0; len--) {
            const sub = temp.slice(0, len);
            if (this.vocab[sub] !== undefined) {
              tokens.push(sub);
              temp = temp.slice(len);
              found = true;
              break;
            }
          }
          if (!found) {
            tokens.push("[UNK]");
            break;
          }
        }
      }
    }
    return tokens;
  }

  encode(text: string): number[] {
    const tokens = this.tokenize(text);
    return tokens.map((t) => this.vocab[t] ?? this.vocab["[UNK]"] ?? 1);
  }
}
