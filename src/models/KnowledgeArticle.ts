import type { ArticleDraft } from "@/features/library/draft";

import type { Trashable } from "./Trash";

/**
 * Os estágios do artigo, como lista.
 *
 * Declarada como array e não só como união porque o normalizador e as visões
 * salvas precisam da lista em tempo de execução para recusar valor
 * desconhecido — a mesma razão de .
 */
export const CONTENT_FORMATS = ["markdown", "html"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const ARTICLE_STATUSES = ["draft", "review", "published", "archived"] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** Origem do conteúdo, quando ele nasceu de uma decisão do ciclo de conhecimento. */
export interface KnowledgeContentSource {
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  planId: string;
}

/**
 * Artigo da Base de Conhecimento — a única representação de conteúdo do
 * produto. É o que a Biblioteca edita e o que a análise consulta.
 */
export interface KnowledgeArticle extends Trashable {
  id: string;

  title: string;
  /** Resumo curto, usado nas listagens e no contexto enviado à IA. */
  summary: string;
  content: string;

  projectId: string;

  /** Gênero editorial, vindo do cadastro. Vazio enquanto ninguém escolheu. */
  genreId: string;
  status: ArticleStatus;

  /**
   * Seção do portal onde o artigo mora. A categoria vem dela — guardar as
   * duas permitiria que divergissem.
   *
   * Vazio é estado legítimo: artigo recém-criado, ou migrado de um registro
   * antigo cuja classificação não encontrou correspondência. Nesse caso ele
   * aparece em "Sem seção" para ser reclassificado, em vez de ser encaixado
   * por adivinhação.
   */
  sectionId: string;

  /**
   * Identificador do artigo no portal, quando ele veio de lá.
   *
   * Sem isso, sincronizar criaria duplicata a cada importação em vez de
   * atualizar o que já existe.
   */
  portalArticleId?: string;

  tags: string[];
  keywords: string[];

  /** Quem conduz o conteúdo. Campo simples até existir sistema de usuários. */
  author: string;

  /**
   * Em que formato o conteúdo está.
   *
   * Declarado, e não adivinhado. O que escrevemos aqui é Markdown; o que vier
   * do portal é HTML. Converter nos dois sentidos degrada a cada ida e volta —
   * tabela com atributo, âncora, classe e mídia embutida não sobrevivem à
   * viagem — e guardar o formato junto é o que permite não converter nunca.
   */
  contentFormat: ContentFormat;

  /**
   * A próxima versão, preparada enquanto a atual continua no ar.
   *
   * Ausente é o normal. Só existe em artigo publicado: onde não há versão
   * publicada a preservar, o texto em edição já é o artigo.
   */
  draft?: ArticleDraft;

  /** Endereço público do artigo, quando já publicado fora da plataforma. */
  url?: string;

  source?: KnowledgeContentSource;

  createdAt: Date;
  updatedAt: Date;
}

export const articleStatusLabel: Record<ArticleStatus, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  published: "Publicado",
  archived: "Arquivado",
};

/*
 * O gênero deixou de ter rótulo aqui: virou cadastro. Quem precisa do texto
 * lê da taxonomia, porque a lista agora é da equipe e não do código.
 */

/**
 * Transições permitidas do ciclo editorial. Além de avançar, o conteúdo pode
 * voltar: revisão reprovada volta para rascunho, publicado pode ser recolhido
 * para correção, e arquivado pode ser retomado.
 */
export const allowedArticleTransitions: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ["review"],
  review: ["published", "draft"],
  published: ["archived", "review"],
  archived: ["draft"],
};

export function canTransitionArticle(current: ArticleStatus, next: ArticleStatus) {
  return current === next || allowedArticleTransitions[current].includes(next);
}
