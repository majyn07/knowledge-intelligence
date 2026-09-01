import { describe, expect, it } from "vitest";

import {
  aplicarReleitura,
  planejarReleitura,
  valeIncremental,
  type Carimbo,
  mesclarLinhas,
} from "./collectionSync";

const carimbo = (id: string, syncedAt: string): Carimbo => ({ id, syncedAt });

const memoria = (...pares: [string, string][]) => new Map(pares);

describe("planejarReleitura", () => {
  it("não busca nada quando nada mudou", () => {
    const plano = planejarReleitura(memoria(["a", "t1"], ["b", "t1"]), [
      carimbo("a", "t1"),
      carimbo("b", "t1"),
    ]);

    expect(plano.buscar).toEqual([]);
    expect(plano.remover).toEqual([]);
    expect(plano.intactos).toBe(2);
  });

  /* O caso que motivou tudo: um colega classifica um artigo entre 1.822. */
  it("busca só a linha que ganhou carimbo novo", () => {
    const plano = planejarReleitura(memoria(["a", "t1"], ["b", "t1"], ["c", "t1"]), [
      carimbo("a", "t1"),
      carimbo("b", "t2"),
      carimbo("c", "t1"),
    ]);

    expect(plano.buscar).toEqual(["b"]);
    expect(plano.intactos).toBe(2);
  });

  it("busca a linha que ainda não está aqui", () => {
    const plano = planejarReleitura(memoria(["a", "t1"]), [carimbo("a", "t1"), carimbo("novo", "t1")]);

    expect(plano.buscar).toEqual(["novo"]);
  });

  it("remove o que saiu da tabela", () => {
    const plano = planejarReleitura(memoria(["a", "t1"], ["some", "t1"]), [carimbo("a", "t1")]);

    expect(plano.remover).toEqual(["some"]);
    expect(plano.buscar).toEqual([]);
  });

  /*
    Carga anterior sem carimbo guardado. Buscar a linha é o lado seguro do erro:
    tela com dado velho e nada indicando é o defeito que não se percebe.
  */
  it("busca a linha cujo carimbo local não se conhece", () => {
    const plano = planejarReleitura(memoria(), [carimbo("a", "t1"), carimbo("b", "t1")]);

    expect(plano.buscar).toEqual(["a", "b"]);
    expect(plano.intactos).toBe(0);
  });

  it("tabela esvaziada remove tudo", () => {
    const plano = planejarReleitura(memoria(["a", "t1"], ["b", "t1"]), []);

    expect(plano.remover.sort()).toEqual(["a", "b"]);
    expect(plano.buscar).toEqual([]);
  });
});

describe("aplicarReleitura", () => {
  const identify = (item: { id: string; v: number }) => item.id;

  it("troca o relido e preserva o resto pelo mesmo objeto", () => {
    const a = { id: "a", v: 1 };
    const c = { id: "c", v: 1 };

    const resultado = aplicarReleitura({
      local: [a, { id: "b", v: 1 }, c],
      ordem: ["a", "b", "c"],
      buscados: [{ id: "b", v: 2 }],
      identify,
    });

    expect(resultado.map((item) => item.v)).toEqual([1, 2, 1]);
    /* O intocado tem de ser o mesmo objeto: é o que evita render de tudo. */
    expect(resultado[0]).toBe(a);
    expect(resultado[2]).toBe(c);
  });

  /*
    A lista não pode se reorganizar sozinha na tela de quem está olhando só
    porque um colega editou algo do outro lado.
  */
  it("segue a ordem do banco, e não a da memória", () => {
    const resultado = aplicarReleitura({
      local: [
        { id: "a", v: 1 },
        { id: "b", v: 1 },
      ],
      ordem: ["b", "a"],
      buscados: [],
      identify,
    });

    expect(resultado.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("deixa fora o que sumiu da ordem", () => {
    const resultado = aplicarReleitura({
      local: [
        { id: "a", v: 1 },
        { id: "some", v: 1 },
      ],
      ordem: ["a"],
      buscados: [],
      identify,
    });

    expect(resultado.map((item) => item.id)).toEqual(["a"]);
  });

  it("inclui a linha nova que só veio do banco", () => {
    const resultado = aplicarReleitura({
      local: [{ id: "a", v: 1 }],
      ordem: ["a", "nova"],
      buscados: [{ id: "nova", v: 9 }],
      identify,
    });

    expect(resultado.map((item) => item.id)).toEqual(["a", "nova"]);
  });
});

describe("valeIncremental", () => {
  it("vale quando pouca coisa mudou", () => {
    expect(valeIncremental({ buscar: ["a"], remover: [], intactos: 99 }, 100)).toBe(true);
  });

  /* Importação do portal vista de outra aba: dois passos custam mais que um. */
  it("não vale quando quase tudo mudou", () => {
    const buscar = Array.from({ length: 90 }, (_, i) => `id-${i}`);

    expect(valeIncremental({ buscar, remover: [], intactos: 10 }, 100)).toBe(false);
  });

  it("não vale sobre tabela vazia", () => {
    expect(valeIncremental({ buscar: [], remover: [], intactos: 0 }, 0)).toBe(false);
  });
});

/*
  O cache guarda linhas, e até aqui só a releitura inteira o reescrevia. Medido
  depois de classificar 52 artigos: o cache ficou com as 52 linhas antigas e
  toda abertura voltava a baixar as mesmas 52, para sempre.
*/
describe("mesclarLinhas", () => {
  const linha = (id: string, secao: string) => ({ id, section_id: secao });

  it("põe a linha nova no lugar da antiga", () => {
    const mescladas = mesclarLinhas({
      local: [linha("a", ""), linha("b", "sec-1")],
      ordem: ["a", "b"],
      buscadas: [linha("a", "sec-ifc")],
    });

    expect(mescladas).toEqual([linha("a", "sec-ifc"), linha("b", "sec-1")]);
  });

  it("aceita linha que ainda não estava no cache", () => {
    const mescladas = mesclarLinhas({
      local: [linha("a", "sec-1")],
      ordem: ["a", "nova"],
      buscadas: [linha("nova", "sec-2")],
    });

    expect(mescladas).toHaveLength(2);
  });

  /* Sem isto o registro apagado reapareceria na próxima abertura. */
  it("quem saiu da ordem sai do cache", () => {
    const mescladas = mesclarLinhas({
      local: [linha("a", "sec-1"), linha("apagada", "sec-2")],
      ordem: ["a"],
      buscadas: [],
    });

    expect(mescladas).toEqual([linha("a", "sec-1")]);
  });

  /* A ordem é a do carimbo remoto, como em `aplicarReleitura`. */
  it("segue a ordem que o banco devolveu", () => {
    const mescladas = mesclarLinhas({
      local: [linha("a", ""), linha("b", ""), linha("c", "")],
      ordem: ["c", "a", "b"],
      buscadas: [],
    });

    expect(mescladas.map((l) => (l as { id: string }).id)).toEqual(["c", "a", "b"]);
  });

  /* Guardar uma linha sem `id` seria guardar algo que ninguém acha depois. */
  it("linha sem identificador legível não entra", () => {
    const mescladas = mesclarLinhas({
      local: [linha("a", "sec-1"), { semId: true }, null],
      ordem: ["a"],
      buscadas: [],
    });

    expect(mescladas).toEqual([linha("a", "sec-1")]);
  });
});
