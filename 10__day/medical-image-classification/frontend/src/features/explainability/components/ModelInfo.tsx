import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Cpu, HardDrive, Layers, Server } from "lucide-react";

interface ModelInfoData {
  name: string;
  framework: string;
  version: string;
  epochs: number;
  learning_rate: number;
  accuracy: number;
}

export function ModelInfo() {
  const { data, isLoading } = useQuery<ModelInfoData>({
    queryKey: ["modelInfo"],
    queryFn: async () => {
      const { data } = await api.get<ModelInfoData>("/model-info");
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-[#0f172a]/60">
        <CardContent className="py-12 text-center text-slate-500">
          Loading Model Parameters...
        </CardContent>
      </Card>
    );
  }

  const info = data || {
    name: "DenseNet121",
    framework: "TensorFlow 2.x",
    version: "1.0",
    epochs: 10,
    learning_rate: 0.0001,
    accuracy: 98.7,
  };

  return (
    <Card className="border-slate-800 bg-[#0f172a]/60 backdrop-blur-md shadow-lg shadow-black/25">
      <CardHeader className="border-b border-slate-800/60 pb-4">
        <CardTitle className="text-lg font-bold text-slate-200">Neural Network Model Metadata</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-3 bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
          <Layers className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-xs text-slate-500 font-semibold">Architecture</p>
            <p className="text-sm font-bold text-slate-200">{info.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
          <Server className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-xs text-slate-500 font-semibold">Framework</p>
            <p className="text-sm font-bold text-slate-200">{info.framework}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
          <Cpu className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-xs text-slate-500 font-semibold">Model Version</p>
            <p className="text-sm font-bold text-slate-200">{info.version}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/20 p-3.5 rounded-xl border border-slate-900">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-xs text-slate-500 font-semibold">Target Accuracy</p>
            <p className="text-sm font-bold text-slate-200">{info.accuracy}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
