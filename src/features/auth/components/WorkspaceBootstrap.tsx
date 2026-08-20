"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { getSupabase } from "@/lib/supabase/client";

import {
  countLocal,
  pushLocalWorkspace,
  serverHasContent,
  type LocalWorkspace,
} from "../workspaceBootstrap";

type Phase = "verificando" | "perguntando" | "enviando" | "pronto";

const labels: [keyof LocalWorkspace, string][] = [
  ["projects", "projetos"],
  ["tickets", "atendimentos"],
  ["conversations", "conversas"],
  ["analyses", "análises"],
  ["plans", "planos"],
  ["articles", "artigos"],
  ["events", "eventos de histórico"],
];

/**
 * Primeira conexão ao servidor compartilhado.
 *
 * Quando o servidor está vazio e há trabalho neste navegador, a subida é
 * **oferecida**, não feita em silêncio. O produto já tem a regra de não
 * descartar trabalho sem avisar; enviar sem avisar é o mesmo problema virado
 * do avesso — quem envia precisa saber o que está enviando.
 *
 * Só a primeira pessoa migra. Quem chega depois encontra o servidor com
 * conteúdo e lê o que já está lá, em vez de sobrescrever com a própria cópia.
 */
export function WorkspaceBootstrap({ children }: { children: ReactNode }) {
  const { taxonomy, isHydrated } = useTaxonomy();

  const [phase, setPhase] = useState<Phase>("verificando");
  const [local, setLocal] = useState<LocalWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();

    if (!supabase || !isHydrated) {
      if (!supabase) setPhase("pronto");
      return;
    }

    let alive = true;

    serverHasContent(supabase)
      .then((hasContent) => {
        if (!alive) return;

        if (hasContent) {
          setPhase("pronto");
          return;
        }

        const counts = countLocal(taxonomy);
        const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

        if (total === 0) {
          setPhase("pronto");
          return;
        }

        setLocal(counts);
        setPhase("perguntando");
      })
      .catch(() => {
        // Falhar aqui não pode trancar o produto: segue e a tela mostra o que houver.
        if (alive) setPhase("pronto");
      });

    return () => {
      alive = false;
    };
  }, [isHydrated, taxonomy]);

  const send = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    setPhase("enviando");
    setError(null);

    try {
      await pushLocalWorkspace(supabase, taxonomy);
      // Recarrega para que cada provider leia do servidor desde o início.
      window.location.reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "erro desconhecido");
      setPhase("perguntando");
    }
  }, [taxonomy]);

  if (phase === "pronto") return <>{children}</>;
  if (phase === "verificando") return <LoadingScreen label="Conectando ao servidor…" />;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <UploadCloud className="h-6 w-6 text-primary" aria-hidden />

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Enviar o trabalho deste navegador?
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          O servidor compartilhado ainda está vazio. Encontramos conteúdo
          guardado aqui, e ele pode ser a base para a equipe.
        </p>

        <ul className="mt-6 flex flex-col gap-1.5 rounded-xl border bg-card p-5 text-sm">
          {labels
            .filter(([key]) => (local?.[key] ?? 0) > 0)
            .map(([key, label]) => (
              <li key={key} className="flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <strong className="tabular-nums">{local?.[key]}</strong>
              </li>
            ))}
        </ul>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Não foi possível enviar: {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={send} disabled={phase === "enviando"}>
            {phase === "enviando" ? "Enviando…" : "Enviar para o servidor"}
          </Button>

          <Button
            variant="outline"
            disabled={phase === "enviando"}
            onClick={() => setPhase("pronto")}
          >
            Começar vazio
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Começar vazio não apaga nada deste navegador. O conteúdo continua aqui
          e pode ser enviado depois.
        </p>
      </div>
    </main>
  );
}
