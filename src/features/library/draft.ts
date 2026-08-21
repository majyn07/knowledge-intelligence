import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/**
 * A próxima versão de um artigo, preparada ao lado da que está no ar.
 *
 * Antes disto, editar um publicado exigia recolhê-lo para revisão — e enquanto
 * ele estivesse recolhido, a análise deixava de contá-lo como cobertura
 * documental. Corrigir uma vírgula fazia uma seção do portal parecer
 * descoberta.
 *
 * Guarda só o que se edita. Classificação, responsável e estágio continuam
 * únicos: são atributos do artigo, não do texto — e duplicá-los criaria duas
 * respostas para "em que seção isto está".
 */
export interface ArticleDraft {
  title: string;
  summary: string;
  content: string;
  /** ISO da última alteração no rascunho. */
  updatedAt: string;
  /** Quem mexeu por último, para a tela dizer de quem é o trabalho em curso. */
  author: string;
}

/**
 * O rascunho só faz sentido sobre o que já está no ar.
 *
 * Num artigo em rascunho ou revisão não há versão publicada a preservar: o
 * texto em edição **é** o artigo, e uma segunda cópia seria confusão sem
 * ganho.
 */
export function acceptsDraft(article: KnowledgeArticle): boolean {
  return article.status === "published";
}

export function hasDraft(article: KnowledgeArticle): boolean {
  return article.draft !== undefined;
}

/** O que a tela de edição mostra: o rascunho quando existe, o publicado quando não. */
export function editableContent(article: KnowledgeArticle): {
  title: string;
  summary: string;
  content: string;
} {
  return article.draft ?? {
    title: article.title,
    summary: article.summary,
    content: article.content,
  };
}

/**
 * O que mudou entre o publicado e o rascunho.
 *
 * Campo a campo, e não linha a linha: a comparação existe para responder "vale
 * republicar?", e para isso basta saber o que foi tocado. Diferença palavra a
 * palavra é outra ferramenta, e ela entra quando alguém precisar dela.
 */
export type DraftField = "title" | "summary" | "content";

/** Como cada campo se chama para quem lê. */
export const draftFieldLabel: Record<DraftField, string> = {
  title: "título",
  summary: "resumo",
  content: "conteúdo",
};

export function draftChanges(article: KnowledgeArticle): DraftField[] {
  if (!article.draft) return [];

  const mudou: DraftField[] = [];

  if (article.draft.title !== article.title) mudou.push("title");
  if (article.draft.summary !== article.summary) mudou.push("summary");
  if (article.draft.content !== article.content) mudou.push("content");

  return mudou;
}

/**
 * Publicar o rascunho: ele vira o artigo, e some.
 *
 * Devolve um artigo novo em vez de alterar o recebido — o resto do produto
 * trata registro como imutável, e o histórico depende disso para guardar o
 * antes.
 */
export function publishDraft(article: KnowledgeArticle, now: Date): KnowledgeArticle {
  if (!article.draft) return article;

  const { title, summary, content } = article.draft;
  const publicado = { ...article, title, summary, content, updatedAt: now };

  delete publicado.draft;

  return publicado;
}

/** Descartar: o publicado continua exatamente como está. */
export function discardDraft(article: KnowledgeArticle): KnowledgeArticle {
  const limpo = { ...article };
  delete limpo.draft;

  return limpo;
}
