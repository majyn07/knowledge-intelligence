import { describe, expect, it } from "vitest";

import { chamadoDaAssociacao, threadsDaPagina, toThreadTicket } from "./threadTicketMapping";

const conversa = (extra: Record<string, unknown> = {}) => ({
  id: "6952014856",
  createdAt: "2026-08-10T09:00:00Z",
  closedAt: "2026-08-12T17:30:00Z",
  status: "CLOSED",
  ...extra,
});

const msg = (extra: Record<string, unknown> = {}) => ({
  type: "MESSAGE",
  direction: "INCOMING",
  createdAt: "2026-08-10T09:00:00Z",
  text: "Mensagem.",
  ...extra,
});

/** Uma fala do suporte, com o ator declarado como agente. */
const doSuporte = (extra: Record<string, unknown> = {}) =>
  msg({ direction: "OUTGOING", createdBy: "A-1", ...extra });

/** E uma do robô de triagem, que responde antes de todo mundo. */
const doRobo = (extra: Record<string, unknown> = {}) =>
  msg({ direction: "OUTGOING", createdBy: "B-1", ...extra });

const ATORES = new Map([
  ["A-1", { id: "A-1", name: "Matheus", type: "AGENT" }],
  ["B-1", { id: "B-1", name: "Bot", type: "BOT" }],
]) as never;

