"use client";

import { useHealthCheck } from "@/hooks/useHealthCheck";

export function SystemStatus() {
  const { data, isLoading, isError } = useHealthCheck();

  let statusLabel = "Ready";

  if (isLoading) {
    statusLabel = "Checking...";
  } else if (isError || data?.status !== "healthy") {
    statusLabel = "Unavailable";
  }

  const isReady = statusLabel === "Ready";

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isReady ? "bg-emerald-500" : isLoading ? "bg-amber-400" : "bg-red-500"
        }`}
      />
      <span>
        System Status:{" "}
        <span className="font-medium text-slate-800">{statusLabel}</span>
      </span>
    </div>
  );
}
