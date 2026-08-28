import { describe, expect, it } from "vitest";

import { indicatorsFileName, indicatorsToCsv } from "./indicatorsCsv";

describe("indicatorsToCsv", () => {
  it("põe o recorte em cima do arquivo", () => {
    const csv = indicatorsToCsv(
      ["Indicadores · Edificio teste Pereira", "Últimos 30 dias"],
      [{ group: "Movimento", label: "Atendimentos", value: 9 }]
    );

    expect(csv).toContain("Edificio teste Pereira");
    expect(csv).toContain("Últimos 30 dias");
  });

  it("uma linha por indicador, com bloco e valor", () => {
    const csv = indicatorsToCsv(
      [],
      [
        { group: "Movimento", label: "Atendimentos", value: 9 },
        { group: "Estado atual", label: "Artigos publicados", value: 1822 },
      ]
    );

    expect(csv).toContain("Movimento;Atendimentos;9;");
    expect(csv).toContain("Estado atual;Artigos publicados;1822;");
  });

  /* Fora da tela ninguém tem como saber o que ficou de fora do número. */
  it("leva a ressalva junto do número que tem uma", () => {
    const csv = indicatorsToCsv(
      [],
      [
        {
          group: "Ciclo",
          label: "Mediana",
          value: 12,
          note: "Fora da conta: 3 sem data que dê para situar no tempo.",
        },
      ]
    );

    expect(csv).toContain("3 sem data que dê para situar no tempo");
  });

  /* "Elétrica, geral" viraria duas colunas, e o arquivo abriria torto. */
  it("escapa separador, aspa e quebra de linha", () => {
    const csv = indicatorsToCsv(
      [],
      [{ group: "Acervo", label: 'Seção "Elétrica; geral"', value: 3 }]
    );

    expect(csv).toContain('"Seção ""Elétrica; geral"""');
  });

  /* Sem o BOM o Excel lê como ANSI e "Elétrica" chega quebrado. */
  it("começa com BOM e quebra linha como o Excel espera", () => {
    const csv = indicatorsToCsv([], [{ group: "a", label: "b", value: 1 }]);

    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
  });
});

describe("indicatorsFileName", () => {
  /* A planilha envelhece, e a de ontem circula. */
  it("carrega o dia no nome", () => {
    expect(indicatorsFileName("2026-08-28")).toBe("indicadores-2026-08-28.csv");
  });
});
