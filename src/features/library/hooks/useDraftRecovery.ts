"use client";

import { useCallback, useEffect, useState } from "react";

import { readJSON, remove, STORAGE_KEYS, writeJSON } from "@/lib/storage";

import {
  isEmptyDraft,
  parseRecovered,
  recoveryKey,
  shouldOffer,
  type RecoverableFields,
  type RecoveredDraft,
} from "../recovery";

/**
 * Aguarda a digitação parar antes de gravar.
 *
 * Gravar a cada tecla escreveria centenas de vezes num artigo longo, e o
 * `localStorage` é síncrono, cada escrita trava a linha principal. Um segundo
 * e meio é curto o bastante para não perder trabalho e longo o bastante para
 * não gravar no meio de uma palavra.
 */
const ESPERA_MS = 1500;

/**
 * Guarda o texto em edição para o caso de a aba não voltar.
 *
 * O guarda de alterações pendentes cobre quem está lá para responder: fecha o
 * diálogo, o produto pergunta. Este cobre quem não está. Aba fechada por
 * engano, navegador reiniciado, energia. Nesses casos ninguém pergunta nada, e
 * até aqui o texto simplesmente não existia mais.
 *
 * Fica no navegador de propósito, mesmo no modo compartilhado: texto pela
 * metade no servidor ficaria visível para a equipe antes de a pessoa decidir
 * mostrar.
 */
export function useDraftRecovery(id: string, current: RecoverableFields) {
  const key = recoveryKey(STORAGE_KEYS.libraryRecovery, id);

  const [recovered, setRecovered] = useState<RecoveredDraft | null>(null);
  const [dismissed, setDismissed] = useState(false);

  /*
    Lido uma vez, na montagem, e não a cada render. Depois da montagem quem
    escreve nessa chave somos nós, então reler devolveria o que acabamos de
    gravar e o aviso reapareceria a cada tecla.
  */
  useEffect(() => {
    setRecovered(parseRecovered(readJSON<unknown>(key, null)));
  }, [key]);

  const { title, summary, content } = current;

  /*
    As dependências são os três textos, e não o objeto: o pai monta um objeto
    novo a cada render, e depender dele reiniciaria a espera a cada re-render
    alheio. Adiando para sempre a gravação que o hook existe para fazer.
  */
  useEffect(() => {
    // Formulário ainda intocado não vira registro de recuperação.
    if (isEmptyDraft({ title, summary, content })) return;

    const timer = window.setTimeout(() => {
      writeJSON(key, { id, title, summary, content, at: new Date().toISOString() });
    }, ESPERA_MS);

    return () => window.clearTimeout(timer);
  }, [title, summary, content, id, key]);

  /** Chamado depois de gravar ou de descartar: o texto já tem para onde ir. */
  const clear = useCallback(() => {
    remove(key);
    setRecovered(null);
  }, [key]);

  const offer = !dismissed && shouldOffer(recovered, current);

  return {
    /** O que foi encontrado, quando vale oferecer. */
    recovered: offer ? recovered : null,
    clear,
    /** Some com o aviso sem apagar nada: a decisão de descartar é outra. */
    dismiss: () => setDismissed(true),
    discard: () => {
      clear();
      setDismissed(true);
    },
  };
}
