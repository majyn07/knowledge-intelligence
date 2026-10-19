import { chaveDoTrecho, paragrafosDe, trechosRepetidosEm } from "@/lib/repeatedText";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { SupportConversation } from "@/models/SupportConversation";

/**
 * Os artigos que o suporte usa para responder.
 *
 * A cobertura do acervo é estimada por vocabulário em todo o produto. Existe um
 * sinal **medido** que ninguém lia: a resposta do suporte traz o link do artigo
 * que resolve o caso. Medido em 19/10/2026 nas 975 conversas: 620 mensagens do
 * suporte com link para o portal, 256 artigos diferentes, 383 atendimentos.
 *
 * **O rodapé não é citação.** O primeiro lugar da contagem crua, "Como funciona
 * o Suporte AltoQi?" com 180 atendimentos, era o link da assinatura do e-mail:
 * 184 das ocorrências dele estão em parágrafos que se repetem pelo acervo. O
 * corte é o de `lib/repeatedText`, o mesmo que tira o enfeite da triagem e do
 * transcrito: limiar escrito em dois lugares diverge no dia em que alguém medir
 * de novo. O preço é perder também a resposta pronta que leva um link, e é o
 * lado certo do erro: contar texto de modelo como citação seria o rodapé de
 * novo, só que mais discreto.
 */

/** Um link de artigo do portal, em qualquer formato que a HubSpot devolva. */
const LINK_DE_ARTIGO = /https?:\/\/[^\s"'<>()]*?\/articles\/(\d+)/g;

const doSuporte = (conversa: SupportConversation) =>
  conversa.messages.filter((m) => m.role === "suporte").map((m) => m.body);

/*
  O enfeite depende só das conversas, e não do acervo: guardado por coleção, como
  o índice da busca. Sem isso, editar um artigo refaria a contagem de parágrafos
  das 975 conversas, porque a lista de artigos muda e a conta inteira roda de novo.
*/
const enfeitePorColecao = new WeakMap<readonly SupportConversation[], Set<string>>();

function enfeiteDe(conversas: readonly SupportConversation[]): Set<string> {
  const guardado = enfeitePorColecao.get(conversas);
  if (guardado) return guardado;

  const enfeite = trechosRepetidosEm(conversas, doSuporte);
  enfeitePorColecao.set(conversas, enfeite);

  return enfeite;
}

export interface Citacoes {
  /** Por artigo do acervo: os atendimentos em que o suporte o citou. */
  porArtigo: Map<string, string[]>;
  /** Links para artigo do portal que não está no acervo, e por isso não contam. */
  foraDoAcervo: number;
}

export function citacoesDoSuporte(
  conversas: readonly SupportConversation[],
  articles: readonly KnowledgeArticle[]
): Citacoes {
  const porPortalId = new Map<string, string>();

  for (const article of articles) {
    if (article.portalArticleId && !article.deletedAt) {
      porPortalId.set(article.portalArticleId, article.id);
    }
  }

  const enfeite = enfeiteDe(conversas);
  const porArtigo = new Map<string, Set<string>>();
  let foraDoAcervo = 0;

  for (const conversa of conversas) {
    for (const corpo of doSuporte(conversa)) {
      for (const paragrafo of paragrafosDe(corpo)) {
        if (enfeite.has(chaveDoTrecho(paragrafo))) continue;

        for (const [, portalId] of paragrafo.matchAll(LINK_DE_ARTIGO)) {
          const articleId = porPortalId.get(portalId);

          if (!articleId) {
            foraDoAcervo += 1;
            continue;
          }

          const atendimentos = porArtigo.get(articleId) ?? new Set<string>();
          atendimentos.add(conversa.ticketId);
          porArtigo.set(articleId, atendimentos);
        }
      }
    }
  }

  return {
    porArtigo: new Map([...porArtigo].map(([id, tickets]) => [id, [...tickets]])),
    foraDoAcervo,
  };
}
