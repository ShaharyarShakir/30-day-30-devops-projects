import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            MedVision AI
          </span>
        </div>

        <nav className="flex gap-6">
          <Link
            to="/"
            activeProps={{ className: "text-blue-400 font-semibold" }}
            className="text-gray-300 hover:text-white transition duration-200 text-sm"
          >
            Home
          </Link>
          <Link
            to="/predict"
            activeProps={{ className: "text-blue-400 font-semibold" }}
            className="text-gray-300 hover:text-white transition duration-200 text-sm"
          >
            Predict
          </Link>
          <Link
            to="/metrics"
            activeProps={{ className: "text-blue-400 font-semibold" }}
            className="text-gray-300 hover:text-white transition duration-200 text-sm"
          >
            Metrics
          </Link>
          <Link
            to="/history"
            activeProps={{ className: "text-blue-400 font-semibold" }}
            className="text-gray-300 hover:text-white transition duration-200 text-sm"
          >
            History
          </Link>
        </nav>
      </div>
    </header>
  );
}
