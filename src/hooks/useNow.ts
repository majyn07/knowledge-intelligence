"use client";

import { useEffect, useState } from "react";

/**
 * O instante atual, lido depois da montagem.
 *
 * Ler o relógio durante o render é impuro e produz divergência de hidratação:
 * o servidor renderiza com a hora dele, o cliente com a dele, e "atrasado 2
 * dias" pode não coincidir. Até o valor chegar, quem usa recebe `null` e
 * mostra espera, que é honesto, porque de fato ainda não dá para dizer.
 *
 * Atualiza de minuto em minuto: com a tela aberta, "vence hoje" precisa deixar
 * de ser hoje na virada do dia.
 */
export function useNow(intervalMs = 60_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
