import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/**
 * O texto de um artigo, sem a marcação.
 *
 * O artigo do portal é HTML, e procurar dentro dele cru faz "div", "span" e
 * "class" casarem com mil e oitocentos artigos de uma vez: o buscador
 * passaria a responder qualquer coisa. Pior: o trecho exibido no resultado
 * viria com tag no meio da frase.
 *
 * O formato é **declarado**, como em todo lugar que toca conteúdo: limpar por
 * precaução um texto em Markdown estragaria quem escreve `<h2>` como exemplo.
 */
export function articleText(article: Pick<KnowledgeArticle, "content" | "contentFormat">): string {
  if (article.contentFormat !== "html") return article.content;

  return article.content
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
