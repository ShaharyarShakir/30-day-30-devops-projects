import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { ImagePreview } from "../../prediction/components/ImagePreview";
import { Info } from "lucide-react";

type Props = {
  originalFile: File;
  heatmapUrl: string;
};

export function HeatmapCard({ originalFile, heatmapUrl }: Props) {
  return (
    <Card className="border-slate-800 bg-[#0f172a]/60 backdrop-blur-md shadow-lg shadow-black/25">
      <CardHeader className="border-b border-slate-800/60 pb-4">
        <CardTitle className="text-lg font-bold text-slate-200">Explainable AI Localization</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Specimen */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-400">Original Input Specimen</p>
            <ImagePreview file={originalFile} onRemove={() => {}} />
          </div>

          {/* Grad-CAM Heatmap */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-400">Grad-CAM Spatial Heatmap</p>
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black/40 min-h-[300px] flex items-center justify-center p-4">
              <img
                src={heatmapUrl}
                alt="Grad-CAM activation overlay"
                className="max-h-[320px] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Explainability disclaimer/information */}
        <div className="flex items-start space-x-3 bg-blue-950/15 border border-blue-900/35 p-4 rounded-2xl text-xs text-blue-300">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <b>Grad-CAM Explanation:</b> The red regions highlight the key anatomical features in the lungs that most strongly influenced the model's prediction of Pneumonia or Normal tissue, corresponding to high gradient activation maps.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
