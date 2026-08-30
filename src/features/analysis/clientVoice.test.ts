import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";

import { falaDoCliente, trechosRepetidos } from "./clientVoice";

const conversa = (
  ticketId: string,
  falas: [SupportConversation["messages"][number]["role"], string][]
): SupportConversation => ({
  id: `c-${ticketId}`,
  ticketId,
  messages: falas.map(([role, body], i) => ({
    id: `${ticketId}-${i}`,
    author: role === "cliente" ? "Cliente" : "Suporte",
    role,
    body,
    createdAt: "2026-08-20T10:00:00.000Z",
  })),
});

/** Um lote de conversas idênticas, para o limiar de 2% ter onde morder. */
const muitas = (fala: string, quantas: number) =>
  Array.from({ length: quantas }, (_, i) => conversa(`t${i}`, [["cliente", fala]]));

describe("trechosRepetidos", () => {
  /*
    Medido nas 974 do acervo: 5.318 falas distintas do cliente, e 5.148
    aparecem numa conversa só. Passando de 2%, sobram dezoito — e as dezoito
    são clique de menu ou saudação.
  */
  it("fala repetida em muitas conversas é botão, não descrição", () => {
    const botoes = trechosRepetidos([
      ...muitas("Estou ciente e desejo continuar", 50),
      conversa("x", [["cliente", "O modelo IFC abre deslocado"]]),
    ]);

    expect(botoes.has("estou ciente e desejo continuar")).toBe(true);
    expect(botoes.has("o modelo ifc abre deslocado")).toBe(false);
  });

  it("fala de uma conversa só nunca é botão", () => {
    const botoes = trechosRepetidos([
      ...muitas("qualquer coisa", 50),
      conversa("x", [["cliente", "A viga some ao recalcular"]]),
    ]);

    expect(botoes.has("a viga some ao recalcular")).toBe(false);
  });

  /*
    Clicar cinco vezes no mesmo botão não o torna mais botão do que já era.

    Cem conversas põem o limiar em duas: contada por mensagem, a repetição
    dentro de **uma** conversa passaria; contada por conversa, não.
  */
  it("conta por conversa, e não por mensagem", () => {
    const botoes = trechosRepetidos([
      conversa("t1", [
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
      ]),
      ...Array.from({ length: 99 }, (_, i) =>
        conversa(`u${i}`, [["cliente", `descrição única ${i}`]])
      ),
    ] as SupportConversation[]);

    expect(botoes.has("ok")).toBe(false);
  });

  /* O mesmo botão chega com caixa e espaço diferentes conforme o canal. */
  it("caixa e espaço não criam dois botões", () => {
    const botoes = trechosRepetidos([
      ...muitas("Setup e Suporte ao Produto", 25),
      ...muitas("  setup e  suporte ao produto  ", 25),
    ]);

    expect(botoes.has("setup e suporte ao produto")).toBe(true);
  });

  /* O que o suporte respondeu não é fala do cliente. */
  it("só a voz do cliente entra na conta", () => {
    const botoes = trechosRepetidos(
      Array.from({ length: 50 }, (_, i) =>
        conversa(`t${i}`, [["suporte", "Atenciosamente, equipe AltoQi"]])
      )
    );

    expect(botoes.size).toBe(0);
  });

  it("indexa uma vez por coleção", () => {
    const lista = muitas("ok", 50);

    expect(trechosRepetidos(lista)).toBe(trechosRepetidos(lista));
  });

  it("sem conversa nenhuma, nenhum botão", () => {
    expect(trechosRepetidos([]).size).toBe(0);
  });

  /*
    A fração sozinha tem um buraco em acervo pequeno: com duas conversas, 2% dá
    0,04 e qualquer fala passa — a descrição do cliente inteira viraria botão, e
    a triagem cairia no título sem ninguém entender por quê. Vale para a equipe
    que está começando tanto quanto para o teste que o achou.
  */
  it("acervo raso não transforma toda fala em botão", () => {
    const botoes = trechosRepetidos([
      conversa("t1", [["cliente", "A inércia fissurada não bate"]]),
      conversa("t2", [["cliente", "A flecha continua alta"]]),
    ]);

    expect(botoes.size).toBe(0);
  });

  /*
    O aviso de segurança que o servidor de e-mail injeta vem **antes** do texto
    da pessoa. Marcador estrutural corta para baixo e não o alcança; descartar a
    mensagem inteira jogaria fora a descrição junto. Por parágrafo, sai o aviso
    e fica o que a pessoa contou — e era ele que colava "pagamento de boleto"
    com "exportar do Builder para o Revit".
  */
  it("banner no topo sai, e a descrição embaixo dele fica", () => {
    const aviso = "Aviso de Segurança: esta mensagem foi enviada por um remetente externo.";

    const conversas = [
      conversa("t1", [["cliente", `${aviso}

O boleto de julho não chegou.`]]),
      conversa("t2", [["cliente", `${aviso}

Como exporto do Builder para o Revit?`]]),
      conversa("t3", [["cliente", `${aviso}

A licença não ativa.`]]),
      conversa("t4", [["cliente", `${aviso}

O programa fecha sozinho.`]]),
    ];

    const repetidos = trechosRepetidos(conversas);

    expect(repetidos.has(aviso.toLocaleLowerCase("pt-BR"))).toBe(true);
    expect(falaDoCliente(conversas[0], repetidos)).toBe("O boleto de julho não chegou.");
    expect(falaDoCliente(conversas[1], repetidos)).toBe("Como exporto do Builder para o Revit?");
  });

  it("mesmo raso, o que se repete de verdade ainda é botão", () => {
    const botoes = trechosRepetidos([
      conversa("t1", [["cliente", "ok"]]),
      conversa("t2", [["cliente", "ok"]]),
      conversa("t3", [["cliente", "ok"]]),
      conversa("t4", [["cliente", "ok"]]),
      conversa("t5", [["cliente", "descrição de verdade aqui"]]),
    ]);

    expect(botoes.has("ok")).toBe(true);
    expect(botoes.has("descrição de verdade aqui")).toBe(false);
  });
});

describe("falaDoCliente", () => {
  it("junta o que o cliente descreveu", () => {
    const texto = falaDoCliente(
      conversa("t1", [
        ["cliente", "O modelo IFC abre deslocado"],
        ["suporte", "Bom dia, atenciosamente"],
        ["cliente", "acontece desde a atualização"],
      ]),
      new Set()
    );

    expect(texto).toBe("O modelo IFC abre deslocado acontece desde a atualização");
  });

  /*
    O clique não descreve nada, e era ele que dominava: "estou ciente e desejo
    continuar" aparece em 44% das conversas.
  */
  it("o que foi clicado fica de fora", () => {
    const texto = falaDoCliente(
      conversa("t1", [
        ["cliente", "Estou ciente e desejo continuar"],
        ["cliente", "A viga some ao recalcular"],
      ]),
      new Set(["estou ciente e desejo continuar"])
    );

    expect(texto).toBe("A viga some ao recalcular");
  });

  /*
    Vazio é resposta, e quem chama decide: na triagem, é voltar para o título,
    que é pouco mas é do atendimento.
  */
  it("conversa só de cliques devolve vazio", () => {
    expect(falaDoCliente(conversa("t1", [["cliente", "ok"]]), new Set(["ok"]))).toBe("");
  });

  it("sem conversa devolve vazio", () => {
    expect(falaDoCliente(undefined, new Set())).toBe("");
  });
});
