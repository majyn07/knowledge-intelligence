import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";

import { eventsInScope } from "./eventScope";

const evento = (id: string, projectId: string): ActivityEvent =>
  ({
    id,
    at: new Date("2026-08-27").toISOString(),
    type: "article_status_changed",
    projectId,
    actor: "",
    subject: { kind: "article", id: "a1", label: "Artigo" },
    detail: "",
  }) as ActivityEvent;

describe("eventsInScope", () => {
  it("mostra o que é da iniciativa aberta", () => {
    const escopo = eventsInScope([evento("da-p1", "p1"), evento("da-p2", "p2")], "p1");

    expect(escopo.map((e) => e.id)).toEqual(["da-p1"]);
  });

  /*
    O acervo é do hub: o artigo do portal não tem iniciativa, e antes disso
    importar, classificar ou publicar não aparecia em histórico nenhum.
  */
  it("leva junto o evento sem iniciativa, que é do acervo", () => {
    const escopo = eventsInScope([evento("do-acervo", ""), evento("da-p2", "p2")], "p1");

    expect(escopo.map((e) => e.id)).toEqual(["do-acervo"]);
  });

  it("sem iniciativa aberta, não recorta nada", () => {
    expect(eventsInScope([evento("a", "p1"), evento("b", "")], "")).toHaveLength(2);
  });
});
