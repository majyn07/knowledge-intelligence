import type { KnowledgeSearchResult } from "./KnowledgeSearchResult";
import type { SupportConversation } from "./SupportConversation";

/**
 * O atendimento **como o provedor de IA o vê**, e nada além.
 *
 * Era o modelo inteiro, e isso já custou um defeito: no dia em que o
 * atendimento ganhou `raw`, e-mail, telefone e as 795 propriedades do objeto da
 * HubSpot passaram a sair daqui por acidente. Um tipo que copia o modelo manda
 * ao provedor todo campo que alguém acrescentar depois, sem que ninguém decida.
 *
 * Escrito à mão, campo a campo, espelhando o contrato estrito que o servidor
 * confere. Campo novo no atendimento é campo que **fica de fora** até alguém
 * decidir que ele vai — foi a decisão de causa e motivo de contato, que são
 * classificação da equipe e não fazem falta ao prompt.
 */
export interface AITicketContext {
  id: string;
  projectId: string;
  title: string;
  solution: string;
  company: string;
  date: string;
}

export interface AIContext {
  ticket?: AITicketContext;

  /** Conversa do atendimento, quando disponível no domínio. Preenchida no servidor. */
  conversation?: SupportConversation;

  relatedArticles?: KnowledgeSearchResult[];

  knowledgeBaseId?: string;

  projectId?: string;

  analysisMode?: "ticket" | "article";
}
