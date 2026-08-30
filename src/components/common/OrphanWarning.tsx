"use client";

import { Info } from "lucide-react";

import type { Orphans } from "@/models/Trash";
import { contar } from "@/lib/plural";

/**
 * O que fica apontando para o vazio.
 *
 * Não bloqueia: a equipe é treinada e decide, como em publicar. Mas o número
 * aparece antes do clique: "excluir este atendimento" e "excluir este
 * atendimento, a análise dele e o plano que ele originou" são decisões
 * diferentes, e a tela apresentava as duas do mesmo jeito.
 */
export function OrphanWarning({ orphans }: { orphans: Orphans }) {
  if (orphans.total === 0) return null;

  const partes = [
    orphans.analyses > 0 && `${contar(orphans.analyses, "análise")}`,
    orphans.plans > 0 && `${contar(orphans.plans, "plano")}`,
    orphans.articles > 0 && `${contar(orphans.articles, "artigo")}`,
  ].filter(Boolean) as string[];

  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--ring)] bg-accent p-3 text-xs">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

      <span>
        <strong>{partes.join(", ")}</strong> {orphans.total === 1 ? "derivou" : "derivaram"} deste
        registro e {orphans.total === 1 ? "continua" : "continuam"} existindo, {orphans.total === 1
          ? "passa"
          : "passam"}{" "}
        a apontar para o vazio. Restaurar pela lixeira refaz o vínculo.
      </span>
    </p>
  );
}
