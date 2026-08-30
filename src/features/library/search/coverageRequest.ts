import { articleText } from "@/features/library/content/articleText";
import { findSimilarArticles } from "@/features/library/search/findSimilarArticles";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import {
  CANDIDATOS_NO_PEDIDO,
  MODELOS_NO_PEDIDO,
  type CoverageRequest,
} from "@/services/ai/library/coverage";

/**
 * O que vai no pedido de cobertura, escolhido do acervo que está no navegador.
 *
 * Fora do componente porque é decisão, não desenho: quais artigos o modelo lê e
 * quais servem de forma muda o veredito, e isso precisa de teste. A tela só
 * mostra o resultado.
 */

/** Quanto de cada artigo vai como amostra. O inteiro não cabe, e não precisa. */
export const TRECHO = 1_200;

/** Abaixo disto não há material para julgar cobertura, e o botão fica desligado. */
export const MATERIAL_MINIMO = 40;

export function montarPedidoDeCobertura({
  articles,
  material,
  sectionId,
  excludeId,
}: {
  articles: KnowledgeArticle[];
  material: string;
  sectionId: string;
  excludeId?: string;
}): CoverageRequest {
  /*
    Só publicado.

    É a mesma regra da cobertura documental em todo o produto: rascunho e
    revisão não respondem ninguém, e apontá-los como "o acervo já cobre" mandaria
    alguém confiar num texto que não está no ar.
  */
  const publicados = articles.filter((artigo) => artigo.status === "published");

  /*
    Os candidatos saem da busca léxica que já roda no formulário: ela é barata e
    estreita o acervo de 1.822 para os poucos que valem uma leitura. O modelo
    julga; a busca só escolhe o que ele lê.

    A busca devolve uma referência leve, sem o conteúdo, então o artigo é
    reencontrado aqui — sem isso o modelo julgaria lendo título e resumo, que é
    o mesmo que a busca já fazia.
  */
  const candidatos = findSimilarArticles({
    articles: publicados,
    text: material,
    excludeId,
    limit: CANDIDATOS_NO_PEDIDO,
  })
    .map(({ article }) => publicados.find((artigo) => artigo.id === article.id))
    .filter((artigo): artigo is KnowledgeArticle => artigo !== undefined)
    .map((artigo) => ({
      id: artigo.id,
      title: artigo.title,
      summary: artigo.summary,
      excerpt: articleText(artigo).slice(0, TRECHO),
    }));

  /*
    Os modelos são os artigos publicados da mesma seção: o mais próximo em
    assunto, saindo da taxonomia que já existe. Sem seção escolhida não há
    modelo, e o prompt diz isso em vez de fingir que há.
  */
  const modelos = publicados
    .filter((artigo) => sectionId !== "" && artigo.sectionId === sectionId)
    .filter((artigo) => artigo.id !== excludeId)
    .slice(0, MODELOS_NO_PEDIDO)
    .map((artigo) => ({
      title: artigo.title,
      summary: artigo.summary,
      excerpt: articleText(artigo).slice(0, TRECHO),
    }));

  return { material: material.slice(0, 60_000), candidatos, modelos };
}
