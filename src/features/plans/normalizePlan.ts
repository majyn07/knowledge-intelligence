import { flag, items, oneOf, record, text, textList } from "@/lib/shape";
import type { PlanPriority, PlanStatus, PlanWorkspaceItem } from "./types/PlanWorkspace";

const STATUSES: readonly PlanStatus[] = [
  "analysis",
  "development",
  "review",
  "approved",
  "published",
];
const PRIORITIES: readonly PlanPriority[] = ["high", "medium", "normal"];

/** Garante a forma do plano vinda do armazenamento, incluindo o documento. */
export function normalizePlan(raw: unknown): PlanWorkspaceItem {
  const value = record(raw);
  const source = record(value.source);
  const document = record(value.document);

  return {
    id: text(value.id) || crypto.randomUUID(),
    title: text(value.title),
    projectName: text(value.projectName),
    projectId: text(value.projectId),
    status: oneOf(value.status, STATUSES, "analysis"),
    priority: oneOf(value.priority, PRIORITIES, "normal"),
    owner: text(value.owner),
    ...(text(value.dueDate) ? { dueDate: text(value.dueDate) } : {}),
    createdAt: text(value.createdAt),
    updatedAt: text(value.updatedAt),
    source: {
      projectId: text(source.projectId),
      ticketId: text(source.ticketId),
      analysisId: text(source.analysisId),
      opportunityId: text(source.opportunityId),
      analysisLabel: text(source.analysisLabel),
      opportunityTitle: text(source.opportunityTitle),
      ...(text(source.articleId) ? { articleId: text(source.articleId) } : {}),
    },
    document: {
      executiveSummary: text(document.executiveSummary),
      context: text(document.context),
      problem: text(document.problem),
      diagnosis: text(document.diagnosis),
      evidence: textList(document.evidence),
      decisions: textList(document.decisions),
      proposal: text(document.proposal),
      acceptanceCriteria: textList(document.acceptanceCriteria),
      notes: text(document.notes),
      references: textList(document.references),
    },
    tasks: items(value.tasks).map((entry) => {
      const task = record(entry);
      return {
        id: text(task.id) || crypto.randomUUID(),
        label: text(task.label),
        completed: flag(task.completed),
        owner: text(task.owner),
        ...(text(task.dueDate) ? { dueDate: text(task.dueDate) } : {}),
      };
    }),
    comments: items(value.comments).map((entry) => {
      const comment = record(entry);
      return {
        id: text(comment.id) || crypto.randomUUID(),
        author: text(comment.author),
        message: text(comment.message),
        date: text(comment.date),
      };
    }),
    // Ausente é "em uso": registro gravado antes da lixeira existir.
    ...(text(value.deletedAt) ? { deletedAt: text(value.deletedAt) } : {}),
  };
}

export function parsePlans(raw: string): PlanWorkspaceItem[] {
  return items(JSON.parse(raw)).map(normalizePlan);
}
