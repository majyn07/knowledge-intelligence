import { describe, expect, it } from "vitest";

import { semPontoFinal } from "./frase";

describe("semPontoFinal", () => {
  it("tira o ponto que a mensagem do servidor já traz", () => {
    expect(semPontoFinal("Espere alguns minutos e peça de novo.")).toBe(
      "Espere alguns minutos e peça de novo"
    );
  });

  it("tira pontuação e espaço sobrando, e deixa o resto como está", () => {
    expect(semPontoFinal("Falhou;  ")).toBe("Falhou");
    expect(semPontoFinal("Sem ponto")).toBe("Sem ponto");
    expect(semPontoFinal("Versão 2.0 saiu.")).toBe("Versão 2.0 saiu");
  });
});
