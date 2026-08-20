"use client";

import Link from "next/link";
import {
  BookOpen,
  Boxes,
  FileText,
  GitBranch,
  HelpCircle,
  LayoutTemplate,
  LinkIcon,
  Pencil,
  Trash2,
} from "lucide-react";

import type { ArticleStatus, KnowledgeArticle } from "@/models/KnowledgeArticle";
import { articleStatusLabel } from "@/models/KnowledgeArticle";
import { sectionPath } from "@/models/Taxonomy";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LibraryCardProps {
  item: KnowledgeArticle;
  projectName: string;
  onEdit?: (item: KnowledgeArticle) => void;
  onDelete?: (item: KnowledgeArticle) => void;
}

const statusVariant: Record<ArticleStatus, "default" | "warning" | "success"> = {
  draft: "default",
  review: "warning",
  published: "success",
  archived: "default",
};

/*
  Ícone por nome de gênero. O gênero virou cadastro, então a lista não é
  fechada: nome conhecido ganha o ícone dele, gênero criado pela equipe cai no
  genérico em vez de quebrar.
*/
const genreIcon: Record<string, typeof FileText> = {
  Artigo: FileText,
  FAQ: HelpCircle,
  Workflow: GitBranch,
  Documento: BookOpen,
  Template: LayoutTemplate,
};

export function LibraryCard({ item, projectName, onEdit, onDelete }: LibraryCardProps) {
  const { taxonomy } = useTaxonomy();

  const genre = taxonomy.genres.find((entry) => entry.id === item.genreId)?.name ?? "";
  const Icon = genreIcon[genre] ?? FileText;
  const context = sectionPath(taxonomy, item.sectionId);

  return (
    <Card className="relative rounded-xl border-border/70 bg-card shadow-none transition-colors hover:border-primary/30">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={statusVariant[item.status]}>
            {articleStatusLabel[item.status]}
          </StatusBadge>

          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {genre || "Sem gênero"}
          </span>

          {item.source && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              Origem no ciclo
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">
            <Link href={`/library/${item.id}`} className="after:absolute after:inset-0 hover:underline">
              {item.title}
            </Link>
          </h2>

          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {item.summary || "Sem resumo."}
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Boxes className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{context || "Sem seção"}</span>
        </p>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <span className="truncate text-xs text-muted-foreground">
            {projectName} · {item.updatedAt.toLocaleDateString("pt-BR")}
          </span>

          <div className="relative flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Editar ${item.title}`}
              onClick={() => onEdit?.(item)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              aria-label={`Excluir ${item.title}`}
              onClick={() => onDelete?.(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
