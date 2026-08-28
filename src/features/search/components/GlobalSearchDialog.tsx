"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CornerDownLeft,
  FolderKanban,
  History,
  ListTodo,
  ScanSearch,
  Search,
  Sparkles,
  Ticket,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { useProject } from "@/providers/ProjectProvider";

import {
  flattenGroups,
  searchEverything,
  searchKindLabel,
  type SearchResult,
  type SearchResultKind,
} from "../globalSearch";
import { commandGroup } from "../commands";
import { useRecentlyViewed } from "../useRecentlyViewed";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const kindIcon: Record<SearchResultKind, typeof Search> = {
  recent: History,
  command: CornerDownLeft,
  project: FolderKanban,
  ticket: Ticket,
  analysis: ScanSearch,
  opportunity: Sparkles,
  plan: ListTodo,
  article: BookOpen,
  event: History,
};

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const { projects, activeProjectId, selectProject } = useProject();
  const { analyses } = useKnowledgeLifecycle();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { events } = useActivity();
  const { tickets } = useTickets();
  const { taxonomy } = useTaxonomy();
  const { recent, record: rememberVisit } = useRecentlyViewed();

  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const found = searchEverything(
      { projects, tickets, analyses, plans, articles, events, taxonomy },
      query
    );

    /*
      Comandos entram fora de `searchEverything` de propósito: aquela função é
      pura sobre as entidades do ciclo, e comando não é entidade. Aqui eles são
      prefixados para a navegação por teclado tratar tudo como uma lista só.
    */
    const commands = commandGroup(query);

    /*
      Recentes só com o campo vazio. Assim que a pessoa digita, ela está
      procurando outra coisa, e a lista de onde ela esteve viraria estorvo no
      caminho do resultado.
    */
    const recents =
      query.trim() === "" && recent.length > 0
        ? [{
            kind: "recent" as const,
            // O item guarda o tipo de origem: ver que era artigo ou plano faz
            // parte da informação, e o ícone vem daí.
            results: recent.map((entry) => ({
              kind: entry.kind,
              id: entry.id,
              title: entry.title,
              subtitle: "",
              projectId: "",
              href: entry.href,
              score: 1,
            })),
          }]
        : [];

    return [...recents, ...(commands ? [commands] : []), ...found];
  }, [analyses, articles, events, plans, projects, query, recent, taxonomy, tickets]);

  const flat = useMemo(() => flattenGroups(groups), [groups]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  /** Abrir um resultado de outro projeto troca o contexto antes de navegar. */
  function open_(result: SearchResult) {
    if (result.projectId && result.projectId !== activeProjectId) {
      selectProject(result.projectId);
    }

    // Guarda antes de sair: reabrir precisa ser mais barato que buscar de novo.
    rememberVisit({
      kind: result.kind,
      id: result.id,
      title: result.title,
      href: result.href,
    });

    onOpenChange(false);
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (flat.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % flat.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => (current - 1 + flat.length) % flat.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      open_(flat[highlighted]);
    }
  }

  // Deslocamento de cada grupo na lista achatada, para a navegação por teclado.
  const groupOffsets = groups.reduce<number[]>((offsets, group, position) => {
    offsets.push(position === 0 ? 0 : offsets[position - 1] + groups[position - 1].results.length);
    return offsets;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Buscar em todo o workspace</DialogTitle>

        <div className="flex items-center gap-3 border-b border-border/70 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar atendimentos, análises, oportunidades, planos, artigos..."
            className="h-14 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <p className="px-3 pb-2 pt-3 text-center text-xs text-muted-foreground">
              Digite ao menos dois caracteres para buscar registros: a busca
              alcança todos os projetos.
            </p>
          )}

          {query.trim().length >= 2 && groups.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nada encontrado para “{query}”.
            </p>
          )}

          {groups.map((group, groupPosition) => {
            const groupIcon = kindIcon[group.kind];

            return (
              <section key={group.kind} className="mb-2 last:mb-0">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {searchKindLabel[group.kind]}
                </p>

                {group.results.map((result, resultPosition) => {
                  const position = groupOffsets[groupPosition] + resultPosition;
                  const isHighlighted = position === highlighted;

                  return (
                    <button
                      key={`${result.kind}-${result.id}`}
                      type="button"
                      data-index={position}
                      onMouseEnter={() => setHighlighted(position)}
                      onClick={() => open_(result)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isHighlighted ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {(() => {
                          // O ícone vem do item, não do grupo: em "onde você
                          // estava" cada linha mostra o que ela é.
                          const ItemIcon = kindIcon[result.kind] ?? groupIcon;
                          return <ItemIcon className="h-3.5 w-3.5" />;
                        })()}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{result.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      </span>

                      {isHighlighted && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>

        <footer className="flex items-center gap-4 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
          <span>↑ ↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
