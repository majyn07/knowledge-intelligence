"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearAppStorage } from "@/lib/storage";

interface ErrorRecoveryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Tela de falha. Os dados vivem no navegador, então a causa mais provável de um
 * erro de render é conteúdo guardado em formato inesperado. Por isso o segundo
 * caminho existe, e por isso ele diz exatamente o que apaga.
 */
export function ErrorRecovery({ error, reset }: ErrorRecoveryProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  return (
    <div className="flex min-h-96 w-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-border/70 bg-card p-6 sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </span>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Algo quebrou nesta tela
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O restante da aplicação continua funcionando. Tentar de novo costuma
          resolver quando a falha foi passageira.
        </p>

        {error.message && (
          <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs leading-5 text-muted-foreground">
            {error.message}
            {error.digest && <span className="block opacity-60">digest {error.digest}</span>}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Tentar de novo
          </Button>

          {!isConfirmingReset && (
            <Button variant="ghost" onClick={() => setIsConfirmingReset(true)}>
              Continua quebrando
            </Button>
          )}
        </div>

        {isConfirmingReset && (
          <div className="mt-6 rounded-lg border-l-2 border-destructive bg-destructive/5 p-4">
            <p className="text-sm font-medium">Recomeçar do zero</p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Apaga tudo que este navegador guardou. Projetos, atendimentos,
              análises, planos, artigos, pessoas e histórico, e volta aos dados
              de exemplo. Não há como desfazer.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsConfirmingReset(false)}>
                Cancelar
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearAppStorage();
                  window.location.href = "/";
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Apagar e recomeçar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
