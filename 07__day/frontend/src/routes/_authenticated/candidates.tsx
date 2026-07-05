import React, { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api, ResumeMetadata } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel, 
  getPaginationRowModel,
  ColumnDef, 
  flexRender,
  SortingState
} from '@tanstack/react-table';
import { 
  Search, 
  SlidersHorizontal, 
  Eye, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  BookOpen
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/candidates')({
  component: CandidatesComponent,
});

interface CandidateRow {
  id: string;
  name: string;
  skills: string[];
  experience: number;
  score: number;
  status: string;
  matchPercent: number;
  email: string;
}

// Static mock candidates to combine with uploaded S3 resumes
const baseMockCandidates: CandidateRow[] = [
  { id: 'cand-1', name: 'Alexander Wright', skills: ['React', 'TypeScript', 'Tailwind CSS', 'Redux', 'Jest'], experience: 6, score: 8.5, status: 'Shortlisted', matchPercent: 92, email: 'alex.wright@devmail.net' },
  { id: 'cand-2', name: 'Elena Rostova', skills: ['Go', 'gRPC', 'Kafka', 'PostgreSQL', 'Docker', 'Kubernetes'], experience: 5, score: 7.9, status: 'Interviewing', matchPercent: 88, email: 'elena.rost@techcloud.io' },
  { id: 'cand-3', name: 'Marcus Vance', skills: ['Python', 'FastAPI', 'MLflow', 'PyTorch', 'SQLModel'], experience: 7, score: 9.1, status: 'Offered', matchPercent: 96, email: 'marcus.vance@aimind.org' },
  { id: 'cand-4', name: 'Sarah Jenkins', skills: ['React', 'Node.js', 'Express', 'MongoDB', 'AWS'], experience: 4, score: 6.8, status: 'Applied', matchPercent: 74, email: 'sjenkins@webdev.com' },
  { id: 'cand-5', name: 'Tariq Al-Mansoor', skills: ['Java', 'Spring Boot', 'MySQL', 'Kafka', 'Jenkins'], experience: 8, score: 7.2, status: 'Applied', matchPercent: 80, email: 'tariq.am@banknet.ae' }
];

function CandidatesComponent() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);

  // Load actual S3 resumes to merge into candidate database
  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.resumes.list,
  });

  // Merge S3 resumes with mock profiles
  const tableData = useMemo(() => {
    const s3Candidates: CandidateRow[] = resumes
      .filter(r => r.status === 'processed' && r.features)
      .map(r => {
        const feats = r.features!;
        return {
          id: `s3-${r.id}`,
          name: r.filename.replace('.pdf', '').split('_').slice(1).join(' ') || r.filename,
          skills: feats.skills || [],
          experience: feats.experience_years || 0,
          score: Math.round(((feats.experience_years || 0) * 0.8 + 5) * 10) / 10,
          status: 'Applied',
          matchPercent: Math.round(75 + Math.random() * 20), // Simulated dynamic match score
          email: `${r.filename.split('_')[0]}@candidate.com`,
        };
      });

    return [...s3Candidates, ...baseMockCandidates];
  }, [resumes]);

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<CandidateRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: info => (
        <div className="font-semibold text-slate-100">
          {info.getValue<string>()}
          <div className="text-[10px] text-slate-500 font-normal">{info.row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'skills',
      header: 'Skills',
      cell: info => {
        const skills = info.getValue<string[]>();
        return (
          <div className="flex flex-wrap gap-1 max-w-[280px]">
            {skills.slice(0, 3).map((skill, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-350">
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-500">
                +{skills.length - 3} more
              </span>
            )}
          </div>
        );
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: 'experience',
      header: 'Experience',
      cell: info => <span className="font-mono">{info.getValue<number>()} yrs</span>,
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: info => (
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono font-bold">
          {info.getValue<number>()}/10
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue<string>();
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
            status === 'Shortlisted' || status === 'Offered'
              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
              : status === 'Interviewing'
              ? 'bg-cyan-600/10 text-cyan-400 border-cyan-500/15'
              : 'bg-slate-600/10 text-slate-400 border-slate-500/15'
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'matchPercent',
      header: 'Match %',
      cell: info => (
        <span className="text-emerald-400 font-extrabold font-mono">
          {info.getValue<number>()}%
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: info => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-auto text-slate-400 hover:text-slate-200"
            onClick={() => setSelectedCandidate(info.row.original)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  // Initialize TanStack Table Hook
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Candidate Explorer</h2>
        <p className="text-xs text-slate-400 mt-1">Cross-reference candidate matches, experience, and score metrics</p>
      </div>

      <Card className="border-slate-800/60">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Candidates Database</CardTitle>
              <CardDescription>Search and filter profiles</CardDescription>
            </div>
            
            {/* Table Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Filter by name, skill..."
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="pl-9 py-1.5 h-auto w-full text-xs"
                />
              </div>

              {/* Column Visibility Toggles */}
              <div className="relative">
                <Select
                  options={[
                    { value: 'all', label: 'All Columns' },
                    { value: 'skills', label: 'Hide Skills' },
                    { value: 'score', label: 'Hide Score' },
                  ]}
                  value="all"
                  onChange={e => {
                    if (e.target.value === 'skills') {
                      table.getColumn('skills')?.toggleVisibility(false);
                    } else if (e.target.value === 'score') {
                      table.getColumn('score')?.toggleVisibility(false);
                    } else {
                      table.toggleAllColumnsVisible(true);
                    }
                  }}
                  className="py-1.5 h-auto text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-slate-850 bg-slate-950/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-slate-900/30 border-b border-slate-850">
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="py-3 px-4 text-slate-400 font-semibold uppercase tracking-wider select-none cursor-pointer"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            {
                              asc: <ChevronUp className="w-3 h-3" />,
                              desc: <ChevronDown className="w-3 h-3" />,
                            }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-900/20 transition-colors text-slate-350">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-3.5 px-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500">
              Showing page{' '}
              <strong className="text-slate-350">
                {table.getState().pagination.pageIndex + 1}
              </strong>{' '}
              of <strong className="text-slate-350">{table.getPageCount()}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Profile Details Dialog */}
      <Dialog
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Profile Sheet"
      >
        {selectedCandidate && (
          <div className="space-y-6 text-xs text-slate-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold">
                {selectedCandidate.name[0]}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-50">{selectedCandidate.name}</h3>
                <p className="text-slate-400">{selectedCandidate.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/30">
                <p className="text-slate-500">Resume Match Score</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-1">{selectedCandidate.matchPercent}%</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/30">
                <p className="text-slate-500">Parsed Experience</p>
                <p className="text-lg font-bold text-slate-200 mt-1">{selectedCandidate.experience} Years</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Identified Technical Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedCandidate.skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-800/80 bg-slate-900/10 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-400">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="font-semibold">Recruiter Notes</span>
              </div>
              <p className="text-slate-450 leading-relaxed">
                Candidate presents matching qualifications for Core Backend and Devops positions. Pipeline parsing engine scores skills extraction accuracy as high. Recommend setting up preliminary assessment.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
