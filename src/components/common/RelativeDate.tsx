"use client";

import { useEffect, useMemo, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Texto relativo a partir de uma diferença de tempo.
 *
 * Pura e recebendo `now`, para poder ser testada sem congelar o relógio: o
 * mesmo critério dos indicadores por período.
 */
export function relativeLabel(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();

  if (Number.isNaN(diff)) return "";

  // Data no futuro não é erro: prazo é a próxima sprint, e a interface não
  // deve dizer "há -3 dias" quando isso chegar.
  const future = diff < 0;
  const amount = Math.abs(diff);

  if (amount < MINUTE) return "agora";

  const [value, unit] =
    amount < HOUR
      ? [Math.floor(amount / MINUTE), "minuto"]
      : amount < DAY
        ? [Math.floor(amount / HOUR), "hora"]
        : amount < 30 * DAY
          ? [Math.floor(amount / DAY), "dia"]
          : amount < 365 * DAY
            ? [Math.floor(amount / (30 * DAY)), "mês"]
            : [Math.floor(amount / (365 * DAY)), "ano"];

  const plural =
    value === 1 ? unit : unit === "mês" ? "meses" : `${unit}s`;

  return future ? `em ${value} ${plural}` : `há ${value} ${plural}`;
}

/** Data completa, para o título e para quem precisa do instante exato. */
export function absoluteLabel(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Data em linguagem de quem lê, com o instante exato ao passar o mouse.
 *
 * "há 3 dias" responde a pergunta que se faz ao bater o olho, se é recente.
 * "12 de maio de 2026, 14:30" responde a que se faz depois, e por isso fica no
 * título em vez de ocupar a linha.
 *
 * O valor é calculado depois da montagem: o servidor e o primeiro render do
 * cliente têm relógios diferentes, e "há 2 minutos" divergiria na hidratação.
 * Até lá aparece a data absoluta, que é igual nos dois.
 */
export function RelativeDate({ value }: { value: Date | string }) {
  /*
    Sem memorizar, uma `value` em texto produz uma `Date` nova a cada render, o
    efeito abaixo enxerga dependência diferente toda vez, e o intervalo é
    desmontado e recriado sem parar.
  */
  const date = useMemo(
    () => (value instanceof Date ? value : new Date(value)),
    [value]
  );

  const absolute = absoluteLabel(date);

  const [relative, setRelative] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setRelative(relativeLabel(date, new Date()));

    update();

    // Enquanto a tela fica aberta, "agora" precisa deixar de ser agora.
    const timer = window.setInterval(update, MINUTE);
    return () => window.clearInterval(timer);
  }, [date]);

  if (absolute === "") return null;

  return (
    <time dateTime={date.toISOString()} title={absolute}>
      {relative ?? absolute}
    </time>
  );
}
