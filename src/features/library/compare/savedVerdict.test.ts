import { describe, expect, it } from "vitest";

import type { MergeAdvice, MergeRequest } from "@/services/ai/library/mergeAdvice";

import {
  chaveDoPar,
  comVeredito,
  impressaoDoPedido,
  normalizarVeredito,
  normalizarVereditos,
  vereditoValido,
  type SavedVerdict,
} from "./savedVerdict";

const lado = (id: string, text = `texto de ${id}`): MergeRequest["a"] => ({
  id,
  title: `Título ${id}`,
  summary: "",
  text,
  truncated: false,
});

const advice: MergeAdvice = {
  relacao: "complementares",
  motivo: "Um trata da modelagem, o outro do dimensionamento.",
  manter: null,
  levarJunto: [],
  recomendacao: "Ligar um ao outro.",
};

function salvo(pedido: MergeRequest, extra: Partial<SavedVerdict> = {}): SavedVerdict {
  return {
    kind: "sobreposicao",
    subject: chaveDoPar(pedido.a.id, pedido.b.id),
    fingerprint: impressaoDoPedido(pedido),
    advice,
    actorId: "p1",
    actorLabel: "Ana",
    at: "2026-10-19T10:00:00.000Z",
    ...extra,
  };
}

describe("chaveDoPar", () => {
  it("é a mesma nas duas ordens", () => {
    expect(chaveDoPar("b", "a")).toBe(chaveDoPar("a", "b"));
  });
});

describe("impressaoDoPedido", () => {
  it("não depende da ordem dos artigos", () => {
    expect(impressaoDoPedido({ a: lado("x"), b: lado("y") })).toBe(
      impressaoDoPedido({ a: lado("y"), b: lado("x") })
    );
  });

  it("muda quando o texto lido muda", () => {
    expect(impressaoDoPedido({ a: lado("x"), b: lado("y") })).not.toBe(
      impressaoDoPedido({ a: lado("x", "texto reescrito"), b: lado("y") })
    );
  });
});

describe("vereditoValido", () => {
  it("vale enquanto o pedido é o mesmo", () => {
    const pedido = { a: lado("x"), b: lado("y") };

    expect(vereditoValido(salvo(pedido), { a: lado("y"), b: lado("x") })).toBe(true);
  });

  it("vence quando um dos artigos muda", () => {
    const pedido = { a: lado("x"), b: lado("y") };

    expect(vereditoValido(salvo(pedido), { a: lado("x"), b: lado("y", "outro") })).toBe(false);
  });
});

describe("normalizarVeredito", () => {
  it("aceita o que foi gravado", () => {
    const v = salvo({ a: lado("x"), b: lado("y") });

    expect(normalizarVeredito(JSON.parse(JSON.stringify(v)))).toEqual(v);
  });

  it("recusa veredito fora do contrato do modelo", () => {
    const v = salvo({ a: lado("x"), b: lado("y") });

    expect(normalizarVeredito({ ...v, advice: { ...advice, relacao: "talvez" } })).toBeNull();
    expect(normalizarVeredito({ ...v, kind: "outro" })).toBeNull();
    expect(normalizarVeredito({ ...v, fingerprint: "" })).toBeNull();
    expect(normalizarVeredito("lixo")).toBeNull();
  });

  it("preenche quem e quando ausentes com vazio", () => {
    const v = salvo({ a: lado("x"), b: lado("y") });
    const semAutor: Record<string, unknown> = { ...v };
    delete semAutor.actorId;
    delete semAutor.actorLabel;

    expect(normalizarVeredito(semAutor)).toMatchObject({ actorId: "", actorLabel: "" });
  });

  it("descarta os ilegíveis de uma lista e mantém os outros", () => {
    const v = salvo({ a: lado("x"), b: lado("y") });

    expect(normalizarVereditos([v, null, { kind: "sobreposicao" }])).toEqual([v]);
    expect(normalizarVereditos("não é lista")).toEqual([]);
  });
});

describe("comVeredito", () => {
  it("substitui o do mesmo par em vez de acumular", () => {
    const pedido = { a: lado("x"), b: lado("y") };
    const antigo = salvo(pedido, { at: "2026-10-01T00:00:00.000Z" });
    const novo = salvo(pedido, { at: "2026-10-19T00:00:00.000Z" });
    const outro = salvo({ a: lado("x"), b: lado("z") });

    expect(comVeredito([antigo, outro], novo)).toEqual([outro, novo]);
  });
});
