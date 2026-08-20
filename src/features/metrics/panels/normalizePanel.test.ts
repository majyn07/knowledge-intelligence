import { describe, expect, it } from "vitest";

import { defaultPanels } from "./defaultPanels";
import { fromPanel, normalizePanel, parsePanels, toPanel } from "./normalizePanel";
import { panelToCsv, panelFileName } from "./panelCsv";
import type { PanelSpec } from "./panelSpec";

describe("normalizePanel", () => {
  it("garante a forma a partir de um registro incompleto", () => {
    const spec = normalizePanel({ id: "p1", title: "Meu painel" });

    expect(spec).toMatchObject({
      id: "p1",
      title: "Meu painel",
      source: "articles",
      breakdown: "none",
      visual: "number",
      window: 30,
      scopedToProject: false,
    });
  });

  it("desde o início sobrevive, e campo ausente vira 30 dias", () => {
    /*
      `null` é janela legítima. Se caísse no mesmo caminho de "campo ausente",
      um painel gravado como "desde o início" voltaria recortado em 30 dias
      sem ninguém pedir — e o número mudaria sozinho.
    */
    expect(normalizePanel({ id: "a", window: null }).window).toBeNull();
    expect(normalizePanel({ id: "b" }).window).toBe(30);
  });

  it("janela fora da lista vira o padrão em vez de virar infinita", () => {
    expect(normalizePanel({ id: "a", window: 45 }).window).toBe(30);
  });

  it("origem desconhecida cai em artigos em vez de derrubar a tela", () => {
    expect(normalizePanel({ id: "a", source: "faturamento" }).source).toBe("articles");
  });

  it("combinação impossível gravada por versão anterior volta corrigida", () => {
    // "Atendimentos por gênero" nunca respondeu nada. Voltar assim mostraria
    // um painel permanentemente vazio sem explicação.
    const spec = normalizePanel({
      id: "a",
      source: "tickets",
      breakdown: "genre",
      visual: "bar",
    });

    expect(spec.breakdown).toBe("none");
  });

  it("registro sem id ganha um, e não colide com os outros", () => {
    const a = normalizePanel({ title: "x" });
    const b = normalizePanel({ title: "y" });

    expect(a.id).not.toBe("");
    expect(a.id).not.toBe(b.id);
  });
});

describe("parsePanels", () => {
  it("lê a lista em ordem", () => {
    const raw = JSON.stringify([
      { id: "b", title: "B", order: 1 },
      { id: "a", title: "A", order: 0 },
    ]);

    expect(parsePanels(raw).map((panel) => panel.id)).toEqual(["a", "b"]);
  });

  it("conteúdo que não é lista vira lista vazia", () => {
    expect(parsePanels(JSON.stringify({ id: "a" }))).toEqual([]);
  });
});

describe("linha do banco", () => {
  it("ida e volta preserva a especificação", () => {
    for (const spec of defaultPanels) {
      expect(toPanel(fromPanel(spec))).toEqual(spec);
    }
  });

  it("desde o início vai e volta como nulo, e não como zero", () => {
    const spec = defaultPanels.find((panel) => panel.window === null);

    expect(spec).toBeDefined();
    expect(fromPanel(spec as PanelSpec).window_days).toBeNull();
    expect(toPanel(fromPanel(spec as PanelSpec)).window).toBeNull();
  });
});

describe("panelToCsv", () => {
  const spec: PanelSpec = {
    id: "p",
    title: "Acervo",
    source: "articles",
    breakdown: "category",
    visual: "table",
    window: null,
    scopedToProject: false,
    order: 0,
  };

  it("escapa o separador dentro do rótulo", () => {
    /*
      Uma seção chamada "Elétrica; geral" viraria duas colunas, e a planilha
      abriria torta sem nada indicando por quê.
    */
    const csv = panelToCsv(spec, {
      total: 1,
      rows: [{ key: "k", label: "Elétrica; geral", value: 1 }],
    });

    expect(csv).toContain('"Elétrica; geral";1');
  });

  it("escapa aspas duplicando", () => {
    const csv = panelToCsv(spec, {
      total: 1,
      rows: [{ key: "k", label: 'Artigo "novo"', value: 1 }],
    });

    expect(csv).toContain('"Artigo ""novo""";1');
  });

  it("carrega o recorte que gerou o número", () => {
    // Planilha que circula sem o recorte é um número sem procedência.
    const csv = panelToCsv(spec, { total: 0, rows: [] });

    expect(csv).toContain("Acervo");
    expect(csv).toContain("Desde o início");
  });

  it("a ressalva vai junto, e não fica só na tela", () => {
    const csv = panelToCsv(spec, {
      total: 0,
      rows: [],
      caveat: "Histórico parcial.",
    });

    expect(csv).toContain("Histórico parcial.");
  });
});

describe("panelFileName", () => {
  it("tira acento e caractere proibido", () => {
    expect(panelFileName({ ...defaultPanels[0], title: "Artigos: publicação/mês" })).toBe(
      "artigos-publicacao-mes.csv"
    );
  });

  it("título vazio ainda produz um nome", () => {
    expect(panelFileName({ ...defaultPanels[0], title: "  " })).toBe("painel.csv");
  });
});
