import { describe, expect, it } from "vitest";

import {
  MAX_RECENT,
  normalizeRecent,
  parseRecent,
  pruneRecent,
  remember,
  type RecentEntry,
} from "./recentlyViewed";

const agora = new Date("2026-08-20T12:00:00.000Z");

const entrada = (id: string): Omit<RecentEntry, "at"> => ({
  kind: "article",
  id,
  title: `Artigo ${id}`,
  href: `/library/${id}`,
});

describe("remember", () => {
  it("põe a visita no topo", () => {
    const lista = remember(remember([], entrada("a"), agora), entrada("b"), agora);

    expect(lista.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("reabrir move para o topo em vez de duplicar", () => {
    // A lista responde "onde eu estava"; o mesmo item duas vezes não responde.
    let lista = remember([], entrada("a"), agora);
    lista = remember(lista, entrada("b"), agora);
    lista = remember(lista, entrada("a"), agora);

    expect(lista.map((item) => item.id)).toEqual(["a", "b"]);
    expect(lista).toHaveLength(2);
  });

  it("registros de tipos diferentes com o mesmo id convivem", () => {
    let lista = remember([], entrada("1"), agora);
    lista = remember(lista, { kind: "plan", id: "1", title: "Plano", href: "/improvement-plan?plan=1" }, agora);

    expect(lista).toHaveLength(2);
  });

  it("não guarda comando", () => {
    // A paleta já os mostra todos, e eles empurrariam para fora justamente os
    // registros que valem lembrar.
    const lista = remember([], { kind: "command", id: "go-home", title: "Início", href: "/" }, agora);

    expect(lista).toEqual([]);
  });

  it("ignora entrada sem identidade ou sem destino", () => {
    expect(remember([], { ...entrada("a"), id: "" }, agora)).toEqual([]);
    expect(remember([], { ...entrada("a"), href: "" }, agora)).toEqual([]);
  });

  it("respeita o teto, descartando o mais antigo", () => {
    let lista: RecentEntry[] = [];

    for (let n = 0; n < MAX_RECENT + 3; n++) {
      lista = remember(lista, entrada(String(n)), agora);
    }

    expect(lista).toHaveLength(MAX_RECENT);
    expect(lista[0].id).toBe(String(MAX_RECENT + 2));
    expect(lista.some((item) => item.id === "0")).toBe(false);
  });
});

describe("normalizeRecent", () => {
  it("descarta entrada sem id ou sem destino, que não leva a lugar nenhum", () => {
    expect(normalizeRecent({ kind: "article", href: "/library/a" })).toBeNull();
    expect(normalizeRecent({ kind: "article", id: "a" })).toBeNull();
  });

  it("recusa tipo desconhecido em vez de propagá-lo", () => {
    expect(normalizeRecent({ kind: "podcast", id: "a", href: "/x" })?.kind).toBe("article");
  });

  it("sobrevive a conteúdo que não é objeto", () => {
    expect(() => normalizeRecent("texto solto")).not.toThrow();
  });
});

describe("parseRecent", () => {
  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseRecent('{"a":1}')).toEqual([]);
  });

  it("descarta as entradas inválidas e mantém as boas", () => {
    const raw = JSON.stringify([
      { kind: "article", id: "a", href: "/library/a", title: "A", at: "" },
      { kind: "article", href: "/library/b" },
    ]);

    expect(parseRecent(raw)).toHaveLength(1);
  });
});

describe("pruneRecent", () => {
  it("tira o que aponta para registro que não existe mais", () => {
    const lista = [
      { ...entrada("a"), at: "" },
      { ...entrada("b"), at: "" },
    ];

    expect(pruneRecent(lista, (item) => item.id === "a").map((i) => i.id)).toEqual(["a"]);
  });
});
