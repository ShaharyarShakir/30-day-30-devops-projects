import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { codingApi, Problem } from "../api/coding";
import { Card } from "../components/ui/Card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/coding")({
  component: CodingProblemsPage,
});

function CodingProblemsPage() {
  const navigate = useNavigate();

  const { data: problems, isLoading } = useQuery({
    queryKey: ["coding-problems"],
    queryFn: codingApi.getProblems,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8 text-white">Coding Problems</h1>
      <div className="grid gap-6">
        {problems?.map((problem: Problem) => (
          <Card
            key={problem.id}
            onClick={() =>
              navigate({ to: "/coding/$id", params: { id: problem.id } })
            }
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {problem.title}
                </h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    problem.difficulty === "EASY"
                      ? "bg-green-900/30 text-green-400"
                      : problem.difficulty === "MEDIUM"
                      ? "bg-yellow-900/30 text-yellow-400"
                      : "bg-red-900/30 text-red-400"
                  }`}
                >
                  {problem.difficulty}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
