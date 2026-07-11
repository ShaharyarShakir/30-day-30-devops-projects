import { createFileRoute } from "@tanstack/react-router";
import { Server, Database, MessageSquare, ShieldAlert, Activity } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage
});

function DashboardPage() {
  const stats = [
    {
      name: "PostgreSQL Database",
      status: "Healthy",
      port: "5432",
      icon: Database,
      color: "text-emerald-400"
    },
    {
      name: "Kafka Event Broker",
      status: "Healthy",
      port: "9092",
      icon: Server,
      color: "text-violet-400"
    },
    {
      name: "NestJS API Gateway",
      status: "Online",
      port: "8000",
      icon: Activity,
      color: "text-indigo-400"
    },
    {
      name: "Spring Boot Auth",
      status: "Online",
      port: "8080",
      icon: ShieldAlert,
      color: "text-rose-400"
    }
  ];

  return (
    <div className="px-6 lg:px-8 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1
            className="text-3xl font-extrabold text-white bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Welcome to Learning Platform
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status overview of platform microservices and containers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/25 text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          All Services Operational
        </div>
      </div>

      {/* Grid of Microservice status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="glass-card p-6 rounded-2xl glow flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-start">
                <div
                  className={`h-10 w-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center ${s.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 rounded-full border border-slate-800 text-slate-300">
                  :{s.port}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-bold text-white">{s.name}</h3>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> {s.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infrastructure logs placeholder */}
      <div className="glass p-8 rounded-2xl glow border border-slate-800/80">
        <h3
          className="text-lg font-bold text-white mb-4"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Local Dev Logs Output
        </h3>
        <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-5 font-mono text-xs text-slate-400 h-64 overflow-y-auto space-y-2.5">
          <div>
            [2026-07-10 18:30:15] <span className="text-indigo-400">GATEWAY</span>: GET /health -
            Status: 200 (2.4ms)
          </div>
          <div>
            [2026-07-10 18:30:16] <span className="text-rose-400">AUTH-SERVICE</span>: Database pool
            initialized successfully
          </div>
          <div>
            [2026-07-10 18:30:18] <span className="text-violet-400">KAFKA</span>: Group coordinator
            platform-group (127.0.0.1:9092) is active
          </div>
          <div>
            [2026-07-10 18:30:20] <span className="text-emerald-400">POSTGRES</span>: Server
            started, ready to accept connections
          </div>
          <div>
            [2026-07-10 18:30:22] <span className="text-amber-400">REDIS</span>: DB loaded from
            disk: 0.001 seconds
          </div>
          <div className="animate-pulse">[waiting for live docker stream...]</div>
        </div>
      </div>
    </div>
  );
}
