import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type Props = {
  file: File;
  onRemove(): void;
};

export function ImagePreview({ file, onRemove }: Props) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black/40 min-h-[300px] flex items-center justify-center p-4">
      <img
        src={url}
        alt="X-ray preview"
        className="max-h-[320px] w-auto object-contain rounded-xl"
      />
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition duration-200"
        title="Remove image"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
