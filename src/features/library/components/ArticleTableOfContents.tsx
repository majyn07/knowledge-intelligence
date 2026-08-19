import { List } from "lucide-react";

import { extractHeadings } from "../content/headings";

interface ArticleTableOfContentsProps {
  content: string;
}

/** Índice derivado do próprio conteúdo escrito, sem nada armazenado à parte. */
export function ArticleTableOfContents({ content }: ArticleTableOfContentsProps) {
  const headings = extractHeadings(content);

  if (headings.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Índice do artigo"
      className="rounded-xl border border-border/70 bg-muted/20 p-5 xl:sticky xl:top-6"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <List className="h-3.5 w-3.5 text-primary" />
        Neste artigo
      </p>

      <ol className="mt-4 space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}>
            <a
              href={`#${heading.id}`}
              className="text-muted-foreground transition-colors hover:text-primary hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
