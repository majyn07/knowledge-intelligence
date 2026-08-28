import { describe, expect, it } from "vitest";

import { panelToSvg, wrap } from "./panelSvg";
import type { PanelSpec } from "./panelSpec";
import type { PanelResult } from "./runPanel";

const spec: PanelSpec = {
  id: "p",
  title: "Artigos por estágio",
  source: "articles",
  breakdown: "status",
  visual: "bar",
  window: 30,
  scopedToProject: false,
  order: 0,
};

const barras: PanelResult = {
  total: 3,
  rows: [
    { key: "published", label: "Publicado", value: 2 },
    { key: "draft", label: "Rascunho", value: 1 },
  ],
};

describe("panelToSvg", () => {
  it("é um documento SVG completo", () => {
    const svg = panelToSvg(spec, barras);

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("carrega o título e o recorte que gerou o número", () => {
    const svg = panelToSvg(spec, barras);

    expect(svg).toContain("Artigos por estágio");
    expect(svg).toContain("Artigos");
    expect(svg).toContain("Últimos 30 dias");
  });

  it("escapa o que a pessoa escreveu", () => {
    /*
      O título vem de um campo de texto. Um `&` sem escapar produz um arquivo
      que nenhum visualizador abre, e um `<` produziria marcação.
    */
    const svg = panelToSvg({ ...spec, title: 'P&D <script>alert("x")</script>' }, barras);

    expect(svg).toContain("P&amp;D &lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });

  it("desenha uma barra por linha", () => {
    const svg = panelToSvg(spec, barras);

    // Duas linhas, cada uma com trilho e preenchimento, mais o fundo.
    expect(svg.match(/<rect /g)).toHaveLength(5);
  });

  it("a mesma entrada produz sempre o mesmo arquivo", () => {
    // Pura de propósito: é o que permite conferir o desenho por teste.
    expect(panelToSvg(spec, barras)).toBe(panelToSvg(spec, barras));
  });

  it("número único não desenha barra", () => {
    const svg = panelToSvg({ ...spec, breakdown: "none", visual: "number" }, {
      total: 12,
      rows: [{ key: "total", label: "Total", value: 12 }],
    });

    expect(svg).toContain(">12<");
    expect(svg.match(/<rect /g)).toHaveLength(1);
  });

  it("vazio diz que está vazio, em vez de sair em branco", () => {
    const svg = panelToSvg(spec, { total: 0, rows: [] });

    expect(svg).toContain("Nada neste recorte.");
  });

  it("a ressalva vai junto na imagem", () => {
    /*
      Uma imagem circula muito mais longe da tela onde a ressalva estava
      escrita, e é ela que impede o número de ser lido como completo.
    */
    const svg = panelToSvg(spec, { ...barras, caveat: "3 registros ficaram de fora." });

    expect(svg).toContain("ficaram de fora.");
  });

  it("a tabela cruzada vira colunas na imagem", () => {
    const svg = panelToSvg(
      { ...spec, breakdown2: "genre", visual: "table" },
      {
        total: 3,
        rows: barras.rows,
        matrix: {
          columns: [{ key: "gen-faq", label: "FAQ" }],
          rows: [
            { key: "published", label: "Publicado", values: [2], total: 2 },
            { key: "draft", label: "Rascunho", values: [1], total: 1 },
          ],
        },
      }
    );

    expect(svg).toContain("FAQ");
    expect(svg).toContain("Publicado");
  });
});

describe("wrap", () => {
  it("quebra sem partir palavra", () => {
    expect(wrap("um dois tres quatro", 9)).toEqual(["um dois", "tres", "quatro"]);
  });

  it("palavra maior que a linha fica sozinha em vez de sumir", () => {
    expect(wrap("supercalifragilistico", 5)).toEqual(["supercalifragilistico"]);
  });

  it("texto vazio não vira linha vazia", () => {
    expect(wrap("", 10)).toEqual([]);
  });
});
