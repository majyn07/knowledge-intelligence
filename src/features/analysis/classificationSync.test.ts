import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";
import { emptyClassification } from "@/models/TicketClassification";

import { aplicacaoDe, planejarClassificacao, POR_LOTE } from "./classificationSync";

const atendimento = (id: string, chamado?: string, extra: Partial<Ticket> = {}): Ticket => ({
  id,
  projectId: "p1",
  title: id,
  solution: "",
  company: "",
  ...emptyClassification(),
  date: "2026-08-14",
  ...(chamado ? { raw: { hubspotTicketId: chamado } } : {}),
  ...extra,
});

describe("planejarClassificacao", () => {
  it("lotes de cem, só com número, e conta quem não tem", () => {
    const muitos = Array.from({ length: 230 }, (_, i) => atendimento(`t${i}`, String(1000 + i)));
    const plano = planejarClassificacao([...muitos, atendimento("manual")]);

    expect(plano.lotes.map((l) => l.length)).toEqual([POR_LOTE, POR_LOTE, 30]);
    expect(plano.semNumero).toBe(1);
  });

  it("número repetido vai uma vez, e devolve para os dois", () => {
    const plano = planejarClassificacao([atendimento("a", "77"), atendimento("b", "77")]);

    expect(plano.lotes).toEqual([["77"]]);
    expect(plano.porChamado.get("77")).toEqual(["a", "b"]);
  });

  it("o que está na lixeira não é pedido", () => {
    const plano = planejarClassificacao([atendimento("a", "77", { deletedAt: "2026-10-01" })]);

    expect(plano.lotes).toEqual([]);
  });
});

describe("aplicacaoDe", () => {
  it("leva a classificação de cada chamado aos nossos atendimentos", () => {
    const classificacao = { ...emptyClassification(), produto: "AltoQi Eberick" };
    const porTicket = aplicacaoDe({ "77": classificacao }, new Map([["77", ["a", "b"]]]));

    expect([...porTicket.keys()]).toEqual(["a", "b"]);
    expect(porTicket.get("b")?.produto).toBe("AltoQi Eberick");
  });
});
