import { describe, expect, it } from "vitest";

import {
  classificationSpec,
  emptyClassification,
  TICKET_CLASSIFICATION_FIELDS,
  TICKET_CLASSIFICATIONS,
} from "./TicketClassification";

describe("TICKET_CLASSIFICATIONS", () => {
  /*
    O mapeamento escolhe a primeira coluna cujo cabeçalho normalizado casa. Um
    mesmo cabeçalho em dois campos faria a escolha depender da ordem da lista —
    e a coluna cairia num campo por acidente, em mil linhas de uma vez.
  */
  it("nenhum cabeçalho serve a dois campos", () => {
    const vistos = new Map<string, string>();

    for (const spec of TICKET_CLASSIFICATIONS) {
      for (const header of spec.headers) {
        expect(vistos.get(header) ?? spec.key).toBe(spec.key);
        vistos.set(header, spec.key);
      }
    }
  });

  /* Cabeçalho é comparado já normalizado: com acento ou maiúscula nunca casaria. */
  it("os cabeçalhos estão na forma que a comparação usa", () => {
    for (const spec of TICKET_CLASSIFICATIONS) {
      for (const header of spec.headers) {
        expect(header).toBe(header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
        expect(header).toBe(header.trim());
      }
    }
  });

  /*
    São dois pipelines com vocabulários próprios, e é o que impede as listas de
    se somarem: o de Setup pergunta a causa raiz, o de Suporte tem só a
    categoria.
  */
  it("cada campo declara de qual pipeline vem", () => {
    expect(classificationSpec("causa").pipeline).toBe("setup");
    expect(classificationSpec("sintoma").pipeline).toBe("setup");
    expect(classificationSpec("categoria").pipeline).toBe("suporte");
  });

  it("emptyClassification cobre todos os campos", () => {
    const vazia = emptyClassification();

    expect(Object.keys(vazia).sort()).toEqual([...TICKET_CLASSIFICATION_FIELDS].sort());
    expect(Object.values(vazia).every((valor) => valor === "")).toBe(true);
  });

  it("classificationSpec recusa chave desconhecida", () => {
    // @ts-expect-error a chave não existe no tipo; a guarda é para erro de programação
    expect(() => classificationSpec("inexistente")).toThrow();
  });
});
