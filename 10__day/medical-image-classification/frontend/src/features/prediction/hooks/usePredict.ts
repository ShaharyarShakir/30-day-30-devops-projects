import { useMutation } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";
import { predictImage } from "../api/predict";
import type { PredictionResponse } from "../types";

export function usePredict(options?: UseMutationOptions<PredictionResponse, Error, File>) {
  return useMutation({
    mutationFn: predictImage,
    ...options,
  });
}
