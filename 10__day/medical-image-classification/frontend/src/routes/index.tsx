import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Shield, Sparkles, Clock, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-12 py-6 md:py-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Production AI Classifier</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Advanced Chest X-Ray <br className="hidden md:inline" />
          Classification Engine
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Unlock instant diagnostic screening for Pneumonia using state-of-the-art DenseNet121 deep neural networks. Built for radiologists and physicians.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/predict">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-6 text-base rounded-xl transition duration-300 shadow-lg shadow-blue-500/20 group">
              <span>Start Diagnostic Scan</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/metrics">
            <Button size="lg" variant="outline" className="border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold px-8 py-6 text-base rounded-xl transition duration-300">
              View Model Performance
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition duration-300 group">
          <div className="bg-blue-500/10 p-3.5 rounded-2xl text-blue-400 w-fit mb-5 group-hover:scale-110 transition duration-300">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">98.7% Accuracy</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Evaluated on thousands of curated validation datasets ensuring high-confidence outcomes with extremely low false negatives.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition duration-300 group">
          <div className="bg-indigo-500/10 p-3.5 rounded-2xl text-indigo-400 w-fit mb-5 group-hover:scale-110 transition duration-300">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Privacy Centric</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Patient specimens are evaluated on-demand, and logs are kept secure and sandboxed locally in your browser storage.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:border-purple-500/30 transition duration-300 group">
          <div className="bg-purple-500/10 p-3.5 rounded-2xl text-purple-400 w-fit mb-5 group-hover:scale-110 transition duration-300">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Instant Inference</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Receive predictions and confidence levels under a second, accelerating diagnostic screening workflows.
          </p>
        </div>
      </div>
    </div>
  );
}
