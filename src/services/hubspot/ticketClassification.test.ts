import { describe, expect, it } from "vitest";

import { TICKET_CLASSIFICATIONS } from "@/models/TicketClassification";

import {
  classificacaoDe,
  lerLoteDeClassificacao,
  PROPRIEDADES_DA_CLASSIFICACAO,
  vocabularioDe,
} from "./ticketClassification";

const vocabulario = vocabularioDe({
  results: [
    {
      name: "cc__causa_do_contato",
      options: [
        { value: "erro_modelagem", label: "Erro de modelagem" },
        { value: "bug", label: "Defeito no software" },
      ],
    },
    { name: "produto", options: [{ value: "eberick", label: "AltoQi Eberick" }] },
    { name: "origem", options: [] },
  ],
});

describe("classificacaoDe", () => {
  it("troca o valor interno pelo rótulo que quem atendeu escolheu", () => {
    const c = classificacaoDe({ cc__causa_do_contato: "erro_modelagem", produto: "eberick" }, vocabulario);

    expect(c.suporteCausa).toBe("Erro de modelagem");
    expect(c.produto).toBe("AltoQi Eberick");
  });

  it("seleção múltipla volta em rótulos, separada como veio", () => {
    expect(classificacaoDe({ cc__causa_do_contato: "erro_modelagem;bug" }, vocabulario).suporteCausa).toBe(
      "Erro de modelagem; Defeito no software"
    );
  });

  it("opção que saiu do vocabulário aparece como veio, e não some", () => {
    expect(classificacaoDe({ cc__causa_do_contato: "opcao_antiga" }, vocabulario).suporteCausa).toBe(
      "opcao_antiga"
    );
  });

  it("devolve os onze campos, e o que não veio fica vazio", () => {
    const c = classificacaoDe({}, vocabulario);

    expect(Object.keys(c).sort()).toEqual(TICKET_CLASSIFICATIONS.map((x) => x.key).sort());
    expect(Object.values(c).every((v) => v === "")).toBe(true);
  });
});

describe("lerLoteDeClassificacao", () => {
  it("indexa pelo número do chamado e ignora linha sem id", () => {
    const lote = lerLoteDeClassificacao(
      { results: [{ id: "123", properties: { produto: "eberick" } }, { properties: {} }] },
      vocabulario
    );

    expect([...lote.keys()]).toEqual(["123"]);
    expect(lote.get("123")?.produto).toBe("AltoQi Eberick");
  });
});

describe("o vocabulário do produto", () => {
  it("cada campo aponta para uma propriedade da HubSpot, sem repetir", () => {
    expect(new Set(PROPRIEDADES_DA_CLASSIFICACAO).size).toBe(TICKET_CLASSIFICATIONS.length);
    expect(PROPRIEDADES_DA_CLASSIFICACAO.every((p) => p.trim() !== "")).toBe(true);
  });
});
