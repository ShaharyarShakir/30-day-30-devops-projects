import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, ShieldAlert, Clock, Layers, Cpu, Link2, ExternalLink } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/monitoring')({
  component: MonitoringComponent,
});

function MonitoringComponent() {
  const [metrics, setMetrics] = useState({
    requestRate: 42,
    errorRate: 0.4,
    latency: 18,
    queueDepth: 0,
  });

  // Simulate real-time fluctuations in metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const deltaReq = Math.floor(Math.random() * 7) - 3;
        const deltaErr = (Math.random() * 0.2) - 0.1;
        const deltaLat = Math.floor(Math.random() * 5) - 2;

        return {
          requestRate: Math.max(20, Math.min(100, prev.requestRate + deltaReq)),
          errorRate: Math.max(0.0, Math.min(5.0, Math.round((prev.errorRate + deltaErr) * 100) / 100)),
          latency: Math.max(10, Math.min(50, prev.latency + deltaLat)),
          queueDepth: prev.queueDepth, // Bound to active resumes list
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartData = [
    { time: '12:40', requests: 45, latency: 15, errors: 0.1 },
    { time: '12:41', requests: 52, latency: 22, errors: 0.2 },
    { time: '12:42', requests: 49, latency: 18, errors: 0.05 },
    { time: '12:43', requests: 58, latency: 25, errors: 0.8 },
    { time: '12:44', requests: 64, latency: 31, errors: 0.35 },
    { time: '12:45', requests: 55, latency: 19, errors: 0.12 },
  ];

  const tools = [
    { name: 'Prometheus', desc: 'Core gateway and services metrics telemetry database', url: 'http://localhost:9090', color: 'border-orange-500/10 hover:border-orange-500/30' },
    { name: 'Grafana', desc: 'Recruiter dashboards showing system health visual maps', url: 'http://localhost:3000', color: 'border-blue-500/10 hover:border-blue-500/30' },
    { name: 'Loki', desc: 'Gateway, Auth and ML services aggregated log console', url: 'http://localhost:3100', color: 'border-yellow-500/10 hover:border-yellow-500/30' },
    { name: 'Jaeger', desc: 'Distributed transaction traces mapping processing calls', url: 'http://localhost:16686', color: 'border-cyan-500/10 hover:border-cyan-500/30' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">System Monitoring</h2>
        <p className="text-xs text-slate-400 mt-1">Real-time telemetry, gateway logs, and infrastructure status map</p>
      </div>

      {/* External Observability Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {tools.map((tool, idx) => (
          <Card key={idx} className={`border ${tool.color} transition-all duration-200`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-350 uppercase tracking-wider">{tool.name}</CardTitle>
                <a href={tool.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-200">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] text-slate-500 mt-1">{tool.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Observability stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Request Rate</CardTitle>
            <Activity className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">{metrics.requestRate} rps</div>
            <p className="text-[10px] text-slate-500 mt-1">Live fluctuating value</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Error Rate</CardTitle>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">{metrics.errorRate}%</div>
            <p className="text-[10px] text-slate-500 mt-1">API gateway failures</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Latency</CardTitle>
            <Clock className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">{metrics.latency}ms</div>
            <p className="text-[10px] text-slate-500 mt-1">FastAPI gateway proxy delay</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Worker Nodes</CardTitle>
            <Layers className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">1/1 Active</div>
            <p className="text-[10px] text-slate-500 mt-1">FastAPI parser worker status</p>
          </CardContent>
        </Card>
      </div>

      {/* Latency & Error Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-800/60">
          <CardHeader>
            <CardTitle>Error Log History</CardTitle>
            <CardDescription>Error percentage spike history</CardDescription>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorError)" name="Error %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-800/60">
          <CardHeader>
            <CardTitle>Latency Spread</CardTitle>
            <CardDescription>Response speed metrics in milliseconds</CardDescription>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="latency" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Latency ms" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
