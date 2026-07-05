import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Job, ResumeMetadata } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Sparkles, 
  Users, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/jobs')({
  component: JobsComponent,
});

function JobsComponent() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Job Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [experience, setExperience] = useState('3');

  // Selected Job for matching
  const [matchingJob, setMatchingJob] = useState<Job | null>(null);

  // Queries
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: api.jobs.list,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.resumes.list,
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: api.jobs.create,
    onSuccess: () => {
      setIsCreateOpen(false);
      setTitle('');
      setDepartment('');
      setSkillsStr('');
      setExperience('3');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: api.jobs.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !department || !skillsStr) return;

    createJobMutation.mutate({
      title,
      department,
      requiredSkills: skillsStr.split(',').map(s => s.trim()).filter(Boolean),
      requiredExperience: parseFloat(experience) || 0,
    });
  };

  // Compute matches for the selected job dynamically based on skills overlap and experience
  const matchedCandidates = React.useMemo(() => {
    if (!matchingJob) return [];

    const jobSkills = matchingJob.requiredSkills.map(s => s.toLowerCase());
    const jobExp = matchingJob.requiredExperience;

    return resumes
      .filter(r => r.status === 'processed' && r.features)
      .map(r => {
        const feats = r.features!;
        const resumeSkills = (feats.skills || []).map(s => s.toLowerCase());
        const resumeExp = feats.experience_years || 0;

        // Calculate overlap score
        let matchedCount = 0;
        jobSkills.forEach(s => {
          if (resumeSkills.includes(s) || resumeSkills.some(rs => rs.includes(s) || s.includes(rs))) {
            matchedCount++;
          }
        });

        const skillMatchFactor = jobSkills.length > 0 ? matchedCount / jobSkills.length : 0;
        
        // Experience matching factor: full score if experience >= required, else ratio
        const expMatchFactor = resumeExp >= jobExp ? 1.0 : (jobExp > 0 ? resumeExp / jobExp : 0);

        // Weighted final match score
        const matchScore = Math.round((skillMatchFactor * 0.7 + expMatchFactor * 0.3) * 100);

        return {
          id: r.id,
          filename: r.filename,
          skills: feats.skills || [],
          experience: resumeExp,
          matchScore: Math.min(matchScore, 100),
          email: `${r.filename.split('_')[0]}@candidate.com`
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [matchingJob, resumes]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-50">Job Requirements</h2>
          <p className="text-xs text-slate-400 mt-1">Configure job descriptors and run automated resume screenings</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Create Job
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          {jobs.length === 0 ? (
            <Card className="border-slate-800/60 p-8 text-center text-slate-500 text-xs">
              No jobs defined yet. Click "Create Job" to set up your first opening.
            </Card>
          ) : (
            jobs.map(job => (
              <Card 
                key={job.id} 
                className={`border-slate-800/60 hover:bg-slate-900/10 cursor-pointer transition-all duration-200 ${
                  matchingJob?.id === job.id ? 'border-emerald-500/30 bg-emerald-950/5 ring-1 ring-emerald-500/10' : ''
                }`}
                onClick={() => setMatchingJob(job)}
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-100">{job.title}</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">{job.department}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 p-1.5 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (matchingJob?.id === job.id) setMatchingJob(null);
                      deleteJobMutation.mutate(job.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-350">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Required Experience: <strong className="text-slate-200">{job.requiredExperience} yrs</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      Match candidates <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Matches Explorer Panel */}
        <div className="lg:col-span-1">
          {matchingJob ? (
            <Card className="border-slate-800/60 h-fit">
              <CardHeader>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Screening matches
                </div>
                <CardTitle className="text-sm">{matchingJob.title}</CardTitle>
                <CardDescription>Matching ranked S3 processed resumes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matchedCandidates.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No candidates processed in database. Upload resumes to compute scores.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {matchedCandidates.map(cand => (
                      <div 
                        key={cand.id} 
                        className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-200 truncate max-w-[130px]">{cand.filename}</p>
                            <p className="text-[10px] text-slate-500">{cand.experience} yrs experience</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            cand.matchScore >= 80 
                              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                              : cand.matchScore >= 50
                              ? 'bg-cyan-600/10 text-cyan-400 border-cyan-500/15'
                              : 'bg-slate-600/10 text-slate-400 border-slate-500/15'
                          }`}>
                            {cand.matchScore}% Match
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-800/60 p-6 flex flex-col items-center justify-center text-center gap-3 h-48 text-slate-500">
              <Users className="w-8 h-8 text-slate-650" />
              <p className="text-xs">Select a job post from the list to rank matching candidate resumes.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Job Dialog Modal */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Post New Job Opening"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-slate-300">
          <Input
            label="Job Title"
            type="text"
            placeholder="e.g. Senior Go Developer"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <Input
            label="Department"
            type="text"
            placeholder="e.g. Tech Core / ML Core"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            required
          />
          <Input
            label="Required Skills (Comma separated)"
            type="text"
            placeholder="e.g. React, TypeScript, Redux, Node.js"
            value={skillsStr}
            onChange={e => setSkillsStr(e.target.value)}
            required
          />
          <Input
            label="Minimum Experience (Years)"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 5"
            value={experience}
            onChange={e => setExperience(e.target.value)}
            required
          />

          <Button type="submit" className="w-full mt-2" isLoading={createJobMutation.isPending}>
            Add Opening
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
