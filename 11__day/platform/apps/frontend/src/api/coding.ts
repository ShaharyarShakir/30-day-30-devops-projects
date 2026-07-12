import { api } from "./client";

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  statement: string;
  constraints?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  createdAt: string;
}

export interface ProblemLanguage {
  problemId: string;
  language: string;
  starterCode?: string;
}

export interface TestCase {
  id: string;
  problemId: string;
  input?: string;
  expectedOutput?: string;
  hidden: boolean;
  weight: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  status: string;
  score?: number;
  runtime?: number;
  memory?: number;
  code: string;
  createdAt: string;
}

export interface SubmissionResult {
  submissionId: string;
  testCaseId: string;
  runtime?: number;
  memory?: number;
  status: string;
  stdout?: string;
  stderr?: string;
  createdAt: string;
}

export interface RunnerOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: number;
  memory: number;
}

export const codingApi = {
  getProblems: async (): Promise<Problem[]> => {
    const res = await api.get<Problem[]>("/coding/problems");
    return res.data;
  },

  getProblemById: async (id: string): Promise<Problem> => {
    const res = await api.get<Problem>(`/coding/problems/${id}`);
    return res.data;
  },

  getProblemLanguages: async (id: string): Promise<ProblemLanguage[]> => {
    const res = await api.get<ProblemLanguage[]>(`/coding/problems/${id}/languages`);
    return res.data;
  },

  getProblemTestCases: async (id: string): Promise<TestCase[]> => {
    const res = await api.get<TestCase[]>(`/coding/problems/${id}/test-cases`);
    return res.data;
  },

  getProblemBySlug: async (slug: string): Promise<Problem> => {
    const res = await api.get<Problem>(`/coding/problems/slug/${slug}`);
    return res.data;
  },

  createProblem: async (data: {
    title: string;
    slug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    statement: string;
    constraints?: string;
    timeLimitMs?: number;
    memoryLimitMb?: number;
  }): Promise<Problem> => {
    const res = await api.post<Problem>("/coding/problems", data);
    return res.data;
  },

  getSubmissions: async (): Promise<Submission[]> => {
    const res = await api.get<Submission[]>("/coding/submissions");
    return res.data;
  },

  getSubmissionById: async (id: string): Promise<Submission> => {
    const res = await api.get<Submission>(`/coding/submissions/${id}`);
    return res.data;
  },

  getSubmissionResults: async (id: string): Promise<SubmissionResult[]> => {
    const res = await api.get<SubmissionResult[]>(`/coding/submissions/${id}/results`);
    return res.data;
  },

  createSubmission: async (data: {
    problemId: string;
    language: string;
    code: string;
  }): Promise<Submission> => {
    const res = await api.post<Submission>("/coding/submissions", data);
    return res.data;
  },

  getSubmissionsByProblem: async (problemId: string): Promise<Submission[]> => {
    const res = await api.get<Submission[]>(
      `/coding/problems/${problemId}/submissions`
    );
    return res.data;
  },
};
