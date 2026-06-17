"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/services/health";

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: 1,
  });
}
