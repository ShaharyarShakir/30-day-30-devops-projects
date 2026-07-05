// HTTP client using native fetch for the API Gateway on port 8080.
// Integrates with real backend endpoints for auth, resume upload, and predictions.
// Mocks list and analytics endpoints that aren't implemented in the backend, 
// using localStorage to persist state between page reloads.

export interface UserProfile {
  id: number;
  email: string;
  created_at: string;
}

export interface ResumeMetadata {
  id: number;
  user_id: number;
  filename: string;
  object_key: string;
  status: string;
  error_message?: string;
  created_at: string;
  features?: {
    skills: string[];
    experience_years: number;
    education: Record<string, any>;
  };
}

export interface SimilarCandidate {
  resume_id: number;
  filename: string;
  skills: string[];
  experience_years: number;
  score: number;
}

export interface MatchResponse {
  resume_id: number;
  filename: string;
  features: {
    skills: string[];
    experience_years: number;
    education: any;
  };
  similar_candidates: SimilarCandidate[];
  status?: string;
  message?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  requiredSkills: string[];
  requiredExperience: number;
  status: 'Open' | 'Closed';
  createdAt: string;
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  status: 'Active' | 'Staging' | 'Archived';
  deployedAt: string;
}

export interface MLRun {
  runId: string;
  experimentName: string;
  parameters: Record<string, string>;
  metrics: {
    loss: number;
    accuracy: number;
    f1: number;
  };
  duration: string;
  status: 'FINISHED' | 'FAILED' | 'RUNNING';
  createdAt: string;
}

export interface DVCDataset {
  version: string;
  size: string;
  createdDate: string;
  status: 'Synced' | 'Processing' | 'Failed';
  description: string;
}

// Retrieve JWT token
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function removeToken() {
  localStorage.removeItem('auth_token');
}

// Global state trackers in localStorage
function getLocalResumesIndex(): number[] {
  const index = localStorage.getItem('local_resumes_index');
  return index ? JSON.parse(index) : [];
}

function addToLocalResumesIndex(id: number) {
  const index = getLocalResumesIndex();
  if (!index.includes(id)) {
    index.push(id);
    localStorage.setItem('local_resumes_index', JSON.stringify(index));
  }
}

function removeFromLocalResumesIndex(id: number) {
  const index = getLocalResumesIndex();
  const nextIndex = index.filter(x => x !== id);
  localStorage.setItem('local_resumes_index', JSON.stringify(nextIndex));
}

