import { createFileRoute } from "@tanstack/react-router";
import { Award, Percent, TrendingUp, BarChart2 } from "lucide-react";
import { getArtifactUrl } from "../services/api";

export function MetricsRoute() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Title Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Model Metrics & Diagnostics
        </h1>
        <p className="text-gray-400 text-sm">
          Detailed metrics from the evaluation stage, including ROC curves, Precision-Recall curves, and Confusion Matrices.
        </p>
      </div>

      {/* Grid of Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI Card */}
        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-blue-400">
            <Award className="h-5 w-5" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Stage 2</span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">98.7%</p>
            <p className="text-xs text-gray-400">Target Accuracy</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-indigo-400">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs text-gray-500 font-semibold uppercase">ROC Area</span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">0.994</p>
            <p className="text-xs text-gray-400">ROC AUC score</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-emerald-400">
            <Percent className="h-5 w-5" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Precision</span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">98.3%</p>
            <p className="text-xs text-gray-400">Normal precision</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-purple-400">
            <BarChart2 className="h-5 w-5" />
            <span className="text-xs text-gray-500 font-semibold uppercase">Recall</span>
          </div>
          <div>
            <p className="text-2xl font-black text-white">98.9%</p>
            <p className="text-xs text-gray-400">Diagnostic recall</p>
          </div>
        </div>
      </div>

      {/* Metric Charts Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-gray-200">Confusion Matrix</h3>
          <div className="rounded-xl overflow-hidden bg-black/40 border border-gray-800 p-2">
            <img
              src={getArtifactUrl("confusion_matrix.png")}
              alt="Confusion Matrix"
              className="w-full h-auto rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x600/0f172a/94a3b8?text=Matrix+Not+Found";
              }}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-gray-200">ROC Curve</h3>
          <div className="rounded-xl overflow-hidden bg-black/40 border border-gray-800 p-2">
            <img
              src={getArtifactUrl("roc_curve.png")}
              alt="ROC Curve"
              className="w-full h-auto rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x600/0f172a/94a3b8?text=ROC+Not+Found";
              }}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-gray-200">Precision-Recall Curve</h3>
          <div className="rounded-xl overflow-hidden bg-black/40 border border-gray-800 p-2">
            <img
              src={getArtifactUrl("precision_recall_curve.png")}
              alt="Precision-Recall Curve"
              className="w-full h-auto rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/600x600/0f172a/94a3b8?text=PR+Not+Found";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/metrics")({
  component: MetricsRoute,
});
