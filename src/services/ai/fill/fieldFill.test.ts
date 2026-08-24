import { describe, expect, it } from "vitest";

import { parseFieldFill, type FieldFillRequest } from "./fieldFill";

const PEDIDO: FieldFillRequest = {
  subject: "Projeto de melhoria",
  fields: [
    { name: "name", label: "Nome do projeto", kind: "texto" },
    { name: "goal", label: "Meta", kind: "texto" },
    {
      name: "product",
      label: "Produto",
      kind: "escolha",
      options: ["Eberick", "QiBuilder", "Hydros"],
    },
  ],
  source: "texto qualquer",
};

function resposta(corpo: unknown): string {
  return JSON.stringify(corpo);
}

describe("parseFieldFill", () => {
  it("aceita valor de texto e a justificativa que o torna revisável", () => {
    const { fields } = parseFieldFill(
      resposta({
        fields: [{ name: "name", value: "Reduzir retrabalho", reason: "Está no título" }],
      }),
      PEDIDO
    );

    expect(fields).toEqual([
      { name: "name", value: "Reduzir retrabalho", reason: "Está no título" },
    ]);
  });

  it("descarta campo que não perguntamos", () => {
    /*
      Resposta desalinhada escreveria num campo que a tela não mostrou — e o
      registro sairia com dado que ninguém reviu.
    */
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "owner", value: "Alguém" }] }),
      PEDIDO
    );

    expect(fields).toEqual([]);
  });

  it("descarta escolha fora do catálogo em vez de aproximar", () => {
    /*
      "Eberick 2024" não existe no cadastro. Encaixar no mais parecido é a
      classificação inventada que o produto recusa.
    */
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "product", value: "Eberick 2024" }] }),
      PEDIDO
    );

    expect(fields).toEqual([]);
  });

  it("aceita escolha com grafia diferente, e grava a do catálogo", () => {
    /*
      Recusar "eberick" jogaria fora uma resposta certa. Gravar "eberick"
      deixaria a grafia do modelo vazar para dentro do registro.
    */
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "product", value: "  eberick " }] }),
      PEDIDO
    );

    expect(fields[0]?.value).toBe("Eberick");
  });

  it("fica com o primeiro valor quando o modelo manda dois para o mesmo campo", () => {
    const { fields } = parseFieldFill(
      resposta({
        fields: [
          { name: "goal", value: "Primeira" },
          { name: "goal", value: "Segunda" },
        ],
      }),
      PEDIDO
    );

    expect(fields).toHaveLength(1);
    expect(fields[0]?.value).toBe("Primeira");
  });

  it("valor vazio não vira campo preenchido", () => {
    /*
      Campo com string vazia apagaria o que a pessoa já tinha digitado, com
      cara de resposta do modelo.
    */
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "goal", value: "   " }] }),
      PEDIDO
    );

    expect(fields).toEqual([]);
  });

  it("traz as perguntas, que é onde está metade do valor", () => {
    const { questions } = parseFieldFill(
      resposta({
        fields: [],
        questions: ["Qual o prazo?", "Quem é o responsável?"],
      }),
      PEDIDO
    );

    expect(questions).toEqual(["Qual o prazo?", "Quem é o responsável?"]);
  });

  it("limita o número de perguntas", () => {
    const { questions } = parseFieldFill(
      resposta({ questions: Array.from({ length: 12 }, (_, i) => `Pergunta ${i}`) }),
      PEDIDO
    );

    expect(questions).toHaveLength(5);
  });

  it("tolera o JSON cercado de crase", () => {
    const bruto = '```json\n{"fields":[{"name":"goal","value":"Meta"}]}\n```';

    expect(parseFieldFill(bruto, PEDIDO).fields[0]?.value).toBe("Meta");
  });

  it("resposta ilegível vira resultado vazio, e não exceção", () => {
    /*
      A rota trata falha de provedor; formato inválido não pode derrubar o
      preenchimento inteiro — a tela continua com o que a pessoa digitou.
    */
    expect(parseFieldFill("isto não é json", PEDIDO)).toEqual({
      fields: [],
      questions: [],
    });

    expect(parseFieldFill(null, PEDIDO)).toEqual({ fields: [], questions: [] });
  });

  it("ignora item que não é objeto", () => {
    const { fields } = parseFieldFill(
      resposta({ fields: ["texto solto", 42, null] }),
      PEDIDO
    );

    expect(fields).toEqual([]);
  });
});
