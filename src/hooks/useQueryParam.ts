"use client";

import { useEffect, useState } from "react";

/**
 * Lê um parâmetro da URL depois da montagem.
 *
 * Evita `useSearchParams` de propósito: ele exigiria uma fronteira de Suspense
 * e tiraria estas rotas da pré-renderização estática. Como o parâmetro é
 * informação que só o navegador tem, ler no efeito mantém servidor e primeiro
 * render do cliente idênticos: a mesma regra do resto do projeto.
 */
export function useQueryParam(name: string): string | null {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name]);

  return value;
}
