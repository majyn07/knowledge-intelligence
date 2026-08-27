import type { ContentFormat } from "@/models/KnowledgeArticle";

export interface ArticleHeading {
  id: string;
  level: number;
  text: string;
}

const DIACRITICS = /[̀-ͯ]/g;

/** Identificador estável a partir do texto do título, para âncoras do índice. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Os títulos de um conteúdo em HTML.
 *
 * O artigo do portal é HTML, e procurar `#` nele não acha nada — o índice
 * ficava vazio em mil e oitocentos artigos. O `id` é o mesmo que o Markdown
 * produz, para a âncora funcionar igual nos dois formatos.
 */
function htmlHeadings(content: string): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const re = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

  let encontrado: RegExpExecArray | null;

  while ((encontrado = re.exec(content))) {
    const text = encontrado[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;

    headings.push({ id: headingId(text), level: Number(encontrado[1]), text });
  }

  return headings;
}

/**
 * Lê o índice diretamente do conteúdo escrito — nada é armazenado à parte.
 *
 * O formato é **declarado**, como em todo lugar que toca conteúdo: adivinhar
 * pelo texto erraria com artigo que menciona `#` ou que escreve `<h2>` como
 * exemplo dentro de um bloco de código.
 */
export function extractHeadings(
  content: string,
  format: ContentFormat = "markdown"
): ArticleHeading[] {
  if (format === "html") return htmlHeadings(content);

  const headings: ArticleHeading[] = [];
  let insideCodeBlock = false;

  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      insideCodeBlock = !insideCodeBlock;
      continue;
    }

    if (insideCodeBlock) continue;

    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    if (!match) continue;

    const text = match[2].trim();
    if (!text) continue;

    headings.push({ id: headingId(text), level: match[1].length, text });
  }

  return headings;
}
