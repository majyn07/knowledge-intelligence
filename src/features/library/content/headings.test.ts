import { describe, expect, it } from "vitest";

import { extractHeadings, headingId } from "./headings";

describe("headingId", () => {
  it("remove acentos e normaliza para um identificador estável", () => {
    expect(headingId("Configurações do modelo 4D")).toBe("configuracoes-do-modelo-4d");
  });

  it("não deixa hífens nas pontas", () => {
    expect(headingId("  Passo a passo!  ")).toBe("passo-a-passo");
  });
});

describe("extractHeadings", () => {
  it("lê títulos de nível 1 a 3", () => {
    const headings = extractHeadings("# Um\n\n## Dois\n\n### Três");

    expect(headings.map((heading) => heading.level)).toEqual([1, 2, 3]);
    expect(headings.map((heading) => heading.text)).toEqual(["Um", "Dois", "Três"]);
  });

  it("ignora cerquilhas dentro de bloco de código", () => {
    const content = "## Real\n\n```\n## Falso\n```\n\n## Também real";

    expect(extractHeadings(content).map((heading) => heading.text)).toEqual([
      "Real",
      "Também real",
    ]);
  });

  it("ignora cerquilha sem espaço e título vazio", () => {
    expect(extractHeadings("#SemEspaco\n\n##   \n\n## Válido")).toHaveLength(1);
  });

  it("devolve lista vazia para conteúdo sem títulos", () => {
    expect(extractHeadings("Apenas um parágrafo.\n\n- item")).toEqual([]);
  });
});
