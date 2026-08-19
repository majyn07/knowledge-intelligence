export type PlanStatus = "analysis" | "development" | "review" | "approved" | "published";
export type PlanPriority = "high" | "medium" | "normal";

export interface PlanTask {
  id: string;
  label: string;
  completed: boolean;
  owner: string;
}

export interface PlanTimelineItem {
  id: string;
  label: string;
  date: string;
  completed: boolean;
}

export interface PlanComment {
  id: string;
  author: string;
  message: string;
  date: string;
}

export interface PlanAttachment {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface PlanDocument {
  executiveSummary: string;
  context: string;
  problem: string;
  diagnosis: string;
  evidence: string[];
  decisions: string[];
  proposal: string;
  acceptanceCriteria: string[];
  notes: string;
  references: string[];
}

export interface PlanCopilotInsight {
  title: string;
  description: string;
  type: "suggestion" | "risk" | "duplicate";
}

/** References the decision that originated the plan without copying the analysis. */
export interface PlanSource {
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  articleId?: string;
  analysisLabel: string;
  opportunityTitle: string;
}

export interface PlanWorkspaceItem {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  status: PlanStatus;
  priority: PlanPriority;
  owner: string;
  createdAt: string;
  updatedAt: string;
  source: PlanSource;
  document: PlanDocument;
  tasks: PlanTask[];
  timeline: PlanTimelineItem[];
  comments: PlanComment[];
  attachments: PlanAttachment[];
  copilotInsights: PlanCopilotInsight[];
}
