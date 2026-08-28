"use client";

import { useCallback, useRef, useState } from "react";

import { useUnsavedWork } from "@/features/release/providers/ReleaseProvider";

/**
 * Guarda para diálogos de edição: fechar com alteração pendente pede
 * confirmação, em vez de descartar o trabalho em silêncio.
 *
 * O formulário avisa que ficou sujo; o diálogo consulta antes de fechar.
 *
 * O mesmo aviso sobe um nível: enquanto houver alteração pendente, o produto
 * inteiro sabe que há o que salvar. É o que faz o aviso de nova versão dizer
 * "salve antes" em vez de oferecer um recarregar que descarta trabalho.
 */
export function useUnsavedGuard(close: () => void) {
  const isDirty = useRef(false);
  /*
    A `ref` é a verdade do momento do clique. Ela não perde uma marcação feita
    entre renders. O estado existe só para o registro acima poder reagir: um
    `ref` não dispara render, e ninguém saberia que a edição ficou suja.
  */
  const [dirty, setDirty] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useUnsavedWork(dirty);

  const markDirty = useCallback(() => {
    isDirty.current = true;
    setDirty(true);
  }, []);

  const reset = useCallback(() => {
    isDirty.current = false;
    setDirty(false);
    setIsConfirming(false);
  }, []);

  /** Chamado quando o diálogo tenta fechar. */
  const requestClose = useCallback(() => {
    if (isDirty.current) {
      setIsConfirming(true);
      return;
    }

    reset();
    close();
  }, [close, reset]);

  const confirmDiscard = useCallback(() => {
    reset();
    close();
  }, [close, reset]);

  return {
    isConfirming,
    markDirty,
    reset,
    requestClose,
    confirmDiscard,
    keepEditing: () => setIsConfirming(false),
  };
}
