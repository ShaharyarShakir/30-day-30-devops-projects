import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Database, FileCode, CheckCircle2, RefreshCw } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/datasets')({
  component: DatasetsComponent,
});

function DatasetsComponent() {
  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: api.datasets.list,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">DVC Datasets</h2>
        <p className="text-xs text-slate-400 mt-1">Audit training, testing, and raw dataset versions track by Data Version Control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {datasets.map((dataset, idx) => (
          <Card key={idx} className="border-slate-800/60 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">{dataset.version}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  dataset.status === 'Synced'
                    ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                    : 'bg-yellow-600/10 text-yellow-400 border-yellow-500/15 animate-pulse'
                }`}>
                  {dataset.status === 'Synced' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                  {dataset.status}
                </span>
              </div>
              <CardTitle className="text-sm mt-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-450" />
                Resume Classifier Dataset
              </CardTitle>
              <CardDescription className="text-[11px] leading-relaxed pt-1.5 min-h-[55px]">
                {dataset.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 border-t border-slate-900 bg-slate-950/20 flex items-center justify-between text-[11px] text-slate-400">
              <span>Size: <strong className="text-slate-350">{dataset.size}</strong></span>
              <span>Created: <strong className="text-slate-350">{dataset.createdDate}</strong></span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