describe("toThreadTicket", () => {
  /* No e-mail o assunto é o que a pessoa escreveu para dizer do que se trata. */
  it("usa o assunto do e-mail quando ele existe", () => {
    const t = toThreadTicket(
      conversa(),
      [
        msg({ subject: "Erro D15 ao processar o pavimento", text: "Segue o print." }),
        doSuporte({ createdAt: "2026-08-11T10:00:00Z", text: "Atualize o release." }),
      ],
      ATORES
    );

    expect(t?.title).toBe("Erro D15 ao processar o pavimento");
    expect(t?.titleOrigin).toBe("assunto");
    expect(t?.solution).toBe("Atualize o release.");
  });

  /* No chat não há assunto, e o recorte precisa ser dito como recorte. */
  it("no chat, recorta a primeira coisa que o cliente escreveu", () => {
    const t = toThreadTicket(
      conversa(),
      [
        msg({ text: "Bom dia, a licença não ativa depois que formatei" }),
        doSuporte({ createdAt: "2026-08-11T10:00:00Z", text: "Vou verificar." }),
      ],
      ATORES
    );

    expect(t?.title).toBe("Bom dia, a licença não ativa depois que formatei");
    expect(t?.titleOrigin).toBe("primeira-mensagem");
  });

  it("corta o título longo na palavra, e marca que cortou", () => {
    const longo = "palavra ".repeat(40);
    const t = toThreadTicket(conversa(), [msg({ text: longo })]);

    expect(t!.title.length).toBeLessThanOrEqual(121);
    expect(t!.title.endsWith("…")).toBe(true);
    expect(t!.title).not.toContain("palav…");
  });

  it("a solução é a última resposta do suporte", () => {
    const t = toThreadTicket(
      conversa(),
      [
        msg({ subject: "Dúvida", text: "Pergunta." }),
        doSuporte({ createdAt: "2026-08-11T09:00:00Z", text: "Primeira resposta." }),
        doSuporte({ createdAt: "2026-08-11T15:00:00Z", text: "Resolvido assim." }),
      ],
      ATORES
    );

    expect(t?.solution).toBe("Resolvido assim.");
  });

  it("sem resposta do suporte, a solução fica vazia", () => {
    const t = toThreadTicket(conversa(), [msg({ subject: "Dúvida", text: "Pergunta." })]);

    expect(t?.solution).toBe("");
  });

  /*
    Medido contra as conversas reais: o robô de triagem responde antes de todo mundo,
    e a última fala dele é uma pergunta. "Qual é o melhor e-mail para contato"
    virou solução de um atendimento até esta regra existir.
  */
  it("o robô de triagem não vira solução", () => {
    const t = toThreadTicket(
      conversa(),
      [
        msg({ text: "Minha licença parou de funcionar depois da formatação." }),
        doRobo({ createdAt: "2026-08-10T09:05:00Z", text: "Qual o melhor e-mail para contato?" }),
      ],
      ATORES
    );

    expect(t?.solution).toBe("");
  });

  /*
    O chat começa com o cliente escrevendo só o próprio nome. Um conversa real virou
    o título "Alisson", que não identifica nada na lista depois.
  */
  it("pula a saudação curta ao montar o título do chat", () => {
    const t = toThreadTicket(
      conversa(),
      [
        msg({ text: "Alisson" }),
        msg({ createdAt: "2026-08-10T09:01:00Z", text: "O Eberick fecha sozinho ao abrir o projeto" }),
      ],
      ATORES
    );

    expect(t?.title).toBe("O Eberick fecha sozinho ao abrir o projeto");
  });

  it("usa a curta mesmo assim quando não há outra", () => {
    const t = toThreadTicket(conversa(), [msg({ text: "Alisson" })], ATORES);

    expect(t?.title).toBe("Alisson");
  });

  it("prefere o fechamento, e cai na criação enquanto está aberto", () => {
    expect(toThreadTicket(conversa(), [msg({ text: "Oi." })])?.date).toBe("2026-08-12");
    expect(toThreadTicket(conversa({ closedAt: "" }), [msg({ text: "Oi." })])?.date).toBe("2026-08-10");
  });

  /*
    Conversa só com evento de sistema não é atendimento. Grava-lo criaria uma linha
    sem assunto e sem conversa, e a análise trataria isso como evidência.
  */
  it("recusa conversa sem mensagem de gente", () => {
    expect(
      toThreadTicket(conversa(), [
        { type: "THREAD_STATUS_CHANGE", newStatus: "CLOSED" },
        { type: "ASSIGNMENT" },
      ])
    ).toBeNull();
  });

  it("recusa conversa sem identificador", () => {
    expect(toThreadTicket(conversa({ id: "" }), [msg({ text: "Oi." })])).toBeNull();
  });

  it("tira a marcação do HTML do e-mail", () => {
    const t = toThreadTicket(conversa(), [
      msg({ subject: "Dúvida", richText: "<p>Bom <b>dia</b>, tenho um problema.</p>" }),
    ]);

    expect(t?.solution).toBe("");
    expect(t?.messageCount).toBe(1);
  });

  it("conta as mensagens de gente, não os eventos de sistema", () => {
    const t = toThreadTicket(conversa(), [
      { type: "THREAD_STATUS_CHANGE" },
      msg({ subject: "Dúvida", text: "Pergunta." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T09:00:00Z", text: "Resposta." }),
      { type: "ASSIGNMENT" },
    ]);

    expect(t?.messageCount).toBe(2);
  });

  /* A API não garante ordem, e a última resposta depende dela. */
  it("ordena por data antes de decidir qual é a última", () => {
    const t = toThreadTicket(
      conversa(),
      [
        doSuporte({ createdAt: "2026-08-11T15:00:00Z", text: "Depois." }),
        doSuporte({ createdAt: "2026-08-11T09:00:00Z", text: "Antes." }),
        msg({ subject: "Dúvida", text: "Pergunta." }),
      ],
      ATORES
    );

    expect(t?.solution).toBe("Depois.");
  });
});

describe("threadsDaPagina", () => {
  it("reduz a página ao que interessa", () => {
    const pagina = {
      results: [
        { id: "1", createdAt: "2026-01-01T00:00:00Z", inboxId: "474522581", spam: false },
        { id: "2", createdAt: "2026-02-01T00:00:00Z" },
      ],
    };

    expect(threadsDaPagina(pagina)).toEqual([
      { id: "1", criadoEm: "2026-01-01T00:00:00Z" },
      { id: "2", criadoEm: "2026-02-01T00:00:00Z" },
    ]);
  });

  it("descarta conversa sem identificador", () => {
    expect(threadsDaPagina({ results: [{ createdAt: "2026-01-01" }] })).toEqual([]);
  });

  it("não quebra com resposta fora de forma", () => {
    expect(threadsDaPagina(null)).toEqual([]);
    expect(threadsDaPagina({})).toEqual([]);
  });
});

describe("chamadoDaAssociacao", () => {
  /*
    `toObjectId` vem como número, e o utilitário de texto devolve vazio para o
    que não é string. Isso fez a associação voltar vazia em cem de cem no
    piloto, sem erro em lugar nenhum: não havia erro, era leitura errada de um
    valor válido.
  */
  it("lê o identificador que vem como número", () => {
    expect(chamadoDaAssociacao({ results: [{ toObjectId: 47809640251 }] })).toBe("47809640251");
  });

  it("lê também quando vem como texto", () => {
    expect(chamadoDaAssociacao({ results: [{ toObjectId: "47809640251" }] })).toBe("47809640251");
  });

  /* Conversa de robô e de marketing não gera chamado, e isso é estado legítimo. */
  it("devolve nada quando não há associação", () => {
    expect(chamadoDaAssociacao({ results: [] })).toBeUndefined();
    expect(chamadoDaAssociacao({})).toBeUndefined();
    expect(chamadoDaAssociacao(null)).toBeUndefined();
  });

  it("devolve nada para valor que não serve de identificador", () => {
    expect(chamadoDaAssociacao({ results: [{ toObjectId: "  " }] })).toBeUndefined();
    expect(chamadoDaAssociacao({ results: [{ toObjectId: null }] })).toBeUndefined();
  });

  it("fica com o primeiro quando há mais de um", () => {
    expect(
      chamadoDaAssociacao({ results: [{ toObjectId: 1 }, { toObjectId: 2 }] })
    ).toBe("1");
  });
});
