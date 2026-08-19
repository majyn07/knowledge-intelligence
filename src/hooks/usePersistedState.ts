"use client";

import { useEffect, useRef, useState } from "react";

interface UsePersistedStateOptions<T> {
  /** Chave do localStorage. */
  key: string;
  /** Valor canônico renderizado no servidor e no primeiro render do cliente. */
  fallback: T;
  /** Conversão do conteúdo bruto lido do localStorage. */
  parse?: (raw: string) => T;
}

/**
 * Estado persistido sem divergência de hidratação.
 *
 * O servidor e o primeiro render do cliente produzem sempre o mesmo HTML, a
 * partir de `fallback`. O valor guardado só entra depois da montagem, e a
 * escrita só começa quando a leitura terminou — assim o fallback nunca
 * sobrescreve o que já estava salvo.
 */
export function usePersistedState<T>({
  key,
  fallback,
  parse,
}: UsePersistedStateOptions<T>) {
  const [value, setValue] = useState<T>(fallback);
  const [isHydrated, setIsHydrated] = useState(false);
  // A leitura acontece uma única vez, na montagem: basta o parser daquele momento.
  const parseRef = useRef(parse);

  useEffect(() => {
    const raw = localStorage.getItem(key);

    if (raw !== null) {
      try {
        const parsed = parseRef.current
          ? parseRef.current(raw)
          : (JSON.parse(raw) as T);

        setValue(parsed);
      } catch {
        // Conteúdo ilegível: mantém o fallback e deixa a próxima escrita corrigir.
      }
    }

    setIsHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }, [isHydrated, key, value]);

  return [value, setValue, isHydrated] as const;
}
