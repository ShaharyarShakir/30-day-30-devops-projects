import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { PlayCircle, Award, Terminal, Clock } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/experiments')({
  component: ExperimentsComponent,
});

function ExperimentsComponent() {
  const { data: runs = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: api.experiments.list,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-50">MLflow Runs</h2>
          <p className="text-xs text-slate-400 mt-1">Audit training logs, loss convergence, and weights parameters from MLflow server</p>
        </div>
        <a href="http://localhost:5000" target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Terminal className="w-3.5 h-3.5" />
            Open MLflow UI
          </Button>
        </a>
      </div>

      <Card className="border-slate-800/60">
        <CardHeader>
          <CardTitle>MLflow Experiments Tracker</CardTitle>
          <CardDescription>Metrics comparison and training hyper-parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.runId}>
                    <TableCell className="font-mono text-indigo-400 font-semibold">{run.runId}</TableCell>
                    <TableCell className="text-slate-200">{run.experimentName}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col gap-0.5 text-[10px] text-slate-450 font-mono">
                        {Object.entries(run.parameters).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-slate-500">{k}:</span> {v}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-[10px] text-slate-250 font-mono">
                        <div><span className="text-slate-500">loss:</span> {run.metrics.loss}</div>
                        <div><span className="text-slate-500">acc:</span> {run.metrics.accuracy}</div>
                        <div><span className="text-slate-500">f1:</span> {run.metrics.f1}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {run.duration}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-550">{new Date(run.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        run.status === 'FINISHED'
                          ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                          : run.status === 'FAILED'
                          ? 'bg-red-600/10 text-red-400 border-red-500/15'
                          : 'bg-yellow-600/10 text-yellow-400 border-yellow-500/15 animate-pulse'
                      }`}>
                        {run.status}
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

// Simple button helper since it's locally needed
import { ButtonProps } from '../../components/ui/Button';
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 px-3 py-1.5 text-xs ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'LocalButton';
export { Button };
