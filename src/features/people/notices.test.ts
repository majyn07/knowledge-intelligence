import { describe, expect, it } from "vitest";

import type { ActivityEvent } from "@/models/ActivityEvent";

import type { Follow } from "./follows";
import { buildNotices, unreadCount, type MentionHit } from "./notices";

const evento = (over: Partial<ActivityEvent>): ActivityEvent => ({
  id: "e1",
  at: "2026-08-21T12:00:00.000Z",
  type: "plan_status_changed",
  projectId: "p1",
  actor: "Outra pessoa",
  subject: { kind: "plan", id: "pl1", label: "Plano de teste" },
  detail: "Em análise → Em desenvolvimento",
  ...over,
});

const follow = (subjectId: string): Follow =>
  ({
    id: `f-${subjectId}`,
    personId: "pes-1",
    kind: "plan",
    subjectId,
    subjectLabel: "Plano",
    projectId: "p1",
    createdAt: "2026-08-01T00:00:00.000Z",
  }) as Follow;

const mencao = (over: Partial<MentionHit> = {}): MentionHit => ({
  id: "c1",
  planId: "pl1",
  planTitle: "Plano de teste",
  author: "Outra pessoa",
  at: "2026-08-21T13:00:00.000Z",
  excerpt: "@[Raoni](pes-1) dá uma olhada nisto",
  ...over,
});

const base = {
  events: [] as ActivityEvent[],
  mentions: [] as MentionHit[],
  follows: [] as Follow[],
  mine: new Set<string>(),
  me: "Raoni",
  since: "2026-08-20T00:00:00.000Z",
};

describe("buildNotices", () => {
  it("avisa do que você acompanha", () => {
    const resultado = buildNotices({
      ...base,
      events: [evento({})],
      follows: [follow("pl1")],
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].reason).toBe("follow");
    expect(resultado[0].href).toBe("/improvement-plan?plan=pl1");
  });

  it("avisa do que está atribuído a você", () => {
    const resultado = buildNotices({ ...base, events: [evento({})], mine: new Set(["pl1"]) });

    expect(resultado[0].reason).toBe("mine");
  });

  it("acompanhar descreve melhor que atribuição", () => {
    /*
      Acompanhar é escolha explícita de quem lê; atribuição pode ter vindo de
      outra pessoa. Quando vale para os dois, a escolha explícita é a razão.
    */
    const resultado = buildNotices({
      ...base,
      events: [evento({})],
      follows: [follow("pl1")],
      mine: new Set(["pl1"]),
    });

    expect(resultado[0].reason).toBe("follow");
  });

  it("o que não é seu nem acompanhado não vira aviso", () => {
    expect(buildNotices({ ...base, events: [evento({})] })).toEqual([]);
  });

  it("o que você mesmo fez não é notícia para você", () => {
    const resultado = buildNotices({
      ...base,
      events: [evento({ actor: "Raoni" })],
      follows: [follow("pl1")],
    });

    expect(resultado).toEqual([]);
  });

  it("nem todo evento vira aviso", () => {
    /*
      Um produto que avisa demais é um produto cujos avisos ninguém lê, e aí o
      aviso que importava se perde junto.
    */
    const resultado = buildNotices({
      ...base,
      events: [evento({ type: "plan_updated" }), evento({ id: "e2", type: "article_updated" })],
      follows: [follow("pl1")],
    });

    expect(resultado).toEqual([]);
  });

  it("menção vira aviso, e leva ao plano", () => {
    const resultado = buildNotices({ ...base, mentions: [mencao()] });

    expect(resultado[0].reason).toBe("mention");
    expect(resultado[0].href).toBe("/improvement-plan?plan=pl1");
  });

  it("menção que você escreveu não avisa você", () => {
    // Citar alguém e ser avisado de que citou é o produto conversando consigo.
    expect(buildNotices({ ...base, mentions: [mencao({ author: "Raoni" })] })).toEqual([]);
  });

  it("o que é anterior à última visita aparece, mas como lido", () => {
    /*
      Esconder o já visto deixaria a central vazia na segunda abertura, e quem
      quer reencontrar o que leu ontem não teria onde procurar.
    */
    const resultado = buildNotices({
      ...base,
      events: [
        evento({ id: "novo", at: "2026-08-21T12:00:00.000Z" }),
        evento({ id: "velho", at: "2026-08-19T12:00:00.000Z" }),
      ],
      follows: [follow("pl1")],
    });

    expect(resultado.map((item) => item.unread)).toEqual([true, false]);
    expect(unreadCount(resultado)).toBe(1);
  });

  it("sem última visita, tudo é novo", () => {
    const resultado = buildNotices({
      ...base,
      since: "",
      events: [evento({})],
      follows: [follow("pl1")],
    });

    expect(resultado[0].unread).toBe(true);
  });

  it("do mais recente para o mais antigo, com teto", () => {
    const eventos = Array.from({ length: 60 }, (_, index) =>
      evento({ id: `e${index}`, at: `2026-08-${String(10 + (index % 10)).padStart(2, "0")}T00:00:00.000Z` })
    );

    const resultado = buildNotices({ ...base, events: eventos, follows: [follow("pl1")], limit: 40 });

    expect(resultado).toHaveLength(40);
    expect(resultado[0].at >= resultado[39].at).toBe(true);
  });

  it("assunto sem endereço próprio não inventa destino", () => {
    // Levar para lugar nenhum é melhor que levar para o errado.
    const resultado = buildNotices({
      ...base,
      events: [
        evento({
          type: "opportunity_approved",
          subject: { kind: "opportunity", id: "op1", label: "Oportunidade" },
        }),
      ],
      mine: new Set(["op1"]),
    });

    expect(resultado[0].href).toBe("");
  });
});
