import { describe, expect, it } from "vitest";

import {
  instanteDo,
  janelaDeMeses,
  planejarVarredura,
  type AtendimentoConhecido,
  type ConversaListada,
} from "./helpDeskSchedule";

const DESDE = "2026-06-01T00:00:00.000Z";

const conversa = (id: string, extra: Partial<ConversaListada> = {}): ConversaListada => ({
  id,
  criadoEm: "2026-07-01T10:00:00.000Z",
  ...extra,
});

const conhecido = (externalId: string, ultimaMensagemEm: string): AtendimentoConhecido => ({
  externalId,
  ultimaMensagemEm,
});

describe("planejarVarredura", () => {
  it("visita o que ainda não existe aqui", () => {
    const plano = planejarVarredura([conversa("a"), conversa("b")], [], DESDE);

    expect(plano.novos).toBe(2);
    expect(plano.visitar.map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  /*
    Reler o que não mudou é o custo que faz alguém deixar de reexecutar, e uma
    varredura que ninguém reexecuta envelhece.
  */
  it("pula o que já está aqui e não andou", () => {
    const plano = planejarVarredura(
      [conversa("a", { ultimaMensagemEm: "2026-07-10T00:00:00.000Z" })],
      [conhecido("a", "2026-07-10T00:00:00.000Z")],
      DESDE
    );

    expect(plano.emDia).toBe(1);
    expect(plano.visitar).toHaveLength(0);
  });

  it("revisita o que ganhou mensagem nova", () => {
    const plano = planejarVarredura(
      [conversa("a", { ultimaMensagemEm: "2026-07-20T00:00:00.000Z" })],
      [conhecido("a", "2026-07-10T00:00:00.000Z")],
      DESDE
    );

    expect(plano.mudaram).toBe(1);
    expect(plano.visitar.map((f) => f.id)).toEqual(["a"]);
  });

  it("deixa fora da janela o que é mais antigo que ela", () => {
    const plano = planejarVarredura([conversa("velho", { criadoEm: "2024-04-08T00:00:00.000Z" })], [], DESDE);

    expect(plano.foraDaJanela).toBe(1);
    expect(plano.visitar).toHaveLength(0);
  });

  /*
    Atendimento aberto há cinco meses e respondido ontem é trabalho de agora. A
    data de criação o jogaria para fora justamente quando ele está vivo.
  */
  it("a última mensagem vence a criação ao situar a conversa no tempo", () => {
    const antigoMasVivo = conversa("vivo", {
      criadoEm: "2026-01-05T00:00:00.000Z",
      ultimaMensagemEm: "2026-08-20T00:00:00.000Z",
    });

    const plano = planejarVarredura([antigoMasVivo], [], DESDE);

    expect(plano.novos).toBe(1);
    expect(plano.foraDaJanela).toBe(0);
  });

  /* Visitar por via das dúvidas custaria uma requisição por chute. */
  it("deixa de fora a conversa sem carimbo nenhum", () => {
    const plano = planejarVarredura([{ id: "sem-data", criadoEm: "" }], [], DESDE);

    expect(plano.foraDaJanela).toBe(1);
    expect(plano.visitar).toHaveLength(0);
  });

  /*
    Quem para no meio fica com os últimos meses, que é o que interessa, em vez
    de ficar com o começo da janela. A listagem chega ao contrário disso.
  */
  it("põe o mais recente na frente da fila", () => {
    const plano = planejarVarredura(
      [
        conversa("antigo", { ultimaMensagemEm: "2026-06-02T00:00:00.000Z" }),
        conversa("recente", { ultimaMensagemEm: "2026-08-25T00:00:00.000Z" }),
        conversa("meio", { ultimaMensagemEm: "2026-07-15T00:00:00.000Z" }),
      ],
      [],
      DESDE
    );

    expect(plano.visitar.map((f) => f.id)).toEqual(["recente", "meio", "antigo"]);
  });

  it("conta as quatro situações separadamente", () => {
    const plano = planejarVarredura(
      [
        conversa("novo", { ultimaMensagemEm: "2026-08-01T00:00:00.000Z" }),
        conversa("mudou", { ultimaMensagemEm: "2026-08-02T00:00:00.000Z" }),
        conversa("igual", { ultimaMensagemEm: "2026-07-01T00:00:00.000Z" }),
        conversa("velho", { criadoEm: "2024-05-01T00:00:00.000Z" }),
      ],
      [conhecido("mudou", "2026-07-01T00:00:00.000Z"), conhecido("igual", "2026-07-01T00:00:00.000Z")],
      DESDE
    );

    expect(plano).toMatchObject({ novos: 1, mudaram: 1, emDia: 1, foraDaJanela: 1 });
    expect(plano.visitar).toHaveLength(2);
  });

  /*
    O intervalo livre existe para o que os atalhos não alcançam: "só agosto de
    2025" não é uma janela contada para trás a partir de hoje.
  */
  it("deixa fora da janela o que é mais novo que o fim dela", () => {
    const plano = planejarVarredura(
      [
        conversa("dentro", { ultimaMensagemEm: "2026-06-15T00:00:00.000Z" }),
        conversa("depois", { ultimaMensagemEm: "2026-08-20T00:00:00.000Z" }),
      ],
      [],
      DESDE,
      "2026-06-30T23:59:59.999Z"
    );

    expect(plano.visitar.map((f) => f.id)).toEqual(["dentro"]);
    expect(plano.foraDaJanela).toBe(1);
  });

  /* Sem fim declarado a janela vai até agora, que é o caso de todo atalho. */
  it("sem fim, nada é novo demais", () => {
    const plano = planejarVarredura(
      [conversa("recente", { ultimaMensagemEm: "2026-08-27T00:00:00.000Z" })],
      [],
      DESDE
    );

    expect(plano.visitar).toHaveLength(1);
  });

  it("plano vazio para caixa vazia", () => {
    expect(planejarVarredura([], [], DESDE).visitar).toHaveLength(0);
  });
});

describe("instanteDo", () => {
  it("prefere a última mensagem", () => {
    expect(instanteDo(conversa("a", { ultimaMensagemEm: "2026-08-01T00:00:00.000Z" }))).toBe(
      "2026-08-01T00:00:00.000Z"
    );
  });

  it("cai na criação quando não há mensagem carimbada", () => {
    expect(instanteDo(conversa("a"))).toBe("2026-07-01T10:00:00.000Z");
  });
});

describe("janelaDeMeses", () => {
  it("conta para trás a partir de agora", () => {
    expect(janelaDeMeses(new Date("2026-08-28T00:00:00.000Z"), 3)).toBe("2026-05-28T00:00:00.000Z");
  });

  /* Virada de ano precisa andar para o ano anterior, e não para o mês -1. */
  it("atravessa a virada do ano", () => {
    expect(janelaDeMeses(new Date("2026-02-10T00:00:00.000Z"), 3)).toBe("2025-11-10T00:00:00.000Z");
  });
});
