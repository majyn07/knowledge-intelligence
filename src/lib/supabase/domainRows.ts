import { normalizeEvent } from "@/features/activities/normalizeEvent";
import { normalizeAnalysis } from "@/features/analysis/normalizeAnalysis";
import { normalizeConversation, normalizeTicket } from "@/features/analysis/normalizeSupport";
import { normalizePlan } from "@/features/plans/normalizePlan";
import { normalizeProject } from "@/features/projects/normalizeProject";
import { record } from "@/lib/shape";
import type { ActivityEvent } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { Project } from "@/models/Project";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

/**
 * Linha do banco ↔ modelo do domínio.
 *
 * A conversão é só de nome de campo: o banco usa `snake_case` e o modelo
 * `camelCase`. Toda a garantia de forma continua nos normalizadores das
 * features — eles são a mesma defesa que valia para o `localStorage`, e não
 * deixam de valer porque o dado passou a vir da rede.
 */

/* ---------- Projeto ---------- */

export function toProject(raw: unknown): Project {
  const row = record(raw);

  return normalizeProject({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    product: row.product,
    module: row.module,
    goal: row.goal,
    owner: row.owner,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

export function fromProject(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    product: project.product,
    module: project.module,
    goal: project.goal,
    owner: project.owner,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    deleted_at: project.deletedAt || null,
  };
}

/* ---------- Atendimento ---------- */

export function toTicket(raw: unknown): Ticket {
  const row = record(raw);

  return normalizeTicket({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    solution: row.solution,
    company: row.company,
    date: row.occurred_on,
    source: row.source,
    deletedAt: row.deleted_at,
  });
}

export function fromTicket(ticket: Ticket): Record<string, unknown> {
  return {
    id: ticket.id,
    project_id: ticket.projectId,
    title: ticket.title,
    solution: ticket.solution,
    company: ticket.company,
    occurred_on: ticket.date,
    source: ticket.source ?? null,
    deleted_at: ticket.deletedAt || null,
  };
}

/* ---------- Conversa ---------- */

export function toConversation(raw: unknown): SupportConversation {
  const row = record(raw);

  return normalizeConversation({
    id: row.id,
    ticketId: row.ticket_id,
    messages: row.messages,
    source: row.source,
  });
}

export function fromConversation(conversation: SupportConversation): Record<string, unknown> {
  return {
    id: conversation.id,
    ticket_id: conversation.ticketId,
    messages: conversation.messages,
    source: conversation.source ?? null,
  };
}

/* ---------- Análise ---------- */

export function toAnalysis(raw: unknown): AnalysisRecord {
  const row = record(raw);

  return normalizeAnalysis({
    id: row.id,
    projectId: row.project_id,
    ticketId: row.ticket_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    result: row.result,
    relatedArticles: row.related_articles,
    messages: row.messages,
    deletedAt: row.deleted_at,
  });
}

export function fromAnalysis(analysis: AnalysisRecord): Record<string, unknown> {
  return {
    id: analysis.id,
    project_id: analysis.projectId,
    ticket_id: analysis.ticketId,
    status: analysis.status,
    started_at: analysis.startedAt,
    completed_at: analysis.completedAt ?? null,
    result: analysis.result,
    related_articles: analysis.relatedArticles,
    messages: analysis.messages,
    deleted_at: analysis.deletedAt || null,
  };
}

/* ---------- Plano ---------- */

export function toPlan(raw: unknown): PlanWorkspaceItem {
  const row = record(raw);

  return normalizePlan({
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    projectName: row.project_name,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
    document: row.document,
    tasks: row.tasks,
    comments: row.comments,
    deletedAt: row.deleted_at,
  });
}

export function fromPlan(plan: PlanWorkspaceItem): Record<string, unknown> {
  return {
    id: plan.id,
    project_id: plan.projectId,
    project_name: plan.projectName,
    title: plan.title,
    status: plan.status,
    priority: plan.priority,
    owner: plan.owner,
    due_date: plan.dueDate ?? null,
    source: plan.source,
    document: plan.document,
    tasks: plan.tasks,
    comments: plan.comments,
    deleted_at: plan.deletedAt || null,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

/* ---------- Histórico ---------- */

export function toEvent(raw: unknown): ActivityEvent {
  const row = record(raw);

  return normalizeEvent({
    id: row.id,
    at: row.at,
    type: row.type,
    projectId: row.project_id,
    actor: row.actor,
    subject: row.subject,
    detail: row.detail,
    transition: row.transition,
  });
}

export function fromEvent(event: ActivityEvent): Record<string, unknown> {
  return {
    id: event.id,
    at: event.at,
    type: event.type,
    project_id: event.projectId,
    actor: event.actor,
    subject: event.subject,
    detail: event.detail,
    transition: event.transition ?? null,
  };
}
