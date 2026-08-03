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
  source: {
    ticketId: string;
    analysisLabel: string;
    opportunityTitle: string;
  };
  document: PlanDocument;
  tasks: PlanTask[];
  timeline: PlanTimelineItem[];
  comments: PlanComment[];
  attachments: PlanAttachment[];
  copilotInsights: PlanCopilotInsight[];
}
