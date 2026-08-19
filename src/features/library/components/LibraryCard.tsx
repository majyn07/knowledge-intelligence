import {
  BookOpen,
  FileText,
  FolderKanban,
  GitBranch,
  HelpCircle,
  LayoutTemplate,
  Pencil,
  Trash2,
} from "lucide-react";

import type { Library } from "@/models/Library";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LibraryCardProps {
  item: Library;
  projectName: string;
  onClick?: (item: Library) => void;
  onEdit?: (item: Library) => void;
  onDelete?: (item: Library) => void;
}

const statusMap = {
  draft: {
    label: "Rascunho",
    color: "bg-slate-400",
  },
  review: {
    label: "Em revisão",
    color: "bg-amber-500",
  },
  published: {
    label: "Publicado",
    color: "bg-emerald-500",
  },
  archived: {
    label: "Arquivado",
    color: "bg-zinc-500",
  },
} as const;

const typeMap = {
  article: {
    icon: FileText,
    label: "Artigo",
  },
  faq: {
    icon: HelpCircle,
    label: "FAQ",
  },
  workflow: {
    icon: GitBranch,
    label: "Workflow",
  },
  document: {
    icon: BookOpen,
    label: "Documento",
  },
  template: {
    icon: LayoutTemplate,
    label: "Template",
  },
} as const;

export function LibraryCard({
  item,
  projectName,
  onClick,
  onEdit,
  onDelete,
}: LibraryCardProps) {
  const status = statusMap[item.status];
  const type = typeMap[item.type];
  const Icon = type.icon;

  return (
    <Card
      className="cursor-pointer rounded-xl border-border/70 bg-card shadow-none transition-colors hover:border-primary/30 hover:bg-muted/20"
      onClick={() => onClick?.(item)}
    >
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">
              {item.title}
            </h2>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
              <span>{projectName}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{type.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${status.color}`}
            />

            <span className="text-xs text-muted-foreground">
              {status.label}
            </span>
          </div>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {item.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-1 text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>

        {item.source && <p className="text-xs text-muted-foreground">Origem: plano {item.source.planId}</p>}<div className="flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">
            Atualizado em{" "}
            {item.updatedAt.toLocaleDateString(
              "pt-BR"
            )}
          </span>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(item);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(item);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
