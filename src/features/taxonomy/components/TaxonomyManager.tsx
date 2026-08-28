"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";

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
 * Nome que vira campo no lugar, sem abrir diálogo.
 *
 * Renomear preserva o identificador, e é por isso que a operação pode ser
 * leve: o vínculo com o artigo é o id, não o texto. Trocar "Elétrica" por
 * "Disciplina Elétrica" não desclassifica nada.
 *
 * O estado nasce do prop e não é sincronizado depois. Quem troca o registro
 * em edição é a chave do componente. Um efeito sincronizando `name` apagaria o
 * que está sendo digitado a cada render do pai.
 */
function InlineRename({
  name,
  label,
  size = "sm",
  onRename,
}: {
  name: string;
  label: string;
  size?: "sm" | "md";
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  function open() {
    setDraft(name);
    setEditing(true);
  }

  function confirm() {
    const trimmed = draft.trim();
    // Nome vazio apagaria o rótulo de tudo que aponta para o id, sem remover
    // nada, e ninguém saberia dizer o que aquela seção era.
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  }

  if (!editing) {
    return (
      <>
        <span className={`min-w-0 flex-1 truncate ${size === "md" ? "text-sm font-medium" : ""}`}>
          {name}
        </span>

        <Button
          size="icon"
          variant="ghost"
          aria-label={`Renomear ${label}`}
          onClick={open}
        >
          <Pencil className={icon} />
        </Button>
      </>
    );
  }

  return (
    <>
      <Input
        autoFocus
        value={draft}
        aria-label={`Novo nome. ${name}`}
        className="h-8 min-w-0 flex-1"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            confirm();
          }

          if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
      />

      <Button size="icon" variant="ghost" aria-label="Salvar nome" onClick={confirm}>
        <Check className={icon} />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        aria-label="Cancelar renomear"
        onClick={() => setEditing(false)}
      >
        <X className={icon} />
      </Button>
    </>
  );
}

/**
 * Lista simples editável, gênero e tipo de oportunidade.
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
  const { taxonomy, createEntry, deleteEntry, editEntry } = useTaxonomy();
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
              className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <InlineRename
                key={entry.name}
                name={entry.name}
                label={entry.name}
                size="sm"
                onRename={(novo) => editEntry(list, entry.id, novo)}
              />

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

/** Uma categoria e suas seções, recolhida por padrão. São 146 no total. */
function CategoryRow({ categoryId }: { categoryId: string }) {
  const { taxonomy, createSection, deleteSection, deleteCategory, editCategory, editSection } =
    useTaxonomy();
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

        <InlineRename
          key={category.name}
          name={category.name}
          label={`a categoria ${category.name}`}
          size="md"
          onRename={(novo) => editCategory(categoryId, novo)}
        />

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
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <InlineRename
                    key={section.name}
                    name={section.name}
                    label={`a seção ${section.name}`}
                    size="sm"
                    onRename={(novo) => editSection(section.id, novo)}
                  />

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
            hint="O que o texto faz para quem chega nele. O portal não tem esse campo. É nosso."
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
