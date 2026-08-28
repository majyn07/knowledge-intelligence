import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

import { deacentuar, isCommonWord } from "@/lib/vocabulary";

import { articleText } from "../content/articleText";
import { termosOnipresentes } from "./ubiquitousTerms";

const TITLE_WEIGHT = 10;
const KEYWORD_WEIGHT = 8;
const TAG_WEIGHT = 6;
const SUMMARY_WEIGHT = 4;
const CONTENT_WEIGHT = 2;

/**
 * Busca somente conteúdo publicado: a pergunta que a análise faz é se a Base
 * de Conhecimento já cobre o caso, e rascunhos ainda não cobrem nada.
 */
export function searchKnowledge(
  articles: KnowledgeArticle[],
  query: KnowledgeQuery
): KnowledgeSearchResult[] {
  /*
    O que sobra depois de tirar o que o acervo inteiro já diz.

    A lista de palavras comuns vem de `lib/vocabulary`, compartilhada. Ela é
    curta de propósito e não dá conta sozinha: a consulta aqui é a conversa
    inteira do atendimento, oitenta mensagens, e ali aparece todo o português.
    "selecione", "conferir", "importante" e "processo" passam por qualquer lista
    escrita à mão, e cada uma casa com algum artigo.

    Quem as descarta é o próprio acervo: termo que está em um quarto dele não
    distingue artigo nenhum. Medido uma vez por acervo, não por busca.

    O tamanho mínimo continua três e continua sendo decisão desta busca: "laje",
    "viga", "SPDA" e "IFC" são o que separa um artigo do outro neste acervo, e a
    barra alta da comparação entre dois artigos jogaria os quatro fora.

    O termo guardado é o **acentuado**, e a decisão usa a forma sem acento. O
    casamento adiante é `includes` contra o corpo do artigo, que tem acento:
    procurar "fissuracao" ali não acharia "fissuração".
  */
  const onipresentes = termosOnipresentes(articles);

  const terms = query.text
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((term) => {
      if (term.length <= 2) return false;

      const nu = deacentuar(term);

      return !isCommonWord(nu) && !onipresentes.has(nu);
    });

  const maxScore =
    terms.length *
    (TITLE_WEIGHT +
      KEYWORD_WEIGHT +
      TAG_WEIGHT +
      SUMMARY_WEIGHT +
      CONTENT_WEIGHT);

  if (maxScore === 0) {
    return [];
  }

  /*
    O acervo inteiro entra, sem recorte por iniciativa.

    O artigo é do hub e não pertence a projeto nenhum: os 1.822 importados
    do portal têm `projectId` vazio. Recortar aqui pelo projeto do
    atendimento fazia toda análise responder "nada cobre isto" sobre um
    portal que cobre, que é o mesmo defeito que a Biblioteca já pagou uma vez.
  */
  return articles
    .filter((article) => article.status === "published")
    .map((article) => {
      let score = 0;

      const matchedTerms = new Set<string>();

      const title = article.title.toLowerCase();
      const summary = article.summary.toLowerCase();
      // Sem a marcação: senão "div" e "class" casariam com o portal inteiro.
      const content = articleText(article).toLowerCase();
      const keywords = article.keywords.join(" ").toLowerCase();
      const tags = article.tags.join(" ").toLowerCase();

      for (const term of terms) {
        if (title.includes(term)) {
          score += TITLE_WEIGHT;
          matchedTerms.add(term);
        }

        if (keywords.includes(term)) {
          score += KEYWORD_WEIGHT;
          matchedTerms.add(term);
        }

        if (tags.includes(term)) {
          score += TAG_WEIGHT;
          matchedTerms.add(term);
        }

        if (summary.includes(term)) {
          score += SUMMARY_WEIGHT;
          matchedTerms.add(term);
        }

        if (content.includes(term)) {
          score += CONTENT_WEIGHT;
          matchedTerms.add(term);
        }
      }

      return {
        article: { id: article.id, title: article.title, summary: article.summary },
        score: score / maxScore,
        matchedTerms: [...matchedTerms],
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 5);
}
