import { describe, expect, it } from "vitest";

import {
  applySelection,
  defaultSelection,
  toReviewable,
  type FillProposal,
} from "./fillSelection";

const LABELS = { name: "Nome do projeto", goal: "Objetivo", product: "Produto" };

function proposta(name: string, value: string): FillProposal {
  return { name, value, reason: "porque sim" };
}

describe("toReviewable", () => {
  it("nomeia o campo pelo rótulo da tela, e não pelo nome técnico", () => {
    /*
      "goal" na lista de revisão não diz a ninguém qual campo vai mudar.
    */
    const [item] = toReviewable([proposta("goal", "Reduzir dúvidas")], LABELS, {});

    expect(item?.label).toBe("Objetivo");
  });

  it("marca como substituição o que cobre texto já digitado", () => {
    const [item] = toReviewable([proposta("goal", "Novo")], LABELS, { goal: "Antigo" });

    expect(item?.overwrites).toBe(true);
    expect(item?.current).toBe("Antigo");
  });

  it("campo vazio não é substituição", () => {
    const [item] = toReviewable([proposta("goal", "Novo")], LABELS, { goal: "   " });

    expect(item?.overwrites).toBe(false);
  });

  it("valor igual ao que já está lá não é substituição", () => {
    /*
      Avisar sobre uma perda que não existe é o que ensina alguém a ignorar
      avisos.
    */
    const [item] = toReviewable([proposta("goal", "Igual")], LABELS, { goal: " Igual " });

    expect(item?.overwrites).toBe(false);
  });

  it("descarta proposta para campo que a tela não conhece", () => {
    /*
      A lista de campos pode mudar entre o pedido e a resposta. Escrever num
      campo que não existe mais é escrever no nada.
    */
    expect(toReviewable([proposta("inexistente", "x")], LABELS, {})).toEqual([]);
  });
});

describe("defaultSelection", () => {
  it("marca o que preenche campo vazio e deixa a substituição por conta de alguém", () => {
    const revisaveis = toReviewable(
      [proposta("name", "Projeto A"), proposta("goal", "Novo objetivo")],
      LABELS,
      { goal: "Objetivo escrito à mão" }
    );

    const marcados = defaultSelection(revisaveis);

    expect(marcados.has("name")).toBe(true);
    expect(marcados.has("goal")).toBe(false);
  });
});

describe("applySelection", () => {
  it("devolve só o que está marcado", () => {
    const revisaveis = toReviewable(
      [proposta("name", "Projeto A"), proposta("goal", "Objetivo")],
      LABELS,
      {}
    );

    expect(applySelection(revisaveis, new Set(["name"]))).toEqual({ name: "Projeto A" });
  });

  it("nada marcado devolve nada, e não um objeto com campos vazios", () => {
    /*
      Um objeto com strings vazias apagaria o formulário inteiro ao ser
      aplicado — o oposto do que "não aplicar nada" significa.
    */
    const revisaveis = toReviewable([proposta("name", "Projeto A")], LABELS, {});

    expect(applySelection(revisaveis, new Set())).toEqual({});
  });
});
