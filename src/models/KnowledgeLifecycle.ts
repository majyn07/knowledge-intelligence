import type { AnalysisMessage } from "./AnalysisMessage";
import type { AnalysisResult } from "./AnalysisResult";

export type AnalysisStatus = "open" | "in_review" | "completed";
export type OpportunityWorkflowStatus =
  | "proposed"
  | "approved"
  | "discarded"
  | "draft"
  | "deferred";

export interface AnalysisRecord {
  id: string;
  projectId: string;
  ticketId: string;
  status: AnalysisStatus;
  startedAt: string;
  completedAt?: string;
  result: AnalysisResult;
  messages: AnalysisMessage[];
}
