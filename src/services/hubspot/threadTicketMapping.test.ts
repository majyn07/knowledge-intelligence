import { describe, expect, it } from "vitest";

import { threadsDaPagina, toThreadTicket } from "./threadTicketMapping";

const fio = (extra: Record<string, unknown> = {}) => ({
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

describe("toThreadTicket", () => {
  /* No e-mail o assunto é o que a pessoa escreveu para dizer do que se trata. */
  it("usa o assunto do e-mail quando ele existe", () => {
    const t = toThreadTicket(fio(), [
      msg({ subject: "Erro D15 ao processar o pavimento", text: "Segue o print." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T10:00:00Z", text: "Atualize o release." }),
    ]);

    expect(t?.title).toBe("Erro D15 ao processar o pavimento");
    expect(t?.titleOrigin).toBe("assunto");
    expect(t?.solution).toBe("Atualize o release.");
  });

  /* No chat não há assunto, e o recorte precisa ser dito como recorte. */
  it("no chat, recorta a primeira coisa que o cliente escreveu", () => {
    const t = toThreadTicket(fio(), [
      msg({ text: "Bom dia, a licença não ativa depois que formatei" }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T10:00:00Z", text: "Vou verificar." }),
    ]);

    expect(t?.title).toBe("Bom dia, a licença não ativa depois que formatei");
    expect(t?.titleOrigin).toBe("primeira-mensagem");
  });

  it("corta o título longo na palavra, e marca que cortou", () => {
    const longo = "palavra ".repeat(40);
    const t = toThreadTicket(fio(), [msg({ text: longo })]);

    expect(t!.title.length).toBeLessThanOrEqual(121);
    expect(t!.title.endsWith("…")).toBe(true);
    expect(t!.title).not.toContain("palav…");
  });

  it("a solução é a última resposta do suporte", () => {
    const t = toThreadTicket(fio(), [
      msg({ subject: "Dúvida", text: "Pergunta." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T09:00:00Z", text: "Primeira resposta." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T15:00:00Z", text: "Resolvido assim." }),
    ]);

    expect(t?.solution).toBe("Resolvido assim.");
  });

  it("sem resposta do suporte, a solução fica vazia", () => {
    const t = toThreadTicket(fio(), [msg({ subject: "Dúvida", text: "Pergunta." })]);

    expect(t?.solution).toBe("");
  });

  it("prefere o fechamento, e cai na criação enquanto está aberto", () => {
    expect(toThreadTicket(fio(), [msg({ text: "Oi." })])?.date).toBe("2026-08-12");
    expect(toThreadTicket(fio({ closedAt: "" }), [msg({ text: "Oi." })])?.date).toBe("2026-08-10");
  });

  /*
    Fio só com evento de sistema não é atendimento. Grava-lo criaria uma linha
    sem assunto e sem conversa, e a análise trataria isso como evidência.
  */
  it("recusa fio sem mensagem de gente", () => {
    expect(
      toThreadTicket(fio(), [
        { type: "THREAD_STATUS_CHANGE", newStatus: "CLOSED" },
        { type: "ASSIGNMENT" },
      ])
    ).toBeNull();
  });

  it("recusa fio sem identificador", () => {
    expect(toThreadTicket(fio({ id: "" }), [msg({ text: "Oi." })])).toBeNull();
  });

  it("tira a marcação do HTML do e-mail", () => {
    const t = toThreadTicket(fio(), [
      msg({ subject: "Dúvida", richText: "<p>Bom <b>dia</b>, tenho um problema.</p>" }),
    ]);

    expect(t?.solution).toBe("");
    expect(t?.messageCount).toBe(1);
  });

  it("conta as mensagens de gente, não os eventos de sistema", () => {
    const t = toThreadTicket(fio(), [
      { type: "THREAD_STATUS_CHANGE" },
      msg({ subject: "Dúvida", text: "Pergunta." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T09:00:00Z", text: "Resposta." }),
      { type: "ASSIGNMENT" },
    ]);

    expect(t?.messageCount).toBe(2);
  });

  /* A API não garante ordem, e a última resposta depende dela. */
  it("ordena por data antes de decidir qual é a última", () => {
    const t = toThreadTicket(fio(), [
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T15:00:00Z", text: "Depois." }),
      msg({ direction: "OUTGOING", createdAt: "2026-08-11T09:00:00Z", text: "Antes." }),
      msg({ subject: "Dúvida", text: "Pergunta." }),
    ]);

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

  it("descarta fio sem identificador", () => {
    expect(threadsDaPagina({ results: [{ createdAt: "2026-01-01" }] })).toEqual([]);
  });

  it("não quebra com resposta fora de forma", () => {
    expect(threadsDaPagina(null)).toEqual([]);
    expect(threadsDaPagina({})).toEqual([]);
  });
});
