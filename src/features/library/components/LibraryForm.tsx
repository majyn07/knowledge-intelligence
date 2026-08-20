"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import { templateFor } from "@/features/library/content/articleTemplates";
import { findSimilarArticles } from "@/features/library/search/findSimilarArticles";
import {
  allowedArticleTransitions,
  articleStatusLabel,
  type ArticleStatus,
  type KnowledgeArticle,
} from "@/models/KnowledgeArticle";
import { findSection, sectionsOf } from "@/models/Taxonomy";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { suggestTeam } from "@/features/people/suggestTeam";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import { PersonSelect } from "@/features/people/components/PersonSelect";

import { MarkdownField } from "@/components/common/markdown/MarkdownField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { DuplicateWarning } from "./DuplicateWarning";

interface LibraryFormProps {
  projects: { id: string; name: string }[];
  /** Acervo usado para avisar sobre conteúdo duplicado. */
  articles: KnowledgeArticle[];
  editingId?: string;
  initialData?: LibraryFormData;
  submitLabel?: string;
  onSubmit: (data: LibraryFormData) => void;
  onCancel?: () => void;
  /** Avisa o diálogo de que há alteração pendente. */
  onDirty?: () => void;
}

const emptyForm: LibraryFormData = {
  title: "",
  summary: "",
  content: "",
  projectId: "",
  genreId: "",
  status: "draft",
  sectionId: "",
  tags: [],
  keywords: [],
  author: "",
  url: "",
};

/**
 * Valor sentinela do seletor. Um `<SelectItem>` não aceita valor vazio, então
 * "sem escolha" precisa de um texto próprio que nunca colide com um id do
 * cadastro — todos eles começam com `cat-`, `sec-` ou `gen-`.
 */
const UNSET = "—";

function toList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function Fieldset({ legend, hint, children }: { legend: string; hint: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{legend}</legend>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{legend}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
      {children}
    </fieldset>
  );
}

