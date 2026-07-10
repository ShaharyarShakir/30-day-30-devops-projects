import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2, Calendar, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import type { HistoryRecord } from "../types/prediction";

export function HistoryRoute() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const records = JSON.parse(localStorage.getItem("scan_history") || "[]");
      setHistory(records);
    } catch (e) {
      console.error("Failed to parse history records:", e);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all scans from your history?")) {
      localStorage.removeItem("scan_history");
      setHistory([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Analysis Log History
          </h1>
          <p className="text-gray-400 text-sm">
            View previous diagnostic runs. Records are stored locally in your browser.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center space-x-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 px-4 py-2.5 rounded-xl border border-red-900/30 transition duration-200 text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Scans Grid List */}
      {history.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 space-y-4">
          <div className="inline-block bg-white/3 p-4 rounded-full text-gray-600 mb-2">
            <FileText className="h-8 w-8" />
          </div>
          <p className="text-gray-300 font-medium">No Diagnostic Scans Found</p>
          <p className="text-gray-500 text-sm max-w-[280px] mx-auto">
            Analyze a chest X-ray on the dashboard and results will appear in this history list.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((record) => (
            <div
              key={record.id}
              className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              {/* Image Thumbnail and Details */}
              <div className="flex items-center space-x-4">
                {record.imageUrl ? (
                  <div className="h-16 w-16 rounded-xl overflow-hidden border border-gray-800 bg-black flex-shrink-0 flex items-center justify-center">
                    <img
                      src={record.imageUrl}
                      alt="Thumbnail X-Ray"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="font-semibold text-gray-200 truncate max-w-[220px] sm:max-w-xs" title={record.imageName}>
                    {record.imageName}
                  </p>
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{record.timestamp}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Confidence */}
              <div className="flex items-center space-x-6 sm:space-x-8">
                {/* Result Label Badge */}
                <div className="flex items-center space-x-2">
                  {record.prediction === "NORMAL" ? (
                    <div className="bg-green-600/10 text-green-400 p-1.5 rounded-lg border border-green-500/10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="bg-red-600/10 text-red-400 p-1.5 rounded-lg border border-red-500/10">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                  )}
                  <span className={`font-bold text-sm tracking-wider uppercase ${
                    record.prediction === "NORMAL" ? "text-green-400" : "text-red-400"
                  }`}>
                    {record.prediction}
                  </span>
                </div>

                {/* Confidence Bar */}
                <div className="text-right space-y-1 min-w-[70px]">
                  <p className="text-xs text-gray-500">Confidence</p>
                  <p className={`font-extrabold text-sm ${
                    record.prediction === "NORMAL" ? "text-green-400" : "text-red-400"
                  }`}>
                    {(record.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});
