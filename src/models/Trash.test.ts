import { describe, expect, it } from "vitest";

import { alive, countOrphans, isTrashed, trashed } from "./Trash";

const item = (id: string, deletedAt?: string) => ({ id, ...(deletedAt ? { deletedAt } : {}) });

describe("isTrashed", () => {
  it("ausente e vazio são a mesma coisa: vivo", () => {
    /*
      Registro gravado antes da coluna existir não tem o campo, e o
      normalizador devolve vazio. Os dois precisam significar "em uso".
      Senão a primeira leitura esvaziaria o produto.
    */
    expect(isTrashed(item("a"))).toBe(false);
    expect(isTrashed(item("a", ""))).toBe(false);
    expect(isTrashed(item("a", "2026-08-20T12:00:00.000Z"))).toBe(true);
  });
});

describe("alive e trashed", () => {
  const lista = [
    item("vivo"),
    item("velho", "2026-08-01T10:00:00.000Z"),
    item("recente", "2026-08-20T10:00:00.000Z"),
  ];

  it("separam sem perder ninguém", () => {
    expect(alive(lista).map((i) => i.id)).toEqual(["vivo"]);
    expect(trashed(lista)).toHaveLength(2);
    expect(alive(lista).length + trashed(lista).length).toBe(lista.length);
  });

  it("a lixeira mostra o excluído mais recente primeiro", () => {
    // Quem abre a lixeira quase sempre quer desfazer o que acabou de fazer.
    expect(trashed(lista).map((i) => i.id)).toEqual(["recente", "velho"]);
  });
});

describe("countOrphans", () => {
  const analyses = [{ ticketId: "t1", projectId: "p1" }, { ticketId: "t2", projectId: "p1" }];
  const plans = [{ source: { ticketId: "t1" }, projectId: "p1" }];
  const articles = [
    { source: { ticketId: "t1" }, projectId: "p1" },
    { source: { ticketId: "t9" }, projectId: "p2" },
  ];

  it("conta o que ficaria apontando para o vazio", () => {
    /*
      "Excluir este atendimento" e "excluir este atendimento, a análise dele e
      o plano que ele originou" são decisões diferentes, e a tela apresentava
      as duas do mesmo jeito.
    */
    const orfaos = countOrphans({ analyses, plans, articles, of: { kind: "ticket", id: "t1" } });

    expect(orfaos).toEqual({ analyses: 1, plans: 1, articles: 1, total: 3 });
  });

  it("atendimento sem nada derivado não assusta ninguém", () => {
    const orfaos = countOrphans({ analyses, plans, articles, of: { kind: "ticket", id: "t7" } });

    expect(orfaos.total).toBe(0);
  });

  it("projeto conta tudo que pertence a ele", () => {
    const orfaos = countOrphans({ analyses, plans, articles, of: { kind: "project", id: "p1" } });

    expect(orfaos).toEqual({ analyses: 2, plans: 1, articles: 1, total: 4 });
  });

  it("registro de outro projeto não entra na conta", () => {
    const orfaos = countOrphans({ analyses, plans, articles, of: { kind: "project", id: "p2" } });

    expect(orfaos).toEqual({ analyses: 0, plans: 0, articles: 1, total: 1 });
  });
});
