"use client";

import { LifeBuoy } from "lucide-react";

import { RelativeDate } from "@/components/common/RelativeDate";
import { Button } from "@/components/ui/button";

import type { RecoveredDraft } from "../recovery";

/**
 * Há texto desta edição que nunca foi salvo.
 *
 * Só aparece quando o guardado **difere** do que o registro tem hoje: igual
 * significa que a gravação aconteceu, e pedir uma decisão sobre nada é o que
 * ensina alguém a ignorar avisos.
 *
 * Restaurar não grava — devolve o texto para os campos, e a decisão de salvar
 * continua sendo de quem está editando. Descartar apaga só a cópia; o artigo
 * não é tocado.
 */
export function RecoveryNotice({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: RecoveredDraft;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Há texto desta edição que não chegou a ser salvo</p>

        <p className="mt-1 text-xs text-muted-foreground">
          Guardado neste navegador <RelativeDate value={draft.at} />, quando a janela fechou sem
          gravar. Restaurar devolve o texto aos campos — salvar continua sendo escolha sua.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onRestore}>
            Restaurar o texto
          </Button>

          <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}
