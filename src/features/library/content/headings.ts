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

/** Lê o índice diretamente do conteúdo escrito — nada é armazenado à parte. */
export function extractHeadings(content: string): ArticleHeading[] {
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
