"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useRelease } from "../providers/ReleaseProvider";

/**
 * Aviso de nova versão publicada.
 *
 * Fica no canto e não bloqueia nada: quem está no meio de um atendimento
 * termina o atendimento. Recarregar sozinho seria o produto decidindo por
 * alguém que estava digitando.
 *
 * Com edição aberta o aviso muda de tom. Diz o que se perde e pede
 * confirmação, em vez de oferecer um botão que descarta trabalho calado. É a
 * mesma regra do diálogo de edição, aplicada à aba inteira.
 */
export function ReleaseBanner() {
  const { hasUpdate, unsaved } = useRelease();

  const [dismissed, setDismissed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!hasUpdate || dismissed) return null;

  const reload = () => window.location.reload();

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border bg-card p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Nova versão publicada</p>

          <p className="mt-1 text-xs text-muted-foreground">
            {unsaved > 0 ? (
              <>
                {unsaved === 1
                  ? "Você tem uma edição aberta com alteração não salva."
                  : `Você tem ${unsaved} edições abertas com alteração não salva.`}{" "}
                Salve antes de atualizar, recarregar descarta o que não foi gravado.
              </>
            ) : (
              "Atualize quando puder para usar a versão nova. Nada do que já foi salvo se perde."
            )}
          </p>

          {confirming ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={reload}>
                Descartar e atualizar
              </Button>

              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Voltar e salvar
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => (unsaved > 0 ? setConfirming(true) : reload())}
              >
                Atualizar agora
              </Button>

              <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                Depois
              </Button>
            </div>
          )}
        </div>

        <Button
          size="icon"
          variant="ghost"
          aria-label="Dispensar aviso de nova versão"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
