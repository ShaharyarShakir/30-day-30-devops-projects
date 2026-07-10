import { useState } from "react";
import { UploadZone } from "./UploadZone";
import { ImagePreview } from "./ImagePreview";
import { PredictionCard } from "./PredictionCard";
import { usePredict } from "../hooks/usePredict";
import { Button } from "../../../components/ui/button";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Card } from "../../../components/ui/card";
import { Activity, AlertCircle, FileText } from "lucide-react";
import { api } from "../../../lib/api";
import { HeatmapCard } from "../../explainability/components/HeatmapCard";
import { ProbabilityCard } from "../../explainability/components/ProbabilityCard";
import { ModelInfo } from "../../explainability/components/ModelInfo";
import type { HistoryRecord } from "../../../types/prediction";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const mutation = usePredict({
    onSuccess: (data) => {
      try {
        const history: HistoryRecord[] = JSON.parse(
          localStorage.getItem("scan_history") || "[]"
        );
        const newRecord: HistoryRecord = {
          id: Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toLocaleString(),
          prediction: data.prediction,
          confidence: data.confidence,
          imageName: file?.name || "unnamed.jpg",
          imageUrl: base64Image || "",
        };
        localStorage.setItem("scan_history", JSON.stringify([newRecord, ...history]));
      } catch (err) {
        console.error("Failed to write scan log to history:", err);
      }
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    mutation.reset();

    // Generate base64 representation for persistent history storage
    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Image(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setBase64Image(null);
    mutation.reset();
  };

  const handleAnalyze = () => {
    if (file) {
      mutation.mutate(file);
    }
  };

  const handleDownloadReport = async () => {
    if (!file || !mutation.data || !mutation.data.heatmap || !base64Image) return;

    try {
      setIsDownloading(true);
      const response = await api.post(
        "/report",
        {
          prediction: mutation.data.prediction,
          confidence: mutation.data.confidence,
          image: base64Image,
          heatmap: mutation.data.heatmap,
        },
        {
          responseType: "blob",
        }
      );

      // Trigger download in browser
      const blob = new Blob([response.data], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `medvision_report_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to download PDF report:", err);
      alert("Could not generate clinical PDF report. Please check if backend is running.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Full dashboard view on classification success
  if (mutation.isSuccess && file && mutation.data) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        {/* Title Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
            Analysis Report Dashboard
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Interactive diagnostic telemetry, Grad-CAM spatial activation maps, and neural network indicators.
          </p>
        </div>

        {/* Grad-CAM Interpretability side-by-side */}
        {mutation.data.heatmap && (
          <HeatmapCard originalFile={file} heatmapUrl={mutation.data.heatmap} />
        )}

        {/* Breakdown and Prediction cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PredictionCard prediction={mutation.data.prediction} confidence={mutation.data.confidence} />
          <ProbabilityCard prediction={mutation.data.prediction} confidence={mutation.data.confidence} />
        </div>

        {/* Model info and Clinician Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModelInfo />

          <Card className="border-slate-800 bg-[#0f172a]/60 backdrop-blur-md p-6 flex flex-col justify-between shadow-lg shadow-black/25">
            <div>
              <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <span>Clinical Documentation</span>
              </h3>
              <p className="text-sm text-slate-450 leading-relaxed">
                Generate and download a formal clinical PDF report containing model telemetry, Grad-CAM interpretability visualizations, and physician notice sheets for documentation.
              </p>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleDownloadReport}
                disabled={isDownloading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition duration-200 h-12"
              >
                {isDownloading ? "Generating PDF..." : "Download PDF Report"}
              </Button>
              <Button
                onClick={handleRemoveFile}
                variant="outline"
                className="border-slate-800 hover:bg-slate-900 text-slate-350 font-semibold py-3 rounded-xl transition duration-200 h-12"
              >
                New Analysis
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
          Chest X-Ray Analysis
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Upload a medical chest X-ray image to receive an immediate binary classification prediction for Pneumonia detection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Section: Upload & Preview */}
        <div className="space-y-6">
          <div className="bg-[#0f172a]/65 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 shadow-lg shadow-black/40">
            <h2 className="text-xl font-bold text-slate-200 flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-400" />
              <span>Input Specimen</span>
            </h2>

            {!file ? (
              <UploadZone onFileSelect={handleFileSelect} />
            ) : (
              <div className="space-y-4">
                <ImagePreview file={file} onRemove={handleRemoveFile} />
                
                <div className="flex justify-between items-center text-sm text-slate-450 px-1">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>

                {!mutation.isSuccess && !mutation.isPending && (
                  <Button
                    onClick={handleAnalyze}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition duration-300 shadow-lg shadow-blue-600/10 h-12"
                  >
                    Analyze Image Specimen
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Results, Status and Warnings */}
        <div className="space-y-6">
          <div className="bg-[#0f172a]/65 backdrop-blur-md border border-white/10 rounded-3xl p-6 min-h-[350px] flex flex-col justify-between shadow-lg shadow-black/40">
            <div className="space-y-6 flex-grow flex flex-col justify-center">
              {/* Default Welcome Screen */}
              {!mutation.isPending && !mutation.isSuccess && !mutation.isError && (
                <div className="text-center py-12 space-y-4 flex flex-col items-center justify-center">
                  <div className="bg-slate-800/30 p-4 rounded-full text-slate-650 mb-2">
                    <Activity className="h-10 w-10 animate-pulse" />
                  </div>
                  <p className="text-slate-400 font-medium">System Idle</p>
                  <p className="text-slate-600 text-sm max-w-[240px] mx-auto">
                    Please upload an image and click analyze to start model inference.
                  </p>
                </div>
              )}

              {/* Inference Loader Screen */}
              {mutation.isPending && (
                <div className="text-center py-12 space-y-6 flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-blue-400 font-bold text-xs">
                      AI
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-300 font-medium animate-pulse">Running model inference...</p>
                    <p className="text-slate-500 text-sm">Evaluating chest X-ray feature maps</p>
                  </div>
                </div>
              )}

              {/* Error Screen */}
              {mutation.isError && (
                <div className="space-y-4">
                  <Alert variant="destructive" className="border-red-900 bg-red-950/20 text-red-400 rounded-2xl p-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      Unable to analyze the image: {mutation.error?.message || "Please try again."}
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={handleAnalyze}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition h-12 rounded-xl"
                  >
                    Retry Analysis
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
