import { describe, expect, it } from "vitest";
import { z } from "zod";

import { invalidRequestMessage } from "./invalidRequest";

const esquema = z
  .object({
    context: z
      .object({
        ticket: z.object({ id: z.string().min(1), title: z.string().min(1) }).strict(),
      })
      .strict(),
  })
  .strict();

function erroDe(entrada: unknown) {
  const resultado = esquema.safeParse(entrada);

  if (resultado.success) throw new Error("o esquema deveria ter recusado");

  return resultado.error;
}

describe("invalidRequestMessage", () => {
  /*
    O caso real: o registro cru do atendimento entrou no modelo e o contrato
    estrito passou a recusar todo pedido, sem nada apontando para o campo a
    mais.
  */
  it("aponta o caminho do campo que sobrou", () => {
    const mensagem = invalidRequestMessage(
      "Dados inválidos.",
      erroDe({ context: { ticket: { id: "t1", title: "Erro", raw: { tudo: 1 } } } })
    );

    /*
      O Zod junta as chaves a mais da mesma caixa numa queixa só, então o
      caminho vai até a caixa e o nome do campo vem no texto. Os dois estão
      lá, que é o que faltava.
    */
    expect(mensagem).toContain("context.ticket");
    expect(mensagem).toContain("raw");
  });

  it("aponta o campo que falta", () => {
    const mensagem = invalidRequestMessage("Dados inválidos.", erroDe({ context: {} }));

    expect(mensagem).toContain("context.ticket");
  });

  /* Uma mensagem do tamanho do pedido é uma mensagem que ninguém lê. */
  it("corta em cinco e diz quantos ficaram de fora", () => {
    const oitoCampos = z.object(
      Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`campo${i}`, z.string()]))
    );

    const resultado = oitoCampos.safeParse({});
    if (resultado.success) throw new Error("o esquema deveria ter recusado");

    const mensagem = invalidRequestMessage("Dados inválidos.", resultado.error);

    expect(mensagem.split(";")).toHaveLength(5);
    expect(mensagem).toMatch(/e mais 3\.$/);
  });

  /* Forma, e não conteúdo: nada do pedido atravessa para a resposta. */
  it("não copia valor nenhum do pedido", () => {
    const mensagem = invalidRequestMessage(
      "Dados inválidos.",
      erroDe({ context: { ticket: { id: "t1", title: "Erro", email: "cliente@empresa.com.br" } } })
    );

    expect(mensagem).not.toContain("cliente@empresa.com.br");
    expect(mensagem).toContain("email");
  });

  it("mantém o assunto na frente", () => {
    const mensagem = invalidRequestMessage("Dados inválidos para sugerir seção.", erroDe({}));

    expect(mensagem.startsWith("Dados inválidos para sugerir seção.")).toBe(true);
  });
});
