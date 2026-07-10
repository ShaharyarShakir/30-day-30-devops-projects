import { createFileRoute } from "@tanstack/react-router";
import { UploadForm } from "../features/prediction/components/UploadForm";

export const Route = createFileRoute("/predict")({
  component: PredictPage,
});

function PredictPage() {
  return <UploadForm />;
}