// API Helper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(path, { ...options, headers });
  
  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || data.detail || errorMsg;
    } catch (_) {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<string> => {
      const data = await request<{ token: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      return data.token;
    },
    register: async (email: string, password: string): Promise<UserProfile> => {
      return request<UserProfile>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    },
    profile: async (): Promise<UserProfile> => {
      return request<UserProfile>('/api/auth/profile');
    },
  },
  
  resumes: {
    upload: async (file: File): Promise<ResumeMetadata> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await request<ResumeMetadata>('/api/resumes', {
        method: 'POST',
        body: formData, // fetch will set content-type multipart/form-data automatically
      });
      
      // Save ID to local index
      addToLocalResumesIndex(data.id);
      return data;
    },
    
    get: async (id: number): Promise<ResumeMetadata> => {
      return request<ResumeMetadata>(`/api/resumes/${id}`);
    },
    
    delete: async (id: number): Promise<void> => {
      await request<void>(`/api/resumes/${id}`, {
        method: 'DELETE',
      });
      removeFromLocalResumesIndex(id);
    },
    
    list: async (): Promise<ResumeMetadata[]> => {
      const ids = getLocalResumesIndex();
      const list: ResumeMetadata[] = [];
      
      // Attempt to load metadata for each local resume ID
      for (const id of ids) {
        try {
          const res = await request<ResumeMetadata>(`/api/resumes/${id}`);
          list.push(res);
        } catch (e) {
          // If a resume was deleted or isn't accessible, clean it from local index
          console.warn(`Could not load resume ID ${id}:`, e);
        }
      }
      return list;
    },
  },
  
  ml: {
    predict: async (resumeId: number): Promise<MatchResponse> => {
      return request<MatchResponse>('/api/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId }),
      });
    },
  },
  
  // --- Pure Mocks (Persisted in localStorage for high-fidelity interactive flow) ---
  jobs: {
    list: async (): Promise<Job[]> => {
      const stored = localStorage.getItem('mock_jobs');
      if (!stored) {
        const initialJobs: Job[] = [
          {
            id: 'job-1',
            title: 'Senior Frontend Engineer (React/TS)',
            department: 'Product Development',
            requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'TanStack Query'],
            requiredExperience: 5,
            status: 'Open',
            createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          },
          {
            id: 'job-2',
            title: 'Lead ML Platform Engineer',
            department: 'Machine Learning',
            requiredSkills: ['Python', 'FastAPI', 'MLflow', 'Docker', 'Kubernetes'],
            requiredExperience: 8,
            status: 'Open',
            createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          },
          {
            id: 'job-3',
            title: 'Backend Go Microservices Developer',
            department: 'Core Infrastructure',
            requiredSkills: ['Go', 'gRPC', 'Kafka', 'PostgreSQL', 'Redis'],
            requiredExperience: 4,
            status: 'Open',
            createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          }
        ];
        localStorage.setItem('mock_jobs', JSON.stringify(initialJobs));
        return initialJobs;
      }
      return JSON.parse(stored);
    },
    
    create: async (job: Omit<Job, 'id' | 'createdAt' | 'status'>): Promise<Job> => {
      const list = await api.jobs.list();
      const newJob: Job = {
        ...job,
        id: `job-${Date.now()}`,
        status: 'Open',
        createdAt: new Date().toISOString(),
      };
      list.unshift(newJob);
      localStorage.setItem('mock_jobs', JSON.stringify(list));
      return newJob;
    },
    
    delete: async (id: string): Promise<void> => {
      const list = (await api.jobs.list()).filter(job => job.id !== id);
      localStorage.setItem('mock_jobs', JSON.stringify(list));
    }
  },
  
  models: {
    list: (): MLModel[] => {
      return [
        { id: 'm-1', name: 'ResumeMatcherBert', version: 'v2.1.0', accuracy: 0.942, precision: 0.935, recall: 0.948, f1: 0.941, status: 'Active', deployedAt: '2026-07-01T12:00:00Z' },
        { id: 'm-2', name: 'ResumeMatcherBert', version: 'v2.0.0', accuracy: 0.918, precision: 0.910, recall: 0.925, f1: 0.917, status: 'Archived', deployedAt: '2026-05-15T09:30:00Z' },
        { id: 'm-3', name: 'SkillExtractorParser', version: 'v1.4.2', accuracy: 0.887, precision: 0.892, recall: 0.880, f1: 0.886, status: 'Active', deployedAt: '2026-06-20T15:45:00Z' },
        { id: 'm-4', name: 'ExperienceRanker', version: 'v0.9.1-beta', accuracy: 0.921, precision: 0.915, recall: 0.928, f1: 0.921, status: 'Staging', deployedAt: '2026-07-04T18:10:00Z' },
      ];
    }
  },
  
  experiments: {
    list: (): MLRun[] => {
      return [
        {
          runId: 'run-8f3a92b',
          experimentName: 'bert-resume-similarity',
          parameters: { 'epochs': '15', 'batch_size': '32', 'learning_rate': '2e-5', 'encoder': 'distilbert-base-uncased' },
          metrics: { 'loss': 0.124, 'accuracy': 0.942, 'f1': 0.941 },
          duration: '42m 12s',
          status: 'FINISHED',
          createdAt: '2026-07-04T15:20:00Z',
        },
        {
          runId: 'run-2c9e10a',
          experimentName: 'bert-resume-similarity',
          parameters: { 'epochs': '10', 'batch_size': '32', 'learning_rate': '3e-5', 'encoder': 'distilbert-base-uncased' },
          metrics: { 'loss': 0.185, 'accuracy': 0.918, 'f1': 0.917 },
          duration: '31m 45s',
          status: 'FINISHED',
          createdAt: '2026-07-04T11:00:00Z',
        },
        {
          runId: 'run-7d4f66c',
          experimentName: 'bert-resume-similarity',
          parameters: { 'epochs': '20', 'batch_size': '16', 'learning_rate': '1e-5', 'encoder': 'bert-base-uncased' },
          metrics: { 'loss': 0.089, 'accuracy': 0.957, 'f1': 0.956 },
          duration: '1h 24m',
          status: 'FINISHED', // but maybe not active yet
          createdAt: '2026-07-05T01:30:00Z',
        },
        {
          runId: 'run-3a2d1e5',
          experimentName: 'parser-ner-extraction',
          parameters: { 'ner_architecture': 'spacy-transformer', 'fine_tune': 'true' },
          metrics: { 'loss': 0.231, 'accuracy': 0.887, 'f1': 0.886 },
          duration: '18m 50s',
          status: 'FINISHED',
          createdAt: '2026-07-03T16:40:00Z',
        },
        {
          runId: 'run-failed-5b',
          experimentName: 'parser-ner-extraction',
          parameters: { 'ner_architecture': 'lstm-crf', 'hidden_dim': '256' },
          metrics: { 'loss': 0.892, 'accuracy': 0.451, 'f1': 0.380 },
          duration: '4m 12s',
          status: 'FAILED',
          createdAt: '2026-07-03T14:10:00Z',
        }
      ];
    }
  },
  
  datasets: {
    list: (): DVCDataset[] => {
      return [
        { version: 'dvc-v3.0', size: '1.2 GB', createdDate: '2026-07-02', status: 'Synced', description: 'Curated dataset containing 12,000 parsed IT/Software Engineering resumes labeled with categories.' },
        { version: 'dvc-v2.1', size: '840 MB', createdDate: '2026-05-10', status: 'Synced', description: 'Historical resumes dataset covering Finance, Marketing, and Sales profiles.' },
        { version: 'dvc-v4.0-raw', size: '3.4 GB', createdDate: '2026-07-05', status: 'Processing', description: 'Raw scraped job description and resume pairs from public sites. Processing extraction and cleaning.' }
      ];
    }
  }
};
