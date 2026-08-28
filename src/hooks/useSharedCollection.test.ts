import { describe, expect, it } from "vitest";

import { emLotes, emLotesPorTamanho } from "./useSharedCollection";

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

/**
 * Contar linhas não descreve o pedido quando as linhas têm tamanhos muito
 * diferentes. No acervo real isso custou 91 classificações: o lote calhou de
 * reunir artigos grandes, o pedido foi rejeitado e, por ser o primeiro lote,
 * nada chegou ao banco.
 */
describe("emLotesPorTamanho", () => {
  const tamanho = (n: number) => n;

  it("fecha o lote quando o próximo item estouraria o teto de bytes", () => {
    expect(emLotesPorTamanho([40, 40, 40], 25, 100, tamanho)).toEqual([[40, 40], [40]]);
  });

  it("continua respeitando o teto de linhas", () => {
    const lotes = emLotesPorTamanho([1, 1, 1, 1, 1], 2, 1000, tamanho);

    expect(lotes).toEqual([[1, 1], [1, 1], [1]]);
  });

  /*
    Recusar o item grande seria perder o registro em silêncio, que é o defeito
    que esta divisão existe para não cometer.
  */
  it("manda sozinho o item que já passa do teto", () => {
    expect(emLotesPorTamanho([10, 500, 10], 25, 100, tamanho)).toEqual([[10], [500], [10]]);
  });

  it("não perde nem duplica nenhum item", () => {
    const itens = Array.from({ length: 300 }, (_, i) => (i % 7) * 5000);
    const lotes = emLotesPorTamanho(itens, 25, 512 * 1024, tamanho);

    expect(lotes.flat()).toEqual(itens);
  });

  it("devolve lista vazia para entrada vazia", () => {
    expect(emLotesPorTamanho([], 25, 1000, tamanho)).toEqual([]);
  });

  it("manda tudo num lote só quando cabe", () => {
    expect(emLotesPorTamanho([1, 2, 3], 25, 1000, tamanho)).toEqual([[1, 2, 3]]);
  });
});
