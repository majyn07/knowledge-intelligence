"use client";

import { Search } from "lucide-react";

import { PORTAL_STATES, portalStateLabel, type PortalState } from "@/features/library/portalSync";
import type { LibraryFilters } from "@/features/library/types/LibraryFilters";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { articleStatusLabel, type ArticleStatus } from "@/models/KnowledgeArticle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/common/page/PageToolbar";

interface LibraryToolbarProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onNewItem: () => void;
  /** Quantos artigos estão sem seção. Zero esconde o filtro. */
  unclassifiedCount: number;
  /** Quantos em cada situação que pede alguém. Zero esconde a opção. */
  portalCounts: Partial<Record<PortalState, number>>;
}

const statusFilters: (ArticleStatus | "all")[] = ["all", "draft", "review", "published", "archived"];

function filterLabel(value: ArticleStatus | "all") {
  return value === "all" ? "Todos" : articleStatusLabel[value];
}

export function LibraryToolbar({
  filters,
  onFiltersChange,
  onNewItem,
  unclassifiedCount,
  portalCounts,
}: LibraryToolbarProps) {
  const { taxonomy } = useTaxonomy();

  const pendentesNoPortal = PORTAL_STATES.filter((estado) => (portalCounts[estado] ?? 0) > 0);

  return (
    <PageToolbar
      start={
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Buscar por título, resumo, módulo, tag ou palavra-chave..."
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          />
        </div>
      }
      end={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
            {statusFilters.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filters.status === status ? "default" : "outline"}
                onClick={() => onFiltersChange({ ...filters, status })}
              >
                {filterLabel(status)}
              </Button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-border sm:block" />

{/*
            As opções vêm do cadastro, não de constante no código: categoria
            criada aparece aqui sozinha, categoria removida some. Só as linhas
            de produto entram: as áreas de apoio publicam artigo mas não são
            alvo do ciclo, e ocupariam a barra sem servir ao filtro.
          */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
            <Button
              size="sm"
              variant={filters.categoryId === "all" ? "default" : "outline"}
              onClick={() => onFiltersChange({ ...filters, categoryId: "all" })}
            >
              Todas as categorias
            </Button>

            {taxonomy.categories
              .filter((category) => category.isProduct)
              .map((category) => (
                <Button
                  key={category.id}
                  size="sm"
                  variant={filters.categoryId === category.id ? "default" : "outline"}
                  onClick={() => onFiltersChange({ ...filters, categoryId: category.id })}
                >
                  {category.name.replace("AltoQi ", "")}
                </Button>
              ))}

            {unclassifiedCount > 0 && (
              <Button
                size="sm"
                variant={filters.categoryId === "unset" ? "default" : "outline"}
                onClick={() => onFiltersChange({ ...filters, categoryId: "unset" })}
              >
                Sem seção ({unclassifiedCount})
              </Button>
            )}
          </div>

          {/*
            O que falta levar ao portal. Só aparece quando há: a HubSpot não tem
            API para publicar, e esta é a lista de quem vai colar lá. Escolher de
            novo a opção ativa desliga o filtro.
          */}
          {(pendentesNoPortal.length > 0 || filters.portal !== "all") && (
            <>
              <span className="hidden h-5 w-px bg-border sm:block" />

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar pelo portal">
                {pendentesNoPortal.map((estado) => (
                  <Button
                    key={estado}
                    size="sm"
                    variant={filters.portal === estado ? "default" : "outline"}
                    aria-pressed={filters.portal === estado}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        portal: filters.portal === estado ? "all" : estado,
                      })
                    }
                  >
                    {portalStateLabel[estado]} ({portalCounts[estado]})
                  </Button>
                ))}
              </div>
            </>
          )}

          <Button onClick={onNewItem}>Novo artigo</Button>
        </div>
      }
    />
  );
}
