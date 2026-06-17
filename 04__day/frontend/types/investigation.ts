export interface Diagnosis {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  prevention: string;
  confidence: number;
}

export interface ProgressEvent {
  type: "progress";
  step: string;
  status: "in_progress" | "completed";
}

export interface ResultEvent {
  type: "result";
  investigation: unknown;
  diagnosis: Diagnosis | null;
}

export type InvestigationEvent = ProgressEvent | ResultEvent;

export interface InvestigationHistoryItem {
  id: string;
  timestamp: string;
  root_cause: string;
  namespace?: string;
  confidence: number;
  status: string;
  explanation?: string;
  fix?: string;
  kubectl_command?: string;
  prevention?: string;
}

