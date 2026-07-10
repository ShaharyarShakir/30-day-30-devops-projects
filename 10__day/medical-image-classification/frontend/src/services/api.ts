import { api } from "../lib/api";
import type { PredictionResponse } from "../types/prediction";

export async function uploadImage(file: File): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<PredictionResponse>("/api/v1/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export function getArtifactUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  return `${baseUrl}/artifacts/${path}`;
}
