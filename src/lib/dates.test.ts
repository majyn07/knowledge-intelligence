import { describe, expect, it } from "vitest";

import { dayOf, formatDay, toIsoDate } from "./dates";

describe("toIsoDate", () => {
  it("aceita o formato guardado", () => {
    expect(toIsoDate("2026-08-20")).toBe("2026-08-20");
  });

  it("converte o formato dos registros anteriores", () => {
    // Converter não é adivinhar: é ler o que já está gravado.
    expect(toIsoDate("15/07/2026")).toBe("2026-07-15");
  });

  it("dia que não existe vira vazio, e não o mês seguinte", () => {
    /*
      `new Date("2026-02-31")` devolveria 3 de março sem avisar, e o
      atendimento apareceria num mês em que nada aconteceu.
    */
    expect(toIsoDate("31/02/2026")).toBe("");
    expect(toIsoDate("2026-02-31")).toBe("");
  });

  it("29 de fevereiro existe em ano bissexto e não existe fora dele", () => {
    expect(toIsoDate("29/02/2024")).toBe("2024-02-29");
    expect(toIsoDate("29/02/2026")).toBe("");
  });

  it("mês fora do calendário vira vazio", () => {
    expect(toIsoDate("15/13/2026")).toBe("");
    expect(toIsoDate("15/00/2026")).toBe("");
  });

  it("texto que não é data vira vazio", () => {
    // O campo era livre e aceitava isto. "ontem" não é uma data.
    expect(toIsoDate("ontem")).toBe("");
    expect(toIsoDate("15 jul. 2026")).toBe("");
    expect(toIsoDate("")).toBe("");
  });

  it("espaço em volta não impede a leitura", () => {
    expect(toIsoDate("  15/07/2026  ")).toBe("2026-07-15");
  });
});

describe("formatDay", () => {
  it("mostra o dia guardado sem passar por fuso", () => {
    /*
      `new Date("2026-08-20")` é meia-noite UTC, que no Brasil é o dia 19 — o
      atendimento apareceria um dia antes do que aconteceu.
    */
    expect(formatDay("2026-08-20")).toBe("20/08/2026");
    expect(formatDay("2026-01-01")).toBe("01/01/2026");
  });

  it("o que não é data reconhecível volta como veio", () => {
    // O texto que alguém digitou é informação; apagá-lo seria pior.
    expect(formatDay("ontem")).toBe("ontem");
    expect(formatDay("15/07/2026")).toBe("15/07/2026");
  });
});

describe("dayOf", () => {
  it("usa o dia local, e não o dia UTC", () => {
    /*
      Às 22h em São Paulo já é o dia seguinte em UTC. Um atendimento registrado
      à noite não pode nascer com a data de amanhã.
    */
    const noite = new Date(2026, 7, 20, 22, 30);

    expect(dayOf(noite)).toBe("2026-08-20");
  });

  it("preenche mês e dia com zero à esquerda", () => {
    expect(dayOf(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
