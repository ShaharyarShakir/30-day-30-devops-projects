import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/models')({
  component: ModelsComponent,
});

function ModelsComponent() {
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: api.models.list,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Model Registry</h2>
        <p className="text-xs text-slate-400 mt-1">Review active, staging, and archived parser BERT models</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <Card className="border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Models Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">2</div>
            <p className="text-[10px] text-slate-500 mt-1">Directing live prediction API traffic</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Models in Staging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">1</div>
            <p className="text-[10px] text-slate-500 mt-1">Awaiting verification gating</p>
          </CardContent>
        </Card>
        <Card className="border-indigo-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Avg Inference latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">12ms</div>
            <p className="text-[10px] text-slate-500 mt-1">Across all endpoint calls</p>
          </CardContent>
        </Card>
        <Card className="border-violet-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Global F1 Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-50">94.1%</div>
            <p className="text-[10px] text-slate-500 mt-1">BERT similarity match rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800/60">
        <CardHeader>
          <CardTitle>Registered Models</CardTitle>
          <CardDescription>Metrics comparison and deployment metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>F1 Score</TableHead>
                  <TableHead>Deployed At</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-semibold text-slate-200 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      {model.name}
                    </TableCell>
                    <TableCell className="font-mono text-slate-400">{model.version}</TableCell>
                    <TableCell className="font-mono">{model.accuracy * 100}%</TableCell>
                    <TableCell className="font-mono">{model.precision * 100}%</TableCell>
                    <TableCell className="font-mono">{model.recall * 100}%</TableCell>
                    <TableCell className="font-mono font-bold text-slate-200">{model.f1 * 100}%</TableCell>
                    <TableCell className="text-slate-500">{new Date(model.deployedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                        model.status === 'Active'
                          ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                          : model.status === 'Staging'
                          ? 'bg-cyan-600/10 text-cyan-400 border-cyan-500/15'
                          : 'bg-slate-600/10 text-slate-450 border-slate-500/15'
                      }`}>
                        {model.status === 'Active' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {model.status === 'Staging' && <ShieldCheck className="w-2.5 h-2.5 animate-pulse" />}
                        {model.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
