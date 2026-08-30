import { describe, expect, it } from "vitest";

import { DOCK_INICIAL, encaixar, lerPosicao } from "./dockPosition";

const painel = { width: 400, height: 560 };

describe("encaixar", () => {
  it("deixa como está o que já cabe", () => {
    expect(encaixar({ right: 24, bottom: 24 }, { width: 1_920, height: 1_080 }, painel)).toEqual({
      right: 24,
      bottom: 24,
    });
  });

  /*
    O caso que motivou o encaixe: posição gravada num monitor largo abre o
    painel fora da tela no notebook, e quem abrisse não veria nada nem teria
    como arrastar de volta.
  */
  it("traz de volta o que ficou fora da tela numa janela menor", () => {
    const dentro = encaixar({ right: 2_100, bottom: 24 }, { width: 1_366, height: 768 }, painel);

    expect(dentro.right).toBeLessThanOrEqual(1_366 - painel.width);
    expect(dentro.right).toBeGreaterThan(0);
  });

  it("não deixa passar da borda de baixo", () => {
    const dentro = encaixar({ right: 24, bottom: -50 }, { width: 1_366, height: 768 }, painel);

    expect(dentro.bottom).toBeGreaterThan(0);
  });

  /*
    Janela menor que o painel devolve a origem, e não um valor negativo:
    negativo põe a barra de arrastar acima do topo e o painel fica sem alça.
  */
  it("janela menor que o painel ainda devolve posição pegável", () => {
    const dentro = encaixar({ right: 24, bottom: 24 }, { width: 320, height: 400 }, painel);

    expect(dentro.right).toBeGreaterThan(0);
    expect(dentro.bottom).toBeGreaterThan(0);
  });
});

describe("lerPosicao", () => {
  it("lê a posição guardada", () => {
    expect(lerPosicao({ right: 100, bottom: 200 })).toEqual({ right: 100, bottom: 200 });
  });

  /* O armazenamento guarda o que alguma versão anterior gravou, ou lixo. */
  it("o que não é posição volta ao início, e não quebra", () => {
    expect(lerPosicao(null)).toEqual(DOCK_INICIAL);
    expect(lerPosicao("24,24")).toEqual(DOCK_INICIAL);
    expect(lerPosicao({ right: "muito" })).toEqual(DOCK_INICIAL);
    expect(lerPosicao({ right: Number.NaN, bottom: 10 })).toEqual({
      right: DOCK_INICIAL.right,
      bottom: 10,
    });
  });
});
