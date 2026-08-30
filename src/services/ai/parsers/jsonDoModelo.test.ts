import { describe, expect, it } from "vitest";

import { jsonDoModelo } from "./jsonDoModelo";

describe("jsonDoModelo", () => {
  it("lê o JSON puro", () => {
    expect(jsonDoModelo('{"a":1}')).toEqual({ a: 1 });
  });

  /*
    O modelo às vezes cerca a resposta apesar de pedirmos que não. Recusar por
    causa da cerca desperdiça uma resposta correta — e era o que a análise
    fazia, sozinha entre os três parsers: uma perdida em duas contra a API real.
  */
  it("tolera a cerca de crase, com e sem o rótulo", () => {
    expect(jsonDoModelo('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonDoModelo('```\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(jsonDoModelo('  ```JSON\n{"a":1}\n```  ')).toEqual({ a: 1 });
  });

  it("espaço em volta não atrapalha", () => {
    expect(jsonDoModelo('\n\n  {"a":1}  \n')).toEqual({ a: 1 });
  });

  /*
    Devolve `null` em vez de lançar: quem chama decide o que fazer com uma
    resposta que não serve, e os três chamadores decidem coisas diferentes.
  */
  it("o que não é JSON vira nulo", () => {
    expect(jsonDoModelo("Desculpe, não consegui analisar este atendimento.")).toBe(null);
    expect(jsonDoModelo("")).toBe(null);
  });

  /* JSON cortado no meio não é JSON, e é assim que uma resposta truncada chega. */
  it("JSON aberto e sem fechar vira nulo", () => {
    expect(jsonDoModelo('{"a":1,"b":{"c"')).toBe(null);
  });

  it("lista no topo também é resposta válida", () => {
    expect(jsonDoModelo("[1,2]")).toEqual([1, 2]);
  });
});
