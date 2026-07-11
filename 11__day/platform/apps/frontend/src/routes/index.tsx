import { createFileRoute, Link } from "@tanstack/react-router";
import { Terminal, Shield, Cpu, Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage
});

function LandingPage() {
  return (
    <div className="relative overflow-hidden px-6 lg:px-8 py-12 md:py-24">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

      <div className="mx-auto max-w-6xl text-center relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-6">
          <Activity className="h-3.5 w-3.5 animate-pulse" /> Sprint 1 Active Deployments
        </span>

        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Next-Gen Platform <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-indigo-400 bg-clip-text text-transparent">
            Microservices Architecture
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-base md:text-lg text-slate-400 leading-relaxed mb-10">
          A high-performance monorepo integrating NestJS, Spring Boot, TanStack Start, and
          full-scale Docker Compose infrastructure. Orchestrated for production scalability.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
          <Link
            to="/register"
            className="px-6 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 flex items-center gap-2 group"
          >
            Get Started{" "}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="px-6 py-3.5 text-base font-semibold text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass-card p-8 rounded-2xl glow hover:-translate-y-1 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6">
              <Terminal className="h-6 w-6" />
            </div>
            <h3
              className="text-xl font-bold text-white mb-3"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Vibrant Interface
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              TanStack Start featuring file-based routing, instant server-side hydration, and
              premium responsive styles.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl glow hover:-translate-y-1 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
              <Shield className="h-6 w-6" />
            </div>
            <h3
              className="text-xl font-bold text-white mb-3"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Unified Security
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kotlin Spring Boot OAuth and authentication backends protecting gateway and service
              transactions.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl glow hover:-translate-y-1 transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-6">
              <Cpu className="h-6 w-6" />
            </div>
            <h3
              className="text-xl font-bold text-white mb-3"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Automated DevOps
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Orchestrated with clean local compose services, unified logging, health checks, and a
              comprehensive Makefile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
