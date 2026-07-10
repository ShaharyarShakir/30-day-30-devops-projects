import { api } from "../../../lib/api";
import type { PredictionResponse } from "../types";

export async function predictImage(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<PredictionResponse>("/api/v1/predict", formData);
  return data;
}
