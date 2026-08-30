"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";

import {
  defaultGuards,
  normalizeGuards,
  podeFazer,
  type GuardedActionKey,
  type GuardLevel,
  type GuardMap,
} from "../guardedActions";

/**
 * Quem pode fazer o quê, para a tela perguntar.
 *
 * Provider, e não hook solto, porque a resposta é a mesma para a tela inteira e
 * cada chamador buscando por conta própria seriam seis idas ao servidor por
 * abertura. É a mesma dívida que a Biblioteca já pagou uma vez.
 *
 * **Não é a trava.** A trava de verdade é o servidor, e ela existe só onde há
 * rota nossa — hoje, a busca na HubSpot. Aqui o papel é não oferecer o que vai
 * ser recusado, que é a mesma regra do botão de entrar com a conta Google.
 */

interface PermissionsValue {
  guards: GuardMap;
  /** Falso enquanto a resposta não chegou. A tela mostra esqueleto, não botão. */
  isHydrated: boolean;
  souAdministrador: boolean;
  pode: (acao: GuardedActionKey) => boolean;
  definir: (acao: GuardedActionKey, nivel: GuardLevel) => Promise<{ ok: boolean; erro?: string }>;
}

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { souAdministrador } = usePeople();
  const [guards, setGuards] = useState<GuardMap>(defaultGuards);
  const [isHydrated, setHydrated] = useState(false);

  /*
    Uma leitura por montagem, guardada numa ref. O React monta e desmonta em
    desenvolvimento, e sem a guarda a carga inicial roda a cada render — foi o
    defeito silencioso do cache do acervo.
  */
  const carregou = useRef(false);

  useEffect(() => {
    if (carregou.current) return;

    carregou.current = true;

    void (async () => {
      try {
        const resposta = await fetch("/api/settings/permissions");

        if (resposta.ok) {
          const corpo: unknown = await resposta.json();

          setGuards(normalizeGuards((corpo as { guards?: unknown })?.guards));
        }
      } catch {
        /*
          Falha ao ler não vira permissão nem vira bloqueio: fica o padrão, que
          é como o produto sempre funcionou. Trancar a tela porque a
          configuração não respondeu seria pior que o problema.
        */
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const definir = useCallback(
    async (acao: GuardedActionKey, nivel: GuardLevel) => {
      const anterior = guards;
      const proximo = normalizeGuards({ ...guards, [acao]: nivel });

      setGuards(proximo);

      try {
        const resposta = await fetch("/api/settings/permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proximo),
        });

        if (!resposta.ok) {
          const corpo: unknown = await resposta.json().catch(() => null);

          /* Recusado: a tela volta ao que o servidor tem, e não ao que ela quis. */
          setGuards(anterior);

          return {
            ok: false,
            erro:
              (corpo as { message?: string })?.message ??
              "Não foi possível gravar a permissão.",
          };
        }

        return { ok: true };
      } catch {
        setGuards(anterior);

        return { ok: false, erro: "Sem conexão com o servidor." };
      }
    },
    [guards]
  );

  const value = useMemo<PermissionsValue>(
    () => ({
      guards,
      isHydrated,
      souAdministrador,
      pode: (acao) => podeFazer(acao, guards, souAdministrador),
      definir,
    }),
    [definir, guards, isHydrated, souAdministrador]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsValue {
  const value = useContext(PermissionsContext);

  if (!value) throw new Error("usePermissions precisa estar dentro de PermissionsProvider");

  return value;
}
