import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

interface DuplicateWarningProps {
  results: KnowledgeSearchResult[];
}

/** Aviso, não bloqueio: a decisão de escrever mesmo assim continua sendo humana. */
export function DuplicateWarning({ results }: DuplicateWarningProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border-l-2 border-amber-500 bg-amber-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Já existe conteúdo publicado sobre isto
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Considere atualizar um destes artigos em vez de criar um novo.
      </p>

      <ul className="mt-3 space-y-1.5">
        {results.map(({ article, score }) => (
          <li key={article.id} className="text-sm">
            <Link href={`/library/${article.id}`} className="text-primary hover:underline">
              {article.title}
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">
              {(score * 100).toFixed(0)}% de proximidade
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
