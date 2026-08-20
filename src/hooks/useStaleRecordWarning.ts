"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Avisa quando o registro em edição mudou no servidor.
 *
 * Com o trabalho compartilhado, duas pessoas podem abrir o mesmo artigo. A
 * decisão de produto foi **avisar e deixar decidir** — nem sobrescrever em
 * silêncio, que faz o trabalho de quem salvou primeiro desaparecer sem
 * ninguém notar, nem travar o registro, que emperra de vez quando alguém
 * esquece a aba aberta.
 *
 * A comparação é entre o que estava na tela quando a edição começou e o que
 * está agora. Enquanto ninguém edita, a referência acompanha o servidor: o
 * aviso é sobre conflito de edição, não sobre a lista ter se atualizado.
 */
export function useStaleRecordWarning<T>(record: T | undefined, isEditing: boolean) {
  const opened = useRef<T | undefined>(record);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      // Fora da edição a referência segue o servidor e nada fica pendente.
      opened.current = record;
      setIsStale(false);
      return;
    }

    if (opened.current === undefined) {
      opened.current = record;
      return;
    }

    if (record !== undefined && record !== opened.current) {
      setIsStale(true);
    }
  }, [isEditing, record]);

  /** Aceita a versão do servidor como base e volta ao estado tranquilo. */
  function acceptRemote() {
    opened.current = record;
    setIsStale(false);
  }

  return { isStale, acceptRemote };
}
