import { articleText } from "@/features/library/content/articleText";
import { findSimilarArticles } from "@/features/library/search/findSimilarArticles";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/**
 * O que o acervo tem sobre a pergunta.
 *
 * O assistente recebia um retrato da tela e nada do acervo, e respondia "não
 * consigo pesquisar os 1.824 artigos" para a pergunta mais óbvia que alguém
 * faz nele: "isto já existe?". O retrato continua valendo para os números; o
 * que faltava era ligar a pergunta à busca que já existe.
 *
 * A busca é a mesma da avaliação de cobertura: léxica, no navegador, sobre
 * título, resumo e corpo. Ela é barata e estreita o acervo para os poucos que
 * valem uma leitura. O modelo julga; a busca só escolhe o que ele lê.
 */

/** Quantos vão. Poucos: cada um leva um trecho, e o modelo lê para julgar. */
export const ENCONTRADOS_NO_PEDIDO = 6;

/** Quanto de cada um. O começo do artigo diz do que ele trata. */
const TRECHO = 800;

export interface Encontrado {
  id: string;
  title: string;
  summary: string;
  excerpt: string;
}

export function encontrarNoAcervo(articles: KnowledgeArticle[], pergunta: string): Encontrado[] {
  /* Só publicado: rascunho não responde ninguém, e apontá-lo como "já existe" engana. */
  const publicados = articles.filter((artigo) => artigo.status === "published");

  return findSimilarArticles({ articles: publicados, text: pergunta, limit: ENCONTRADOS_NO_PEDIDO })
    .map(({ article }) => publicados.find((artigo) => artigo.id === article.id))
    .filter((artigo): artigo is KnowledgeArticle => artigo !== undefined)
    .map((artigo) => ({
      id: artigo.id,
      title: artigo.title,
      summary: artigo.summary,
      excerpt: articleText(artigo).slice(0, TRECHO),
    }));
}
