export interface PredictionResponse {
  prediction: "NORMAL" | "PNEUMONIA";
  confidence: number;
  heatmap?: string;
}

export interface PredictionRequest {
  file: File;
}
