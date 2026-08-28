import { describe, expect, it } from "vitest";

import { normalizeConversation, normalizeTicket, parseTickets } from "./normalizeSupport";

describe("normalizeTicket", () => {
  it("garante a forma a partir de um registro incompleto", () => {
    expect(normalizeTicket({ id: "45812" })).toEqual({
      id: "45812",
      projectId: "",
      title: "",
      solution: "",
      company: "",
      date: "",
    });
  });

  it("converte a data que os registros anteriores guardavam", () => {
    /*
      O campo era de texto livre e gravava `dd/mm/aaaa`. Converter na leitura
      evita uma migração de dados: o que está gravado continua valendo e se
      firma na próxima vez que alguém salvar aquele atendimento.
    */
    expect(normalizeTicket({ id: "1", date: "15/07/2026" }).date).toBe("2026-07-15");
  });

  it("data já no formato guardado passa intacta", () => {
    expect(normalizeTicket({ id: "1", date: "2026-07-15" }).date).toBe("2026-07-15");
  });

  it("o que não é data vira vazio, e não uma data inventada", () => {
    /*
      O campo livre aceitava "ontem". Mantê-lo faria o atendimento cair fora
      de toda janela dos indicadores sem que ninguém entendesse por quê, e
      chutar um dia seria inventar quando ele aconteceu.
    */
    expect(normalizeTicket({ id: "1", date: "ontem" }).date).toBe("");
    expect(normalizeTicket({ id: "1", date: "31/02/2026" }).date).toBe("");
  });

  it("procedência externa só aparece quando existe", () => {
    // Sem identificador externo, o campo não deve existir fingindo importação.
    expect(normalizeTicket({ id: "1" })).not.toHaveProperty("source");

    expect(
      normalizeTicket({ id: "1", source: { externalId: "abc", importedAt: "2026-08-20" } }).source
    ).toEqual({ provider: "hubspot", externalId: "abc", importedAt: "2026-08-20" });
  });
});

describe("normalizeConversation", () => {
  it("mensagem sem identificador ganha um", () => {
    const conversa = normalizeConversation({
      id: "c1",
      ticketId: "1",
      messages: [{ author: "Suporte", body: "olá" }],
    });

    expect(conversa.messages[0].id).not.toBe("");
  });

  it("conteúdo que não é lista de mensagens não derruba a leitura", () => {
    expect(normalizeConversation({ id: "c1", messages: "quebrado" }).messages).toEqual([]);
  });
});

describe("parseTickets", () => {
  it("lê a coleção convertendo cada registro", () => {
    const raw = JSON.stringify([{ id: "1", date: "15/07/2026" }, { id: "2", date: "ontem" }]);

    expect(parseTickets(raw).map((ticket) => ticket.date)).toEqual(["2026-07-15", ""]);
  });

  it("conteúdo que não é lista vira lista vazia", () => {
    expect(parseTickets(JSON.stringify({ id: "1" }))).toEqual([]);
  });
});
