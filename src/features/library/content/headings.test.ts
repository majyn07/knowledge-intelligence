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

describe("extractHeadings em HTML", () => {
  /*
    O artigo do portal é HTML, e procurar `#` nele não acha nada: o índice
    ficava vazio em mil e oitocentos artigos.
  */
  it("lê os títulos da marcação", () => {
    expect(extractHeadings("<h2>Ocultar elementos</h2><p>x</p><h3>Exibir</h3>", "html")).toEqual([
      { id: "ocultar-elementos", level: 2, text: "Ocultar elementos" },
      { id: "exibir", level: 3, text: "Exibir" },
    ]);
  });

  it("ignora marcação e espaço dentro do título", () => {
    expect(extractHeadings("<h2>  <strong>Erro</strong> L24&nbsp; </h2>", "html")).toEqual([
      { id: "erro-l24", level: 2, text: "Erro L24" },
    ]);
  });

  it("não confunde h4 em diante, que o índice não usa", () => {
    expect(extractHeadings("<h4>Detalhe</h4>", "html")).toEqual([]);
  });

  /*
    O formato é declarado. Ler HTML como Markdown (ou o contrário) erraria com
    artigo que escreve `<h2>` como exemplo dentro de um bloco de código.
  */
  it("não procura marcação quando o formato é Markdown", () => {
    expect(extractHeadings("<h2>Exemplo</h2>", "markdown")).toEqual([]);
  });

  it("continua lendo Markdown quando o formato é omitido", () => {
    expect(extractHeadings("## Título")).toEqual([
      { id: "titulo", level: 2, text: "Título" },
    ]);
  });
});
