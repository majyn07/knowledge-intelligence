import { describe, expect, it } from "vitest";

import {
  ATALHOS,
  ATALHO_PADRAO,
  janelaInvalida,
  resolverJanela,
  rotuloDaJanela,
} from "./searchWindow";

const AGORA = new Date("2026-08-28T15:00:00.000Z");

describe("resolverJanela", () => {
  it("conta o atalho para trás a partir de agora", () => {
    const periodo = resolverJanela({ tipo: "atalho", id: "7d" }, AGORA);

    if (janelaInvalida(periodo)) throw new Error("deveria ter resolvido");

    expect(periodo.desde).toBe("2026-08-21T15:00:00.000Z");
  });

  /*
    Atalho é sempre "de N dias atrás até agora". Dar-lhe um fim seria inventar
    um limite que ninguém pediu.
  */
  it("atalho não tem fim", () => {
    const periodo = resolverJanela({ tipo: "atalho", id: "1d" }, AGORA);

    if (janelaInvalida(periodo)) throw new Error("deveria ter resolvido");

    expect(periodo.ate).toBe("");
  });

  it("recusa atalho que não existe", () => {
    expect(janelaInvalida(resolverJanela({ tipo: "atalho", id: "99y" }, AGORA))).toBe(true);
  });

  /* O padrão é curto de propósito: a busca custa contra o servidor do suporte. */
  it("o padrão está entre os atalhos", () => {
    expect(ATALHOS.some((atalho) => atalho.id === ATALHO_PADRAO)).toBe(true);
  });

  /*
    Em dias e não em meses: "3 meses" com `setMonth` cai em dias diferentes
    conforme o mês de partida, e a janela de uma execução não bateria com a da
    seguinte.
  */
  it("os atalhos crescem sem repetir", () => {
    const dias = ATALHOS.map((atalho) => atalho.dias);

    expect([...dias].sort((a, b) => a - b)).toEqual(dias);
    expect(new Set(dias).size).toBe(dias.length);
  });

  describe("intervalo livre", () => {
    it("vai do começo do primeiro dia ao fim do último", () => {
      const periodo = resolverJanela(
        { tipo: "intervalo", de: "2025-08-01", ate: "2025-08-31" },
        AGORA
      );

      if (janelaInvalida(periodo)) throw new Error("deveria ter resolvido");

      /*
        Comparado pelos componentes locais, e não pelo texto ISO: o instante
        sai em UTC, e o fim do dia 31 no Brasil é primeiro de setembro lá.
        Afirmar sobre o texto testaria o fuso de quem roda o teste.
      */
      const inicio = new Date(periodo.desde);
      const fim = new Date(periodo.ate);

      expect([inicio.getMonth() + 1, inicio.getDate(), inicio.getHours()]).toEqual([8, 1, 0]);
      expect([fim.getMonth() + 1, fim.getDate(), fim.getHours()]).toEqual([8, 31, 23]);
    });

    /* Escolher hoje e hoje devolveria duração zero, e a busca não traria nada. */
    it("um dia só continua sendo um dia inteiro", () => {
      const periodo = resolverJanela(
        { tipo: "intervalo", de: "2026-08-28", ate: "2026-08-28" },
        AGORA
      );

      if (janelaInvalida(periodo)) throw new Error("deveria ter resolvido");

      expect(new Date(periodo.ate).getTime()).toBeGreaterThan(new Date(periodo.desde).getTime());
    });

    it("recusa data que não dá para situar no tempo", () => {
      expect(
        janelaInvalida(resolverJanela({ tipo: "intervalo", de: "ontem", ate: "hoje" }, AGORA))
      ).toBe(true);
    });

    it("recusa data inicial depois da final", () => {
      expect(
        janelaInvalida(
          resolverJanela({ tipo: "intervalo", de: "2026-08-31", ate: "2026-08-01" }, AGORA)
        )
      ).toBe(true);
    });

    it("recusa intervalo pela metade", () => {
      expect(
        janelaInvalida(resolverJanela({ tipo: "intervalo", de: "2026-08-01", ate: "" }, AGORA))
      ).toBe(true);
    });
  });
});

describe("rotuloDaJanela", () => {
  it("usa o nome do atalho", () => {
    expect(rotuloDaJanela({ tipo: "atalho", id: "14d" })).toBe("2 semanas");
  });

  it("diz as duas datas do intervalo", () => {
    expect(rotuloDaJanela({ tipo: "intervalo", de: "2025-08-01", ate: "2025-08-31" })).toBe(
      "2025-08-01 a 2025-08-31"
    );
  });
});
