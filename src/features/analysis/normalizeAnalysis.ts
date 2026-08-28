import { items, oneOf, record, text } from "@/lib/shape";
import type { AnalysisResult } from "@/models/AnalysisResult";
import type { AnalysisRecord, AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type {
  KnowledgeOpportunity,
  OpportunityStatus,
} from "./types/KnowledgeOpportunity";

const STATUSES: readonly AnalysisStatus[] = ["open", "in_review", "completed"];

const OPPORTUNITY_STATUSES: readonly OpportunityStatus[] = [
  "proposed",
  "approved",
  "discarded",
  "draft",
  "deferred",
];

/**
 * A oportunidade é a parte do resultado que a interface percorre, edita e
 * transforma em plano. Ela é normalizada campo a campo; o resto do resultado
 * é preservado como veio.
 *
 * O motivo de não normalizar o resultado inteiro: ele é a resposta estruturada
 * do modelo, já validada por schema estrito na fronteira da IA, e é uma árvore
 * grande. **Isso é um limite conhecido**: um registro gravado por uma versão
 * anterior pode ter um campo do resultado ausente que só a tela descobre.
 * Quando o resultado mudar de forma, é aqui que o tratamento entra.
 */
function normalizeOpportunity(raw: unknown): KnowledgeOpportunity {
  const value = record(raw);

  return {
    id: text(value.id) || crypto.randomUUID(),
    ...(text(value.planId) ? { planId: text(value.planId) } : {}),
    type: text(value.type),
    title: text(value.title),
    description: text(value.description),
    justification: text(value.justification),
    status: oneOf(value.status, OPPORTUNITY_STATUSES, "proposed"),
  };
}

export function normalizeAnalysis(raw: unknown): AnalysisRecord {
  const value = record(raw);
  const result = record(value.result);

  return {
    id: text(value.id) || crypto.randomUUID(),
    projectId: text(value.projectId),
    ticketId: text(value.ticketId),
    status: oneOf(value.status, STATUSES, "open"),
    startedAt: text(value.startedAt),
    ...(text(value.completedAt) ? { completedAt: text(value.completedAt) } : {}),
    result: {
      ...result,
      opportunities: items(result.opportunities).map(normalizeOpportunity),
    } as AnalysisResult,
    // Evidência e conversa passaram a ser gravadas depois; registro antigo não tem.
    relatedArticles: items(value.relatedArticles) as AnalysisRecord["relatedArticles"],
    messages: items(value.messages) as AnalysisRecord["messages"],
    // Ausente é "em uso": registro gravado antes da lixeira existir.
    ...(text(value.deletedAt) ? { deletedAt: text(value.deletedAt) } : {}),
  };
}

export function parseAnalyses(raw: string): AnalysisRecord[] {
  return items(JSON.parse(raw)).map(normalizeAnalysis);
}
