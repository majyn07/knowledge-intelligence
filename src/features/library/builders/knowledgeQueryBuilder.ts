import { semCorrespondencia } from "@/lib/vocabulary";
import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

/**
 * Monta a consulta a partir de tudo que o atendimento oferece, incluindo o
 * registro da conversa quando existe. É onde estão os termos que descrevem
 * o problema real.
 *
 * Menos a correspondência. O texto que entra aqui é conversa de suporte
 * inteira, com saudação, assinatura, horário de atendimento e link, e sem o
 * corte a busca casava por isso: um chamado de importação de IFC no Eberick
 * trouxe como artigo relacionado um texto sobre o Visus Cost Management,
 * ligado por "situação, neste, atendimento, identificamos, solicitação".
 *
 * Um relacionado que não se sustenta é pior que nenhum: a análise apresenta os
 * cinco como o que o acervo tem sobre o caso, e quem confia abre os cinco uma
 * vez só.
 */
export function buildKnowledgeQuery(
  ticket: Ticket,
  conversation?: SupportConversation
): KnowledgeQuery {
  const conversationText = (conversation?.messages ?? [])
    .map((message) => message.body)
    .join("\n");

  return {
    text: semCorrespondencia(
      [ticket.title, ticket.solution, conversationText].filter(Boolean).join("\n\n")
    ),

    company: ticket.company,

    limit: 5,
  };
}
