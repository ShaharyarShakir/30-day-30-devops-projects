import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";

type Props = {
  onFileSelect(file: File): void;
};

export function UploadZone({ onFileSelect }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
    onDrop(files) {
      if (files.length) {
        onFileSelect(files[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-4 min-h-[250px] ${
        isDragActive
          ? "border-blue-400 bg-blue-600/5 scale-[0.98]"
          : "border-slate-800 bg-[#0f172a]/30 hover:border-slate-650 hover:bg-[#0f172a]/50"
      }`}
    >
      <input {...getInputProps()} />
      
      <div className="bg-blue-600/10 p-4 rounded-full text-blue-400 animate-bounce">
        <Upload className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <p className="text-slate-200 font-semibold">Drag & drop your chest X-ray image here</p>
        <p className="text-slate-500 text-sm">or click to browse from directory</p>
      </div>
      <p className="text-xs text-slate-600">Supports JPEG, PNG up to 10MB</p>
    </div>
  );
}
