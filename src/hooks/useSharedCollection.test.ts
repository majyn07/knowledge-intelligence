import { describe, expect, it } from "vitest";

import { emLotes } from "./useSharedCollection";

/**
 * A divisão em lotes existe por causa de uma falha real: a gravação dos 1.782
 * artigos do portal morreu no meio, calada, porque ia num pedido só.
 */
describe("emLotes", () => {
  it("divide preservando a ordem", () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  /* O último lote é o que sobrou, e não pode ser descartado nem repetido. */
  it("fecha o último lote com o resto", () => {
    const lotes = emLotes([1, 2, 3, 4, 5, 6, 7], 3);

    expect(lotes).toHaveLength(3);
    expect(lotes[2]).toEqual([7]);
    expect(lotes.flat()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("não perde nem duplica nenhum item", () => {
    const itens = Array.from({ length: 1782 }, (_, i) => i);
    const lotes = emLotes(itens, 25);

    expect(lotes.flat()).toEqual(itens);
    expect(lotes).toHaveLength(Math.ceil(1782 / 25));
  });

  it("devolve um lote só quando tudo cabe", () => {
    expect(emLotes([1, 2], 25)).toEqual([[1, 2]]);
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(emLotes([], 25)).toEqual([]);
  });

  it("aceita divisão exata sem criar lote vazio no fim", () => {
    expect(emLotes([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });
});
