import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarCoalescer } from "./coalescer";

/**
 * O tempo real avisa por linha. Uma classificação em massa de noventa e oito
 * artigos produzia noventa e oito releituras do acervo inteiro em cada aba
 * aberta da equipe, e o trabalho das noventa e oito era o mesmo.
 */
describe("criarCoalescer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const relogio = () => Date.now();

  it("roda uma vez só depois da rajada", () => {
    const acao = vi.fn();
    const c = criarCoalescer(acao, 400, 5000, relogio);

    for (let i = 0; i < 98; i += 1) c.pedir();

    expect(acao).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    expect(acao).toHaveBeenCalledTimes(1);
  });

  it("espera o silêncio antes de rodar", () => {
    const acao = vi.fn();
    const c = criarCoalescer(acao, 400, 5000, relogio);

    c.pedir();
    vi.advanceTimersByTime(300);
    c.pedir();
    vi.advanceTimersByTime(300);

    expect(acao).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(acao).toHaveBeenCalledTimes(1);
  });

  /*
    A importação do portal grava por quarenta e cinco minutos sem parar. Só com
    a espera, o silêncio nunca chegaria e a tela de quem acompanha ficaria
    parada o tempo todo.
  */
  it("não deixa a tela parada durante uma gravação longa", () => {
    const acao = vi.fn();
    const c = criarCoalescer(acao, 400, 1000, relogio);

    for (let i = 0; i < 10; i += 1) {
      c.pedir();
      vi.advanceTimersByTime(300);
    }

    expect(acao.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("começa uma rajada nova depois de rodar", () => {
    const acao = vi.fn();
    const c = criarCoalescer(acao, 400, 5000, relogio);

    c.pedir();
    vi.advanceTimersByTime(400);
    c.pedir();
    vi.advanceTimersByTime(400);

    expect(acao).toHaveBeenCalledTimes(2);
  });

  /* Desmontar no meio da rajada não pode deixar a ação disparar depois. */
  it("cancelar impede a execução pendente", () => {
    const acao = vi.fn();
    const c = criarCoalescer(acao, 400, 5000, relogio);

    c.pedir();
    c.cancelar();
    vi.advanceTimersByTime(5000);

    expect(acao).not.toHaveBeenCalled();
  });

  it("não roda sozinho sem pedido nenhum", () => {
    const acao = vi.fn();
    criarCoalescer(acao, 400, 5000, relogio);

    vi.advanceTimersByTime(10_000);

    expect(acao).not.toHaveBeenCalled();
  });
});
