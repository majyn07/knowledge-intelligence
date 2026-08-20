"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { sectionsOf } from "@/models/Taxonomy";

import { useTaxonomy } from "../providers/TaxonomyProvider";
import type { EntryList } from "../taxonomyService";

/**
 * Lista simples editável — gênero e tipo de oportunidade.
 *
 * O contador de uso não é enfeite: remover um item que está em uso deixa
 * registros apontando para o vazio, e quem remove precisa saber disso antes.
 */
function EntryListEditor({
  list,
  title,
  hint,
  usage,
}: {
  list: EntryList;
  title: string;
  hint: string;
  usage: (id: string) => number;
}) {
  const { taxonomy, createEntry, deleteEntry } = useTaxonomy();
  const [name, setName] = useState("");

  function add() {
    createEntry(list, name);
    setName("");
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>

      <ul className="mt-4 flex flex-col gap-1.5">
        {taxonomy[list].map((entry) => {
          const count = usage(entry.id);

          return (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm">{entry.name}</span>

              <span className="flex shrink-0 items-center gap-2">
                {count > 0 && (
                  <StatusBadge variant="default">{count} em uso</StatusBadge>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${entry.name}`}
                  onClick={() => deleteEntry(list, entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          value={name}
          placeholder="Novo item"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />

        <Button onClick={add} disabled={!name.trim()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

/** Uma categoria e suas seções, recolhida por padrão — são 146 no total. */
function CategoryRow({ categoryId }: { categoryId: string }) {
  const { taxonomy, createSection, deleteSection, deleteCategory } = useTaxonomy();
  const { items: articles } = useLibrary();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const category = taxonomy.categories.find((item) => item.id === categoryId);
  if (!category) return null;

  const sections = sectionsOf(taxonomy, categoryId);
  const sectionIds = new Set(sections.map((section) => section.id));
  const inUse = articles.filter((article) => sectionIds.has(article.sectionId)).length;

  function add() {
    createSection(categoryId, name);
    setName("");
  }

  return (
    <li className="rounded-lg border border-border/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          size="icon"
          variant="ghost"
          aria-expanded={open}
          aria-label={open ? `Recolher ${category.name}` : `Expandir ${category.name}`}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {category.name}
        </span>

        {!category.isProduct && (
          <StatusBadge variant="default">Apoio</StatusBadge>
        )}

        <span className="shrink-0 text-xs text-muted-foreground">
          {sections.length} seções
          {inUse > 0 ? ` · ${inUse} artigos` : ""}
        </span>

        <Button
          size="icon"
          variant="ghost"
          aria-label={`Remover ${category.name}`}
          onClick={() => deleteCategory(categoryId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border/60 px-3 py-3">
          {sections.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma seção cadastrada nesta categoria.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span className="min-w-0 truncate">{section.name}</span>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover ${section.name}`}
                    onClick={() => deleteSection(section.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <Input
              value={name}
              placeholder="Nova seção"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add();
                }
              }}
            />

            <Button size="sm" onClick={add} disabled={!name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Cadastro da taxonomia.
 *
 * A semente é a estrutura real do portal publicado, mas o portal muda e
 * ninguém vai abrir o código para acompanhar. Tudo aqui é criado, renomeado e
 * removido por quem usa, e os filtros e formulários leem daqui.
 */
export function TaxonomyManager() {
  const { taxonomy, createCategory, resetToPortal } = useTaxonomy();
  const { items: articles } = useLibrary();

  const [name, setName] = useState("");
  const [isProduct, setIsProduct] = useState(true);

  function add() {
    createCategory(name, isProduct);
    setName("");
  }

  const genreUsage = (id: string) =>
    articles.filter((article) => article.genreId === id).length;

  return (
    <PageSection
      title="Classificação"
      description="A estrutura do portal publicado. Categoria e seção classificam o artigo; as listas abaixo alimentam os formulários."
    >
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold tracking-tight">Categorias e seções</h3>

              <p className="mt-1 text-xs text-muted-foreground">
                {taxonomy.categories.length} categorias e {taxonomy.sections.length} seções.
                O artigo aponta para a seção; a categoria vem dela.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={resetToPortal}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Voltar à estrutura do portal
            </Button>
          </div>

          <ul className="mt-4 flex flex-col gap-1.5">
            {taxonomy.categories.map((category) => (
              <CategoryRow key={category.id} categoryId={category.id} />
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="new-category">Nova categoria</Label>

              <Input
                id="new-category"
                value={name}
                placeholder="Ex.: AltoQi Visus Bid"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                checked={isProduct}
                onChange={(event) => setIsProduct(event.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              É linha de produto
            </label>

            <Button onClick={add} disabled={!name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EntryListEditor
            list="genres"
            title="Gêneros de artigo"
            hint="O que o texto faz para quem chega nele. O portal não tem esse campo — é nosso."
            usage={genreUsage}
          />

          <EntryListEditor
            list="opportunityTypes"
            title="Tipos de oportunidade"
            hint="O que a análise pode propor. A lista é da equipe, não do CRM."
            usage={() => 0}
          />
        </div>
      </div>
    </PageSection>
  );
}
