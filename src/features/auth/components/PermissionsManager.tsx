"use client";

import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePeople } from "@/features/people/providers/PeopleProvider";

import { GUARDED_ACTIONS, type GuardedActionKey } from "../guardedActions";
import { usePermissions } from "../providers/PermissionsProvider";

/**
 * O que é de quem administra, escrito em vez de combinado.
 *
 * Sem esta tela a regra vira folclore — "acho que só o fulano consegue" — e
 * quem encontra um botão escondido não tem onde descobrir por quê. Ler é de
 * todos justamente por isso; mudar é de quem administra.
 */
export function PermissionsManager() {
  const { guards, isHydrated, souAdministrador, definir } = usePermissions();
  const { people } = usePeople();
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState<GuardedActionKey | null>(null);

  const administradores = people.filter((pessoa) => pessoa.isAdmin);

  async function alternar(acao: GuardedActionKey) {
    setErro("");
    setGravando(acao);

    const resultado = await definir(
      acao,
      guards[acao] === "todos" ? "administradores" : "todos"
    );

    setGravando(null);

    if (!resultado.ok) setErro(resultado.erro ?? "");
  }

  return (
    <PageSection
      title="Permissões"
      description="Quase tudo aqui é de todo mundo: a equipe é treinada e o histórico responde por quem fez o quê. Esta lista é a exceção — ações cujo erro de uma pessoa cai sobre as catorze."
    >
      {!isHydrated ? (
        <ListSkeleton count={3} />
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
            {GUARDED_ACTIONS.map((acao) => {
              const restrita = guards[acao.key] === "administradores";

              return (
                <li key={acao.key} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {acao.label}

                      {acao.fixa && (
                        <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                          <Lock className="h-3 w-3" aria-hidden />
                          Não se afrouxa
                        </Badge>
                      )}

                      {/*
                        Onde a regra é conferida vai na tela, e não só no
                        código. "Servidor" é trava; "tela" esconde o caminho e
                        não impede quem o conhece. Apresentar as duas do mesmo
                        jeito seria vender uma trava que não existe.
                      */}
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal text-muted-foreground"
                      >
                        {acao.conferida === "servidor"
                          ? "Recusada no servidor"
                          : "Escondida na tela"}
                      </Badge>
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{acao.motivo}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {restrita ? "Só administradores" : "Toda a equipe"}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={acao.fixa || !souAdministrador || gravando === acao.key}
                      onClick={() => void alternar(acao.key)}
                    >
                      {restrita ? "Liberar" : "Restringir"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {erro !== "" && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          {!souAdministrador && (
            <p className="text-xs leading-5 text-muted-foreground">
              Só quem administra muda esta lista. Ela fica visível para todos de propósito: quem
              encontra um botão escondido precisa poder descobrir por quê.
            </p>
          )}

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {administradores.length === 0 ? (
              "Ninguém administra este espaço ainda."
            ) : (
              <>
                Administram hoje:{" "}
                <span className="font-medium text-foreground">
                  {administradores.map((pessoa) => pessoa.name).join(", ")}
                </span>
                . Quem promove é a lista de pessoas, acima.
              </>
            )}
          </p>
        </div>
      )}
    </PageSection>
  );
}
