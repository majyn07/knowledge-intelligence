"use client";

import { useMemo } from "react";

import { MarkdownContent } from "@/components/common/MarkdownContent";
import { buildArticleHtml, type BuildArticleHtmlOptions } from "@/lib/articleHtml";
import type { ContentFormat } from "@/models/KnowledgeArticle";

/**
 * O conteúdo do artigo, no formato que ele **declara** ter.
 *
 * O modelo guarda `contentFormat` desde que o artigo do portal passou a poder
 * entrar, com o argumento de que converter nos dois sentidos degrada a cada ida
 * e volta. Só que a tela renderizava tudo como Markdown. Então o HTML do
 * portal aparecia com as tags à mostra, como texto. Guardar o formato só serve
 * se quem exibe consultar.
 */
export function ArticleContent({
  content,
  format,
  ...opcoes
}: {
  content: string;
  format: ContentFormat;
} & BuildArticleHtmlOptions) {
  const { resolveInternalHref, highlight } = opcoes;

  const html = useMemo(
    () => (format === "html" ? buildArticleHtml(content, { resolveInternalHref, highlight }).html : ""),
    [content, format, resolveInternalHref, highlight]
  );

  if (format === "html") {
    return (
      <div
        className="article-html"
        /*
          O HTML vem do nosso portal e passa pela limpeza de `buildArticleHtml`.
          A alternativa (escapar e mostrar como texto) é o defeito que isto
          conserta.
        */
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <MarkdownContent content={content} />;
}
