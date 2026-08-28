import { describe, expect, it } from "vitest";

import {
  instanteDo,
  janelaDeMeses,
  planejarVarredura,
  type AtendimentoConhecido,
  type FioListado,
} from "./helpDeskSchedule";

const DESDE = "2026-06-01T00:00:00.000Z";

const fio = (id: string, extra: Partial<FioListado> = {}): FioListado => ({
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
    const plano = planejarVarredura([fio("a"), fio("b")], [], DESDE);

    expect(plano.novos).toBe(2);
    expect(plano.visitar.map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  /*
    Reler o que não mudou é o custo que faz alguém deixar de reexecutar, e uma
    varredura que ninguém reexecuta envelhece.
  */
  it("pula o que já está aqui e não andou", () => {
    const plano = planejarVarredura(
      [fio("a", { ultimaMensagemEm: "2026-07-10T00:00:00.000Z" })],
      [conhecido("a", "2026-07-10T00:00:00.000Z")],
      DESDE
    );

    expect(plano.emDia).toBe(1);
    expect(plano.visitar).toHaveLength(0);
  });

  it("revisita o que ganhou mensagem nova", () => {
    const plano = planejarVarredura(
      [fio("a", { ultimaMensagemEm: "2026-07-20T00:00:00.000Z" })],
      [conhecido("a", "2026-07-10T00:00:00.000Z")],
      DESDE
    );

    expect(plano.mudaram).toBe(1);
    expect(plano.visitar.map((f) => f.id)).toEqual(["a"]);
  });

  it("deixa fora da janela o que é mais antigo que ela", () => {
    const plano = planejarVarredura([fio("velho", { criadoEm: "2024-04-08T00:00:00.000Z" })], [], DESDE);

    expect(plano.foraDaJanela).toBe(1);
    expect(plano.visitar).toHaveLength(0);
  });

  /*
    Atendimento aberto há cinco meses e respondido ontem é trabalho de agora. A
    data de criação o jogaria para fora justamente quando ele está vivo.
  */
  it("a última mensagem vence a criação ao situar o fio no tempo", () => {
    const antigoMasVivo = fio("vivo", {
      criadoEm: "2026-01-05T00:00:00.000Z",
      ultimaMensagemEm: "2026-08-20T00:00:00.000Z",
    });

    const plano = planejarVarredura([antigoMasVivo], [], DESDE);

    expect(plano.novos).toBe(1);
    expect(plano.foraDaJanela).toBe(0);
  });

  /* Visitar por via das dúvidas custaria uma requisição por chute. */
  it("deixa de fora o fio sem carimbo nenhum", () => {
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
        fio("antigo", { ultimaMensagemEm: "2026-06-02T00:00:00.000Z" }),
        fio("recente", { ultimaMensagemEm: "2026-08-25T00:00:00.000Z" }),
        fio("meio", { ultimaMensagemEm: "2026-07-15T00:00:00.000Z" }),
      ],
      [],
      DESDE
    );

    expect(plano.visitar.map((f) => f.id)).toEqual(["recente", "meio", "antigo"]);
  });

  it("conta as quatro situações separadamente", () => {
    const plano = planejarVarredura(
      [
        fio("novo", { ultimaMensagemEm: "2026-08-01T00:00:00.000Z" }),
        fio("mudou", { ultimaMensagemEm: "2026-08-02T00:00:00.000Z" }),
        fio("igual", { ultimaMensagemEm: "2026-07-01T00:00:00.000Z" }),
        fio("velho", { criadoEm: "2024-05-01T00:00:00.000Z" }),
      ],
      [conhecido("mudou", "2026-07-01T00:00:00.000Z"), conhecido("igual", "2026-07-01T00:00:00.000Z")],
      DESDE
    );

    expect(plano).toMatchObject({ novos: 1, mudaram: 1, emDia: 1, foraDaJanela: 1 });
    expect(plano.visitar).toHaveLength(2);
  });

  it("plano vazio para caixa vazia", () => {
    expect(planejarVarredura([], [], DESDE).visitar).toHaveLength(0);
  });
});

describe("instanteDo", () => {
  it("prefere a última mensagem", () => {
    expect(instanteDo(fio("a", { ultimaMensagemEm: "2026-08-01T00:00:00.000Z" }))).toBe(
      "2026-08-01T00:00:00.000Z"
    );
  });

  it("cai na criação quando não há mensagem carimbada", () => {
    expect(instanteDo(fio("a"))).toBe("2026-07-01T10:00:00.000Z");
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
