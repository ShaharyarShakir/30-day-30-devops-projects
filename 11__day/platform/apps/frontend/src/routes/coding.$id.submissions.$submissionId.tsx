import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { codingApi, Submission, SubmissionResult, TestCase } from "../api/coding";

export const Route = createFileRoute("/coding/$id/submissions/$submissionId")({
  component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
  const { id, submissionId } = Route.useParams();
  const navigate = useNavigate();

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => codingApi.getSubmissionById(submissionId),
  });

  const { data: testCases, isLoading: testCasesLoading } = useQuery({
    queryKey: ["problemTestCases", id],
    queryFn: () => codingApi.getProblemTestCases(id),
  });

  const { data: submissionResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["submissionResults", submissionId],
    queryFn: () => codingApi.getSubmissionResults(submissionId),
  });

  if (submissionLoading || testCasesLoading || resultsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Submission Not Found</h2>
        <button
          onClick={() => navigate({ to: "/coding" })}
          className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-semibold"
        >
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Submission Details</h1>
        <button
          onClick={() => navigate({ to: "/coding/$id", params: { id } })}
          className="px-6 py-2 border border-slate-600 hover:bg-slate-800 rounded-lg text-white font-semibold"
        >
          Back to Problem
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Status</p>
            <p className={`text-xl font-bold ${
              submission.status === "Accepted" ? "text-green-400" : "text-rose-400"
            }`}>
              {submission.status}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Score</p>
            <p className="text-xl font-bold text-white">{submission.score || 0}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Language</p>
            <p className="text-xl font-bold text-white">{submission.language}</p>
          </div>
        </div>
        {(submission.runtime !== undefined || submission.memory !== undefined) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submission.runtime !== undefined && (
              <div>
                <p className="text-sm text-slate-400 mb-1">Runtime</p>
                <p className="text-xl font-bold text-white">{submission.runtime} ms</p>
              </div>
            )}
            {submission.memory !== undefined && (
              <div>
                <p className="text-sm text-slate-400 mb-1">Memory</p>
                <p className="text-xl font-bold text-white">{submission.memory} MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Code</h3>
        <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm text-slate-300">
          <code>{submission.code}</code>
        </pre>
      </div>

      {submissionResults && testCases && (
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Test Cases</h3>
          <div className="space-y-4">
            {submissionResults.map((result) => {
              const testCase = testCases.find(tc => tc.id === result.testCaseId);
              return (
                <div
                  key={result.testCaseId}
                  className="border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          result.status === "Accepted" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <p className="text-white font-semibold">
                        {testCase && !testCase.hidden ? "Test Case" : "Hidden Test Case"}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${
                      result.status === "Accepted" ? "text-green-400" : "text-red-400"
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  {testCase && !testCase.hidden && (
                    <>
                      {testCase.input !== undefined && (
                        <div className="mb-2">
                          <p className="text-xs text-slate-400 mb-1">Input</p>
                          <pre className="bg-slate-900 rounded p-2 text-sm text-slate-300">
                            {testCase.input}
                          </pre>
                        </div>
                      )}
                      {result.stdout !== undefined && (
                        <div className="mb-2">
                          <p className="text-xs text-slate-400 mb-1">Your Output</p>
                          <pre className="bg-slate-900 rounded p-2 text-sm text-slate-300">
                            {result.stdout}
                          </pre>
                        </div>
                      )}
                      {testCase.expectedOutput !== undefined && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Expected Output</p>
                          <pre className="bg-slate-900 rounded p-2 text-sm text-slate-300">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                  {result.stderr !== undefined && result.stderr !== "" && (
                    <div className="mt-2">
                      <p className="text-xs text-rose-400 mb-1">Stderr</p>
                      <pre className="bg-rose-950 rounded p-2 text-sm text-rose-200">
                        {result.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
