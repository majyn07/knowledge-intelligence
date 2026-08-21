import type { AnalysisMessage } from "./AnalysisMessage";
import type { AnalysisResult } from "./AnalysisResult";
import type { KnowledgeSearchResult } from "./KnowledgeSearchResult";
import type { Trashable } from "./Trash";

export type AnalysisStatus = "open" | "in_review" | "completed";

/**
 * Rótulo do estágio da análise.
 *
 * Vivia dentro de um componente do painel inicial. Virou vocabulário
 * compartilhado quando os painéis personalizados passaram a quebrar por
 * estágio: duas cópias do mesmo texto divergem, e a divergência aparece como
 * duas linhas para o mesmo estado.
 */
export const analysisStatusLabel: Record<AnalysisStatus, string> = {
  open: "Aberta",
  in_review: "Em revisão",
  completed: "Concluída",
};
export type OpportunityWorkflowStatus =
  | "proposed"
  | "approved"
  | "discarded"
  | "draft"
  | "deferred";

export interface AnalysisRecord extends Trashable {
  id: string;
  projectId: string;
  ticketId: string;
  status: AnalysisStatus;
  startedAt: string;
  completedAt?: string;
  result: AnalysisResult;
  /** Artigos que esta análise realmente consultou, preservados como evidência. */
  relatedArticles: KnowledgeSearchResult[];
  messages: AnalysisMessage[];
}
