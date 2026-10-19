"use client";

import { useCallback, useEffect, useState } from "react";

import { readJSON, STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { isSharedWorkspace } from "@/lib/supabase/mode";

import {
  comVeredito,
  normalizarVereditos,
  type SavedVerdict,
  type VerdictKind,
} from "./savedVerdict";

/**
 * Os vereditos guardados de um tipo, e o caminho para guardar mais um.
 *
 * Hook com leitura sob demanda, e não provider montado no layout: são duas
 * telas que os consomem (o diálogo da varredura e a comparação lado a lado), e
 * as duas só existem quando alguém vai olhar um par. Ler a tabela em toda
 * abertura do produto, para catorze pessoas, seria pagar pela pergunta que
 * quase ninguém faz naquela visita.
 *
 * Guardar **não bloqueia** a tela: se falhar, o veredito continua visível
 * para quem pediu, e a falha é devolvida para a tela dizer que ele não foi
 * guardado. Perder a resposta por não conseguir guardá-la seria o pior dos dois.
 */
export function useSavedVerdicts(kind: VerdictKind) {
  const [vereditos, setVereditos] = useState<Map<string, SavedVerdict>>(() => new Map());
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    let vivo = true;

    lerVereditos(kind).then((lista) => {
      if (!vivo) return;

      setVereditos(new Map(lista.map((v) => [v.subject, v])));
      setCarregado(true);
    });

    return () => {
      vivo = false;
    };
  }, [kind]);

  const guardar = useCallback(async (veredito: SavedVerdict): Promise<string | null> => {
    /* A tela mostra antes de o banco responder: quem pediu já tem a resposta. */
    setVereditos((anterior) => new Map(anterior).set(veredito.subject, veredito));

    return gravarVeredito(veredito);
  }, []);

  return { vereditos, carregado, guardar };
}

async function lerVereditos(kind: VerdictKind): Promise<SavedVerdict[]> {
  if (!isSharedWorkspace()) {
    return normalizarVereditos(readJSON<unknown>(STORAGE_KEYS.aiVerdicts, [])).filter(
      (v) => v.kind === kind
    );
  }

  try {
    const resposta = await fetch(`/api/library/verdicts?kind=${encodeURIComponent(kind)}`);

    if (!resposta.ok) return [];

    const dados: { vereditos?: unknown } = await resposta.json();

    return normalizarVereditos(dados.vereditos);
  } catch {
    /*
      Sem conseguir ler, a varredura se comporta como antes: avalia tudo. Custa
      pedidos, mas não esconde nada nem inventa veredito.
    */
    return [];
  }
}

/** Devolve `null` quando guardou, ou a frase do que falhou. */
async function gravarVeredito(veredito: SavedVerdict): Promise<string | null> {
  if (!isSharedWorkspace()) {
    const atuais = normalizarVereditos(readJSON<unknown>(STORAGE_KEYS.aiVerdicts, []));
    const resultado = writeJSON(STORAGE_KEYS.aiVerdicts, comVeredito(atuais, veredito));

    return resultado === "ok" ? null : "O navegador não deixou guardar o veredito.";
  }

  try {
    const resposta = await fetch("/api/library/verdicts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veredito),
    });

    if (resposta.ok) return null;

    const dados: { message?: string } = await resposta.json().catch(() => ({}));

    return dados.message ?? "Não foi possível guardar o veredito.";
  } catch {
    return "Não foi possível falar com o servidor para guardar o veredito.";
  }
}
