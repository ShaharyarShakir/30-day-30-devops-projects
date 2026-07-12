import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { codingApi, Problem, Submission, ProblemLanguage, SubmissionResult } from "../api/coding";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Loader2, Play, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/coding/$id")({
  component: CodingProblemPage,
});

function CodingProblemPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const { data: problem, isLoading: problemLoading } = useQuery({
    queryKey: ["coding-problem", id],
    queryFn: () => codingApi.getProblemById(id),
  });

  const { data: languages, isLoading: languagesLoading } = useQuery({
    queryKey: ["problem-languages", id],
    queryFn: () => codingApi.getProblemLanguages(id),
    enabled: !!id,
  });

  const { data: latestSubmission, isLoading: submissionLoading } = useQuery({
    queryKey: ["coding-submissions", id],
    queryFn: () => codingApi.getSubmissionsByProblem(id),
    enabled: !!id,
    select: (data) => data[0],
  });

  const { data: submissionResults } = useQuery({
    queryKey: ["submission-results", submissionId],
    queryFn: () => submissionId ? codingApi.getSubmissionResults(submissionId) : Promise.resolve([]),
    enabled: !!submissionId,
  });

  useEffect(() => {
    if (languages && languages.length > 0) {
      const lang = languages.find(l => l.language === language);
      if (lang?.starterCode) {
        setCode(lang.starterCode);
      }
    }
  }, [language, languages]);

  useEffect(() => {
    if (latestSubmission) {
      setCode(latestSubmission.code);
      setLanguage(latestSubmission.language);
    }
  }, [latestSubmission]);

  const submissionMutation = useMutation({
    mutationFn: codingApi.createSubmission,
    onSuccess: (data: Submission) => {
      setStatus(`Submission created! Status: ${data.status}`);
      setSubmissionId(data.id);
      queryClient.invalidateQueries({ queryKey: ["coding-submissions", id] });
    },
    onError: () => {
      setStatus("Error creating submission. Please try again.");
    }
  });

  const handleSubmit = async () => {
    if (!problem) return;

    setOutput("Submitting...");
    setStatus("Executing...");

    submissionMutation.mutate({
      problemId: id,
      language,
      code,
    });
  };

  const handleViewResults = () => {
    if (submissionId) {
      navigate({ to: "/coding/$id/submissions/$submissionId", params: { id, submissionId } });
    }
  };

  if (problemLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Problem Description */}
      <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">{problem?.title}</h1>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              problem?.difficulty === "EASY"
                ? "bg-green-900/30 text-green-400"
                : problem?.difficulty === "MEDIUM"
                ? "bg-yellow-900/30 text-yellow-400"
                : "bg-red-900/30 text-red-400"
            }`}
          >
            {problem?.difficulty}
          </span>
        </div>
        {problem?.constraints && (
          <div className="mb-4 p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Constraints</h3>
            <p className="text-slate-300 whitespace-pre-wrap">{problem.constraints}</p>
          </div>
        )}
        <div className="text-slate-300 whitespace-pre-wrap">
          {problem?.statement}
        </div>
      </div>

      {/* Editor & Output */}
      <div className="w-1/2 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="kotlin">Kotlin</option>
            </select>
            {latestSubmission && latestSubmission.language === language && (
              <Button
                variant="secondary"
                onClick={() => setCode(latestSubmission.code)}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {submissionId && (
              <Button
                variant="secondary"
                onClick={handleViewResults}
              >
                View Results
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              isLoading={submissionMutation.isPending}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Submit
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>

        {/* Output */}
        <div className="h-48 bg-slate-950 border-t border-slate-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">Output</h3>
          {status && (
            <div className="mb-2 text-sm text-violet-400">{status}</div>
          )}
          {output && (
            <pre className="text-sm text-slate-300 whitespace-pre-wrap">
              {output}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
