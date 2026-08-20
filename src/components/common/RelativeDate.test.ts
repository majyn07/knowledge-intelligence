import { describe, expect, it } from "vitest";

import { absoluteLabel, relativeLabel } from "./RelativeDate";

const agora = new Date("2026-08-20T12:00:00.000Z");
const atras = (ms: number) => new Date(agora.getTime() - ms);

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe("relativeLabel", () => {
  it("menos de um minuto é agora", () => {
    expect(relativeLabel(atras(30_000), agora)).toBe("agora");
  });

  it("escala de minuto até ano", () => {
    expect(relativeLabel(atras(5 * MINUTO), agora)).toBe("há 5 minutos");
    expect(relativeLabel(atras(3 * HORA), agora)).toBe("há 3 horas");
    expect(relativeLabel(atras(4 * DIA), agora)).toBe("há 4 dias");
    expect(relativeLabel(atras(60 * DIA), agora)).toBe("há 2 meses");
    expect(relativeLabel(atras(400 * DIA), agora)).toBe("há 1 ano");
  });

  it("singular não leva plural", () => {
    expect(relativeLabel(atras(MINUTO), agora)).toBe("há 1 minuto");
    expect(relativeLabel(atras(DIA), agora)).toBe("há 1 dia");
    expect(relativeLabel(atras(31 * DIA), agora)).toBe("há 1 mês");
  });

  it("data no futuro não vira número negativo", () => {
    // Prazo é a próxima sprint: a interface não pode dizer "há -3 dias".
    expect(relativeLabel(new Date(agora.getTime() + 3 * DIA), agora)).toBe("em 3 dias");
  });

  it("data inválida devolve vazio em vez de Invalid Date", () => {
    expect(relativeLabel(new Date("não é data"), agora)).toBe("");
  });
});

describe("absoluteLabel", () => {
  it("traz o instante completo, que é o que o relativo esconde", () => {
    const texto = absoluteLabel(new Date("2026-05-12T14:30:00.000Z"));

    expect(texto).toContain("2026");
    expect(texto).toContain("maio");
  });

  it("data inválida devolve vazio", () => {
    expect(absoluteLabel(new Date("não é data"))).toBe("");
  });
});
