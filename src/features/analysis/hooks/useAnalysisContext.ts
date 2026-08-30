"use client";

import { useMemo } from "react";

import type { AIContext } from "@/models/AIContext";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { buildKnowledgeQuery } from "@/features/library/builders/knowledgeQueryBuilder";
import { searchRelatedArticles } from "@/features/library/services/articleSearchService";

import { enfeiteDaConversa, prepararTranscrito } from "../transcript";

/**
 * O acervo vive no navegador, então a busca acontece aqui e segue junto com o
 * contexto. O servidor recebe a evidência já resolvida, em vez de tentar ler
 * uma base à qual não tem acesso.
 */
export function useAnalysisContext(
  articles: KnowledgeArticle[],
  ticket?: Ticket,
  conversation?: SupportConversation,
  /*
    Todas as conversas, para o enfeite ser apurado do acervo e não adivinhado.

    Opcional porque nem toda tela as tem em mãos; sem elas o transcrito vai como
    sempre foi, e a ausência empobrece o pedido sem torná-lo errado.
  */
  conversations: readonly SupportConversation[] = []
): AIContext {
  return useMemo(() => {
    if (!ticket) return {};

    const query = buildKnowledgeQuery(ticket, conversation);

    /*
      A conversa vai limpa e dentro de um teto.

      Ia inteira, e medido no acervo isso é 27% de enfeite — "Atenciosamente,"
      em 67% das conversas, o menu do bot em 42%. Não é só custo: o modelo lê
      aquilo competindo com a descrição do problema. E não havia teto: a maior
      conversa são cerca de cem mil tokens num pedido só.
    */
    const transcrito = prepararTranscrito(conversation, enfeiteDaConversa(conversations));

    return {
      /*
        Os campos declarados, e não o registro inteiro.

        O atendimento carrega `raw`, que é o que a HubSpot devolveu sem redução:
        e-mail, telefone, empresa e as setecentas e noventa e cinco
        propriedades do objeto. Passar o objeto direto mandava tudo isso ao
        provedor de IA, e mandava por acidente, que é a pior forma de decidir
        sobre dado de cliente.

        Também era o que quebrava a análise. O contrato do servidor é estrito
        de propósito, e passou a recusar todo pedido no dia em que o registro
        cru entrou no modelo: "não foi possível concluir a análise", sem dizer
        por quê.

        Se um dia um campo do registro cru fizer falta ao prompt, ele entra
        aqui com nome, e alguém decide que ele vai.
      */
      ticket: {
        id: ticket.id,
        projectId: ticket.projectId,
        title: ticket.title,
        solution: ticket.solution,
        company: ticket.company,
        date: ticket.date,
      },
      conversation: conversation && {
        id: conversation.id,
        ticketId: conversation.ticketId,
        messages: transcrito.messages,
        source: conversation.source,
      },
      ...(transcrito.truncated ? { conversationTruncated: true } : {}),
      relatedArticles: searchRelatedArticles(articles, query),
      projectId: ticket.projectId,
    };
  }, [articles, conversation, conversations, ticket]);
}
