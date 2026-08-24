import { describe, expect, it } from "vitest";

import {
  parseFieldFill,
  type FieldFillRequest,
  type FilledField,
  type FilledList,
} from "./fieldFill";

/** Estreita a união nos testes que falam de valor simples. */
function valorDe(campo: FilledField | undefined): string | undefined {
  return campo && campo.kind === "valor" ? campo.value : undefined;
}

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
      { kind: "valor", name: "name", value: "Reduzir retrabalho", reason: "Está no título" },
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

    expect(valorDe(fields[0])).toBe("Eberick");
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
    expect(valorDe(fields[0])).toBe("Primeira");
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

    expect(valorDe(parseFieldFill(bruto, PEDIDO).fields[0])).toBe("Meta");
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

const COM_LISTA: FieldFillRequest = {
  subject: "Atendimento",
  fields: [
    { name: "title", label: "Título", kind: "texto" },
    {
      name: "messages",
      label: "Conversa",
      kind: "lista",
      itemFields: [
        { name: "author", label: "Quem falou" },
        { name: "body", label: "Mensagem" },
      ],
    },
  ],
  source: "texto",
};

function lista(fields: FilledField[]): FilledList | undefined {
  return fields.find((campo): campo is FilledList => campo.kind === "lista");
}

describe("parseFieldFill com campo de lista", () => {
  it("transcreve a sequência mantendo a ordem do documento", () => {
    /*
      A conversa é a evidência que a análise lê depois. Ordem trocada faria a
      resposta aparecer antes da pergunta.
    */
    const { fields } = parseFieldFill(
      resposta({
        fields: [
          {
            name: "messages",
            items: [
              { author: "Cliente", body: "Não consigo processar" },
              { author: "Analista", body: "Ative o P-Delta" },
            ],
          },
        ],
      }),
      COM_LISTA
    );

    expect(lista(fields)?.items).toEqual([
      { author: "Cliente", body: "Não consigo processar" },
      { author: "Analista", body: "Ative o P-Delta" },
    ]);
  });

  it("descarta coluna que não perguntamos", () => {
    const { fields } = parseFieldFill(
      resposta({
        fields: [{ name: "messages", items: [{ author: "Cliente", body: "oi", ip: "10.0.0.1" }] }],
      }),
      COM_LISTA
    );

    expect(lista(fields)?.items).toEqual([{ author: "Cliente", body: "oi" }]);
  });

  it("item sem nenhum valor não vira linha em branco", () => {
    /*
      Linha vazia no formulário é pior que linha a menos: parece conteúdo que
      se perdeu.
    */
    const { fields } = parseFieldFill(
      resposta({
        fields: [{ name: "messages", items: [{ author: "  ", body: "" }, { body: "vale" }] }],
      }),
      COM_LISTA
    );

    expect(lista(fields)?.items).toEqual([{ body: "vale" }]);
  });

  it("lista vazia não vira proposta", () => {
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "messages", items: [] }] }),
      COM_LISTA
    );

    expect(fields).toEqual([]);
  });

  it("limita o número de itens", () => {
    /*
      Um documento de duzentas páginas viraria duzentas mensagens, e ninguém
      revisa duzentas.
    */
    const muitos = Array.from({ length: 200 }, (_, i) => ({ body: `mensagem ${i}` }));

    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "messages", items: muitos }] }),
      COM_LISTA
    );

    expect(lista(fields)?.items).toHaveLength(60);
  });

  it("campo de valor mandado como lista não vira nada", () => {
    /*
      Resposta desalinhada não pode escrever num campo simples uma sequência
      que ele não sabe mostrar.
    */
    const { fields } = parseFieldFill(
      resposta({ fields: [{ name: "title", items: [{ body: "x" }] }] }),
      COM_LISTA
    );

    expect(fields).toEqual([]);
  });
});
