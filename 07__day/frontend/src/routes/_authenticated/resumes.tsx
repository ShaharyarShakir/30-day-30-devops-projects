import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ResumeMetadata, MatchResponse } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Eye, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/resumes')({
  component: ResumesComponent,
});

function ResumesComponent() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [detailResume, setDetailResume] = useState<ResumeMetadata | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch list of resumes
  const { data: resumes = [], isLoading: listLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.resumes.list,
  });

  // Polling for processing/uploaded resumes
  useEffect(() => {
    const hasUnprocessed = resumes.some(r => r.status === 'uploaded' || r.status === 'processing');
    if (hasUnprocessed) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['resumes'] });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [resumes, queryClient]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: api.resumes.upload,
    onSuccess: () => {
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: (err: any) => {
      alert(`Upload failed: ${err.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: api.resumes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
    onError: (err: any) => {
      alert(`Delete failed: ${err.message}`);
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        alert('Only PDF resumes are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        alert('Only PDF resumes are supported.');
      }
    }
  };

  const handleUploadSubmit = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleViewDetails = async (resume: ResumeMetadata) => {
    setMatchResult(null);
    setMatchError(null);
    try {
      const detailed = await api.resumes.get(resume.id);
      setDetailResume(detailed);
    } catch (e: any) {
      alert(`Failed to load details: ${e.message}`);
    }
  };

  const handleTriggerMatch = async (resumeId: number) => {
    setIsMatching(true);
    setMatchError(null);
    setMatchResult(null);
    try {
      const res = await api.ml.predict(resumeId);
      if (res.status === 'processing') {
        setMatchError('Resume processing is in progress. Please wait and try again.');
      } else {
        setMatchResult(res);
      }
    } catch (e: any) {
      setMatchError(e.message || 'Matching failed');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Resume Pipeline</h2>
        <p className="text-xs text-slate-400 mt-1">Upload and manage parsed resumes stored on S3 storage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Container */}
        <Card className="lg:col-span-1 border-slate-800/60 h-fit">
          <CardHeader>
            <CardTitle>Upload PDF Resume</CardTitle>
            <CardDescription>Drag and drop or select files to parse metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-55/5 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-xs text-slate-350 text-center">
                Drag & drop candidate resume (PDF only) or{' '}
                <span className="text-emerald-400 font-semibold">browse files</span>
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 truncate">{selectedFile.name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleUploadSubmit}
                  isLoading={uploadMutation.isPending}
                >
                  Parse
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumes List Table */}
        <Card className="lg:col-span-2 border-slate-800/60">
          <CardHeader>
            <CardTitle>Uploaded Resumes</CardTitle>
            <CardDescription>Track processing and extraction queues</CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-center py-12 text-slate-500 text-xs animate-pulse">Loading resumes index...</div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No resumes uploaded. Please use the upload panel.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-400 font-medium">
                      <th className="py-3 px-2">Filename</th>
                      <th className="py-3 px-2">Uploaded At</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/50">
                    {resumes.map(resume => (
                      <tr key={resume.id} className="hover:bg-slate-900/20 text-slate-300">
                        <td className="py-3.5 px-2 font-medium flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-[240px]">{resume.filename}</span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-500">
                          {new Date(resume.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            resume.status === 'processed'
                              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                              : resume.status === 'failed'
                              ? 'bg-red-600/10 text-red-400 border-red-500/15'
                              : 'bg-yellow-600/10 text-yellow-400 border-yellow-500/15'
                          }`}>
                            {(resume.status === 'uploaded' || resume.status === 'processing') && (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            )}
                            {resume.status === 'processed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {resume.status === 'failed' && <AlertCircle className="w-2.5 h-2.5" />}
                            {resume.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right space-x-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1.5 h-auto text-slate-400 hover:text-slate-200"
                            onClick={() => handleViewDetails(resume)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1.5 h-auto text-red-400 hover:text-red-300"
                            onClick={() => deleteMutation.mutate(resume.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resume Details Modal */}
      <Dialog
        isOpen={!!detailResume}
        onClose={() => {
          setDetailResume(null);
          setMatchResult(null);
          setMatchError(null);
        }}
        title="Resume Metadata Overview"
      >
        {detailResume && (
          <div className="space-y-6 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400">Filename</p>
                <p className="font-semibold text-slate-100">{detailResume.filename}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                detailResume.status === 'processed'
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/15'
                  : detailResume.status === 'failed'
                  ? 'bg-red-600/10 text-red-400 border-red-500/15'
                  : 'bg-yellow-600/10 text-yellow-400 border-yellow-500/15 animate-pulse'
              }`}>
                {detailResume.status}
              </span>
            </div>

            {/* Extracted features */}
            {detailResume.features ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                    <p className="text-slate-400">Experience Years</p>
                    <p className="text-lg font-bold text-slate-50 mt-1">
                      {detailResume.features.experience_years !== null ? `${detailResume.features.experience_years} yrs` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                    <p className="text-slate-400">Education Details</p>
                    <p className="text-sm font-semibold text-slate-50 mt-1 truncate">
                      {detailResume.features.education?.degree || 'N/A'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {detailResume.features.education?.institution || ''}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                  <p className="text-slate-400 mb-1.5">Extracted Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailResume.features.skills && detailResume.features.skills.length > 0 ? (
                      detailResume.features.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">No skills identified.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : detailResume.status === 'failed' ? (
              <div className="p-4 border border-red-500/20 bg-red-950/20 text-red-400 rounded-lg">
                <p className="font-semibold">Pipeline Failure</p>
                <p className="mt-1">{detailResume.error_message || 'Unexpected parsing engine exception.'}</p>
              </div>
            ) : (
              <div className="p-4 border border-yellow-500/20 bg-yellow-950/20 text-yellow-400 rounded-lg flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin shrink-0" />
                <span>Extracted features are not available yet. File is still in parsing queue.</span>
              </div>
            )}

            {/* Run Similarity Match */}
            {detailResume.status === 'processed' && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-200">Similarity Ranking</h3>
                    <p className="text-[10px] text-slate-500">Run BERT vectors similarity matches against candidates database</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => handleTriggerMatch(detailResume.id)}
                    isLoading={isMatching}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Match
                  </Button>
                </div>

                {matchError && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-lg">
                    {matchError}
                  </div>
                )}

                {matchResult && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Top Similar Candidates</h4>
                    <div className="space-y-1.5">
                      {matchResult.similar_candidates && matchResult.similar_candidates.length > 0 ? (
                        matchResult.similar_candidates.map((cand, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 text-xs">
                            <span className="text-slate-200 font-medium truncate max-w-[160px]">{cand.filename}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400 font-mono text-[10px]">{cand.experience_years} yrs exp</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                {Math.round(cand.score * 100)}% Match
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-2 text-slate-500">No matching candidates indexed</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
