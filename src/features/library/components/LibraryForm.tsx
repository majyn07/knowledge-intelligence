"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Eye, PenLine } from "lucide-react";

import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import { PROJECT_PRODUCTS, UNSET_PRODUCT } from "@/features/projects/constants/products";
import {
  allowedArticleTransitions,
  articleStatusLabel,
  articleTypeLabel,
  type ArticleStatus,
  type ArticleType,
} from "@/models/KnowledgeArticle";

import { MarkdownContent } from "@/components/common/MarkdownContent";
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

interface LibraryFormProps {
  projects: { id: string; name: string }[];
  initialData?: LibraryFormData;
  submitLabel?: string;
  onSubmit: (data: LibraryFormData) => void;
  onCancel?: () => void;
}

const emptyForm: LibraryFormData = {
  title: "",
  summary: "",
  content: "",
  projectId: "",
  type: "article",
  status: "draft",
  product: UNSET_PRODUCT,
  module: "",
  category: "",
  tags: [],
  keywords: [],
  url: "",
};

const articleTypes: ArticleType[] = ["article", "faq", "workflow", "document", "template"];
const PRODUCT_PLACEHOLDER = "Não definido";

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
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: LibraryFormProps) {
  const [formData, setFormData] = useState<LibraryFormData>(initialData ?? emptyForm);
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    setFormData(initialData ?? emptyForm);
    setTags(initialData?.tags.join(", ") ?? "");
    setKeywords(initialData?.keywords.join(", ") ?? "");
  }, [initialData]);

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
    setFormData((previous) => ({ ...previous, [field]: value }));
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

      <Fieldset legend="Conteúdo" hint="Aceita Markdown: títulos, listas, tabelas e blocos de código.">
        <div className="flex items-center justify-between">
          <Label htmlFor="content">Corpo do artigo</Label>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsPreviewing((previous) => !previous)}
          >
            {isPreviewing ? (
              <>
                <PenLine className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </>
            ) : (
              <>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Pré-visualizar
              </>
            )}
          </Button>
        </div>

        {isPreviewing ? (
          <div className="min-h-56 rounded-lg border border-border/70 bg-muted/20 p-5">
            {formData.content.trim() ? (
              <MarkdownContent content={formData.content} />
            ) : (
              <p className="text-sm text-muted-foreground">Nada escrito ainda.</p>
            )}
          </div>
        ) : (
          <Textarea
            id="content"
            rows={12}
            className="font-mono text-sm"
            placeholder={"## Passo a passo\n\n1. Primeiro passo\n2. Segundo passo"}
            value={formData.content}
            onChange={(event) => change("content", event.target.value)}
          />
        )}
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
            <Label htmlFor="article-type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => change("type", (value ?? "article") as ArticleType)}
            >
              <SelectTrigger id="article-type">
                <SelectValue>{(type: ArticleType) => articleTypeLabel[type]}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                {articleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {articleTypeLabel[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-product">Produto</Label>
            <Select
              value={formData.product}
              onValueChange={(value) =>
                change("product", !value || value === PRODUCT_PLACEHOLDER ? UNSET_PRODUCT : value)
              }
            >
              <SelectTrigger id="article-product">
                <SelectValue>{(product: string) => product || PRODUCT_PLACEHOLDER}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={PRODUCT_PLACEHOLDER}>{PRODUCT_PLACEHOLDER}</SelectItem>
                {PROJECT_PRODUCTS.map((product) => (
                  <SelectItem key={product} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">Módulo</Label>
            <Input
              id="module"
              placeholder="Ex.: Cost Management"
              value={formData.module}
              onChange={(event) => change("module", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              placeholder="Ex.: Instalação e acesso ao software"
              value={formData.category}
              onChange={(event) => change("category", event.target.value)}
            />
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

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="autenticação, acesso"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Palavras-chave</Label>
          <Input
            id="keywords"
            placeholder="login, token, sessão"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
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
