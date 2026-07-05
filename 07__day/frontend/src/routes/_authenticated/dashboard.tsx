import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  FileSpreadsheet, 
  Briefcase, 
  Cpu, 
  FlaskConical, 
  Users, 
  ArrowRight, 
  Sparkles,
  TrendingUp,
  Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardComponent,
});

// Mock telemetry history for CPU & Memory
const telemetryData = [
  { time: '12:00', cpu: 32, memory: 48, requests: 120 },
  { time: '12:05', cpu: 45, memory: 52, requests: 145 },
  { time: '12:10', cpu: 28, memory: 49, requests: 95 },
  { time: '12:15', cpu: 55, memory: 58, requests: 180 },
  { time: '12:20', cpu: 67, memory: 61, requests: 210 },
  { time: '12:25', cpu: 42, memory: 55, requests: 160 },
  { time: '12:30', cpu: 38, memory: 51, requests: 130 },
];

function DashboardComponent() {
  const { data: resumes = [], isLoading: resumesLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.resumes.list,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.jobs.list,
  });

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: api.models.list,
  });

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: api.experiments.list,
  });

  // Calculate statistics
  const totalResumes = resumes.length;
  const processingResumes = resumes.filter(r => r.status === 'processing' || r.status === 'uploaded').length;
  const processedResumes = resumes.filter(r => r.status === 'processed').length;
  const activeModels = models.filter(m => m.status === 'Active').length;
  const totalJobs = jobs.length;
  const totalExperiments = experiments.length;

  const stats = [
    { label: 'Total Resumes', value: totalResumes, desc: `${processingResumes} processing`, icon: FileSpreadsheet, color: 'text-emerald-400', border: 'border-emerald-500/10' },
    { label: 'Active Jobs', value: totalJobs, desc: 'Across departments', icon: Briefcase, color: 'text-cyan-400', border: 'border-cyan-500/10' },
    { label: 'Registered Models', value: models.length, desc: `${activeModels} active in production`, icon: Cpu, color: 'text-indigo-400', border: 'border-indigo-500/10' },
    { label: 'Experiments Run', value: totalExperiments, desc: 'MLflow runs logged', icon: FlaskConical, color: 'text-violet-400', border: 'border-violet-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/60 to-slate-950/20 backdrop-blur-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Welcome back to Recruiter Console <Sparkles className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-sm text-slate-400">
            Resume parsing pipeline is running. Gateway is active on port 8080.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/resumes">
            <Button size="sm" variant="primary" className="gap-2">
              Upload Resume <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/candidates">
            <Button size="sm" variant="outline">
              Explorer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border ${stat.border} shadow-[0_0_15px_rgba(255,255,255,0.01)]`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-slate-900/60 ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-slate-50 tracking-tight">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">{stat.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Charts & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time gateway CPU load & request rates</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  CPU Load
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  API Requests
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                <Area type="monotone" dataKey="requests" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" name="Req/Sec" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Processing Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Pipelines</CardTitle>
            <CardDescription>Resumes status & queue depth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">FastAPI Workers Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Kafka Topic Queue Depth</span>
                <span className="text-slate-200 font-bold">{processingResumes} files</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">S3 Object Bucket</span>
                <span className="text-slate-200 font-semibold">"resumes"</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Uploads</h4>
              {resumesLoading ? (
                <div className="text-center py-4 text-xs text-slate-500 animate-pulse">Loading queue...</div>
              ) : resumes.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">No resumes uploaded yet</div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {resumes.slice(0, 3).map((resume) => (
                    <div key={resume.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-900 bg-slate-950/20 text-xs">
                      <span className="text-slate-350 truncate max-w-[120px]">{resume.filename}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        resume.status === 'processed' 
                          ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                          : resume.status === 'failed'
                          ? 'bg-red-600/10 text-red-400 border-red-500/15'
                          : 'bg-yellow-600/10 text-yellow-400 border-yellow-500/15 animate-pulse'
                      }`}>
                        {resume.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