export function LibraryForm({
  projects,
  articles,
  editingId,
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  onDirty,
}: LibraryFormProps) {
  // O estado nasce do prop e não é sincronizado depois: quem troca o registro
  // em edição remonta o formulário por chave.
  const [formData, setFormData] = useState<LibraryFormData>(initialData ?? emptyForm);
  const [tags, setTags] = useState(initialData?.tags.join(", ") ?? "");
  const [keywords, setKeywords] = useState(initialData?.keywords.join(", ") ?? "");

  const { taxonomy } = useTaxonomy();

  /*
    A categoria não é guardada no artigo — ela é a metade de cima da cascata e
    existe só para filtrar as seções. Ao abrir um artigo já classificado, ela é
    deduzida da seção dele; a partir daí é escolha de quem edita.
  */
  const [categoryId, setCategoryId] = useState(
    () => findSection(taxonomy, initialData?.sectionId ?? "")?.categoryId ?? ""
  );

  const sections = useMemo(
    () => (categoryId === "" ? [] : sectionsOf(taxonomy, categoryId)),
    [categoryId, taxonomy]
  );

  const { teams } = usePeople();

  /*
    Preenchimento silencioso é o risco da sugestão: ninguém desconfia do que já
    veio preenchido. A tela diz que foi ela quem escolheu, e some assim que a
    pessoa mexe no campo.
  */
  const [suggestedAuthor, setSuggestedAuthor] = useState(false);

  /**
   * Escolher a seção preenche o autor, quando ele ainda está vazio.
   *
   * Nunca sobrescreve: quem já escolheu alguém decidiu, e trocar por baixo
   * seria o produto discordando de uma escolha humana. A sugestão sai do
   * cadastro de equipes, não de um mapa no código, e some quando duas equipes
   * declaram a mesma categoria — aí escolher uma delas seria arbitrário.
   */
  function chooseSection(sectionId: string) {
    change("sectionId", sectionId);

    if (formData.author !== "") return;

    const suggested = suggestTeam(sectionId, taxonomy, teams);

    if (suggested) {
      change("author", suggested);
      setSuggestedAuthor(true);
    }
  }

  const genreName = (id: string) =>
    taxonomy.genres.find((genre) => genre.id === id)?.name ?? "Não definido";

  const similarArticles = useMemo(
    () =>
      findSimilarArticles({
        articles,
        text: `${formData.title} ${formData.summary}`,
        projectId: formData.projectId || undefined,
        excludeId: editingId,
      }),
    [articles, editingId, formData.projectId, formData.summary, formData.title]
  );

  // Fora da edição, o status é sempre rascunho; na edição, só os destinos válidos.
  const statusOptions: ArticleStatus[] = initialData
    ? [initialData.status, ...allowedArticleTransitions[initialData.status]]
    : ["draft"];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.title.trim() || !formData.projectId) return;

    onSubmit({ ...formData, tags: toList(tags), keywords: toList(keywords) });

    setFormData(emptyForm);
    setTags("");
    setKeywords("");
  }

  function change<K extends keyof LibraryFormData>(field: K, value: LibraryFormData[K]) {
    onDirty?.();
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  function applyTemplate() {
    change("content", templateFor(genreName(formData.genreId)));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Fieldset legend="Artigo" hint="O que este conteúdo ensina e para quem.">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            placeholder="Ex.: Erro ao autenticar após atualização"
            value={formData.title}
            onChange={(event) => change("title", event.target.value)}
          />
        </div>

        <DuplicateWarning results={similarArticles} />

        <div className="space-y-2">
          <Label htmlFor="summary">Resumo</Label>
          <Textarea
            id="summary"
            rows={2}
            placeholder="Uma frase que descreve o que o artigo resolve. É o que a análise lê ao procurar cobertura."
            value={formData.summary}
            onChange={(event) => change("summary", event.target.value)}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Conteúdo" hint="Escreva em Markdown. Os títulos viram o índice do artigo.">
        <MarkdownField
          id="content"
          label="Corpo do artigo"
          rows={14}
          value={formData.content}
          onChange={(value) => change("content", value)}
          placeholder={"## Problema\n\nDescreva o sintoma como o cliente o relata."}
          actions={
            !formData.content.trim() ? (
              <Button type="button" size="sm" variant="ghost" onClick={applyTemplate}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Usar modelo de {genreName(formData.genreId).toLowerCase()}
              </Button>
            ) : undefined
          }
        />
      </Fieldset>

      <Fieldset legend="Classificação" hint="Como este artigo é encontrado — pela busca e pela análise.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="article-project">Projeto</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => change("projectId", value ?? "")}
            >
              <SelectTrigger id="article-project">
                <SelectValue placeholder="Selecione um projeto">
                  {(id: string) => projects.find((project) => project.id === id)?.name ?? "Selecione um projeto"}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-genre">Gênero</Label>
            <Select
              value={formData.genreId || UNSET}
              onValueChange={(value) => change("genreId", value === UNSET ? "" : (value ?? ""))}
            >
              <SelectTrigger id="article-genre">
                <SelectValue>
                  {(id: string) => genreName(id)}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={UNSET}>Não definido</SelectItem>

                {taxonomy.genres.map((genre) => (
                  <SelectItem key={genre.id} value={genre.id}>
                    {genre.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/*
            Categoria e seção são cascata, como no portal: a categoria só
            filtra, e o que fica guardado no artigo é a seção. Guardar as duas
            permitiria que divergissem.
          */}
          <div className="space-y-2">
            <Label htmlFor="article-category">Categoria</Label>
            <Select
              value={categoryId || UNSET}
              onValueChange={(value) => {
                const next = value === UNSET ? "" : (value ?? "");
                setCategoryId(next);
                // Trocar de categoria invalida a seção escolhida na anterior.
                if (formData.sectionId) change("sectionId", "");
              }}
            >
              <SelectTrigger id="article-category">
                <SelectValue>
                  {(id: string) =>
                    taxonomy.categories.find((item) => item.id === id)?.name ?? "Não definida"
                  }
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={UNSET}>Não definida</SelectItem>

                {taxonomy.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-section">Seção</Label>
            <Select
              value={formData.sectionId || UNSET}
              onValueChange={(value) => chooseSection(value === UNSET ? "" : (value ?? ""))}
              disabled={categoryId === ""}
            >
              <SelectTrigger id="article-section">
                <SelectValue>
                  {(id: string) =>
                    taxonomy.sections.find((item) => item.id === id)?.name ?? "Não definida"
                  }
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={UNSET}>Não definida</SelectItem>

                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-muted-foreground">
              {categoryId === ""
                ? "Escolha a categoria para ver as seções dela."
                : `${sections.length} seções em ${
                    taxonomy.categories.find((item) => item.id === categoryId)?.name ?? ""
                  }.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-status">Status</Label>
            <Select
              value={formData.status}
              disabled={!initialData}
              onValueChange={(value) => change("status", (value ?? "draft") as ArticleStatus)}
            >
              <SelectTrigger id="article-status">
                <SelectValue>{(status: ArticleStatus) => articleStatusLabel[status]}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {articleStatusLabel[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="autenticação, acesso"
              value={tags}
              onChange={(event) => { onDirty?.(); setTags(event.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author">Autor</Label>
            <PersonSelect
              id="author"
              value={formData.author}
              onChange={(name) => {
                setSuggestedAuthor(false);
                change("author", name);
              }}
              placeholder="Sem autor"
            />

            {suggestedAuthor && (
              <p className="text-xs text-muted-foreground">
                Sugerido pela categoria da seção. Troque se não for.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Palavras-chave</Label>
          <Input
            id="keywords"
            placeholder="login, token, sessão"
            value={keywords}
            onChange={(event) => { onDirty?.(); setKeywords(event.target.value); }}
          />
          <p className="text-xs text-muted-foreground">
            Termos que os clientes usam ao descrever o problema. Têm peso alto na busca da análise.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Endereço público</Label>
          <Input
            id="url"
            placeholder="https://suporte.altoqi.com.br/..."
            value={formData.url}
            onChange={(event) => change("url", event.target.value)}
          />
        </div>
      </Fieldset>

      <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit" disabled={!formData.title.trim() || !formData.projectId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
