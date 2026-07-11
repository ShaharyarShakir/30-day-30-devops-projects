import { Link } from "@tanstack/react-router";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="max-w-md w-full glass p-8 rounded-2xl glow space-y-6">
        <h1
          className="text-7xl font-extrabold bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          404
        </h1>
        <h2 className="text-xl font-bold tracking-tight">Page Not Found</h2>
        <p className="text-sm text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white rounded-lg shadow-md shadow-violet-500/10 transition-all duration-200 cursor-pointer"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
