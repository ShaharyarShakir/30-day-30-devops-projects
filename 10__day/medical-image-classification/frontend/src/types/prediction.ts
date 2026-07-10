export interface PredictionResponse {
  prediction: "NORMAL" | "PNEUMONIA";
  confidence: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  prediction: "NORMAL" | "PNEUMONIA";
  confidence: number;
  imageName: string;
  imageUrl: string; // Base64 encoding for local persistence and display
}
