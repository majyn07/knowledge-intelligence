"use client";

import { useEffect, useMemo, useState } from "react";
import { List } from "lucide-react";

import type { ContentFormat } from "@/models/KnowledgeArticle";

import { extractHeadings } from "../content/headings";

interface ArticleTableOfContentsProps {
  content: string;
  format: ContentFormat;
}

/**
 * Índice derivado do próprio conteúdo escrito, sem nada armazenado à parte.
 *
 * O item da seção que está sendo lida fica marcado. Num artigo do portal com
 * nove seções e vinte mil caracteres, um índice que não diz onde você está
 * obriga a reler título por título para se localizar — que é justamente o que
 * o índice existe para evitar.
 */
export function ArticleTableOfContents({ content, format }: ArticleTableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content, format), [content, format]);
  const [ativo, setAtivo] = useState<string>("");

  useEffect(() => {
    if (headings.length < 2) return;

    const alvos = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((elemento): elemento is HTMLElement => elemento !== null);

    if (alvos.length === 0) return;

    /*
      A faixa de observação começa logo abaixo do topo e termina bem antes do
      rodapé: sem estreitá-la, o último título da tela disputaria com o
      primeiro e a marcação ficaria piscando durante a rolagem.
    */
    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visiveis[0]) setAtivo(visiveis[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    for (const alvo of alvos) observador.observe(alvo);

    return () => observador.disconnect();
  }, [headings]);

  if (headings.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Índice do artigo"
      className="rounded-xl border border-border/70 bg-muted/20 p-5 xl:max-h-[60vh] xl:overflow-y-auto"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <List className="h-3.5 w-3.5 text-primary" />
        Neste artigo
      </p>

      <ol className="mt-4 space-y-1 text-sm">
        {headings.map((heading) => {
          const atual = heading.id === ativo;

          return (
            <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}>
              <a
                href={`#${heading.id}`}
                aria-current={atual ? "location" : undefined}
                className={
                  "block border-l-2 py-1 pl-2.5 transition-colors " +
                  (atual
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")
                }
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
