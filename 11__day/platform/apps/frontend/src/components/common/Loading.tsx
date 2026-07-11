export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-t-2 border-r-2 border-violet-500 animate-spin"></div>
        <div
          className="absolute h-8 w-8 rounded-full border-b-2 border-l-2 border-indigo-400/50 animate-spin"
          style={{ animationDirection: "reverse" }}
        ></div>
      </div>
      <p className="text-sm font-medium text-slate-400 animate-pulse tracking-wide">
        Loading resources...
      </p>
    </div>
  );
}
