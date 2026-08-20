"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Guarda para diálogos de edição: fechar com alteração pendente pede
 * confirmação, em vez de descartar o trabalho em silêncio.
 *
 * O formulário avisa que ficou sujo; o diálogo consulta antes de fechar.
 */
export function useUnsavedGuard(close: () => void) {
  const isDirty = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const markDirty = useCallback(() => {
    isDirty.current = true;
  }, []);

  const reset = useCallback(() => {
    isDirty.current = false;
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
