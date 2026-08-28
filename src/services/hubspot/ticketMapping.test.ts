import { describe, expect, it } from "vitest";

import {
  PROPRIEDADES_PADRAO,
  propriedadesPedidas,
  proximaPagina,
  toTicket,
  type TicketPropertyMap,
} from "./ticketMapping";

const bruto = (props: Record<string, unknown>, id = "47673917220") => ({
  id,
  properties: props,
});

describe("toTicket", () => {
  it("lê assunto, solução e data das propriedades declaradas", () => {
    const t = toTicket(
      bruto({
        subject: "Erro D15 ao lançar viga",
        content: "Orientado a atualizar o release.",
        closed_date: "2026-08-14T18:22:31.004Z",
      }),
      PROPRIEDADES_PADRAO
    );

    expect(t).toEqual({
      externalId: "47673917220",
      title: "Erro D15 ao lançar viga",
      solution: "Orientado a atualizar o release.",
      date: "2026-08-14",
    });
  });

  /*
    De qual propriedade sai cada campo é cadastro. A solução costuma morar numa
    propriedade personalizada, e o nome dela só quem administra a conta sabe.
  */
  it("aceita mapa diferente do padrão", () => {
    const mapa: TicketPropertyMap = {
      title: "assunto_do_chamado",
      solution: "resolucao_tecnica",
      date: "data_de_encerramento",
    };

    const t = toTicket(
      bruto({
        assunto_do_chamado: "Licença não ativa",
        resolucao_tecnica: "Liberada a licença.",
        data_de_encerramento: "2026-07-02T10:00:00Z",
        subject: "não é este",
      }),
      mapa
    );

    expect(t?.title).toBe("Licença não ativa");
    expect(t?.solution).toBe("Liberada a licença.");
  });

  /*
    Atendimento ainda aberto não tem fechamento, e data vazia o deixaria fora
    de toda janela do painel sem ninguém entender por quê.
  */
  it("cai na data de criação quando não há fechamento", () => {
    const t = toTicket(
      bruto({ subject: "Em aberto", createdate: "2026-08-20T09:15:00Z" }),
      PROPRIEDADES_PADRAO
    );

    expect(t?.date).toBe("2026-08-20");
  });

  it("prefere o fechamento quando os dois existem", () => {
    const t = toTicket(
      bruto({
        subject: "Resolvido",
        createdate: "2026-08-01T09:00:00Z",
        closed_date: "2026-08-05T17:00:00Z",
      }),
      PROPRIEDADES_PADRAO
    );

    expect(t?.date).toBe("2026-08-05");
  });

  /* O que não dá para situar no tempo vira vazio, nunca um dia chutado. */
  it("esvazia a data que não dá para ler", () => {
    const t = toTicket(
      bruto({ subject: "Estranho", closed_date: "ontem", createdate: "2026-02-30" }),
      PROPRIEDADES_PADRAO
    );

    expect(t?.date).toBe("");
  });

  it("recusa registro sem identificador", () => {
    expect(toTicket(bruto({ subject: "Tem assunto" }, ""), PROPRIEDADES_PADRAO)).toBeNull();
  });

  /* Sem assunto a linha entraria na lista sem dizer o que é. */
  it("recusa registro sem assunto", () => {
    expect(toTicket(bruto({ content: "só a solução" }), PROPRIEDADES_PADRAO)).toBeNull();
  });

  it("aceita solução ausente, que é campo legítimo em branco", () => {
    const t = toTicket(bruto({ subject: "Sem solução ainda" }), PROPRIEDADES_PADRAO);

    expect(t?.solution).toBe("");
  });

  it("não quebra com resposta fora de forma", () => {
    expect(toTicket(null, PROPRIEDADES_PADRAO)).toBeNull();
    expect(toTicket({ id: "1" }, PROPRIEDADES_PADRAO)).toBeNull();
  });
});

describe("propriedadesPedidas", () => {
  it("pede só o que o mapa usa, mais a data de criação", () => {
    expect(propriedadesPedidas(PROPRIEDADES_PADRAO)).toEqual([
      "subject",
      "content",
      "closed_date",
      "createdate",
    ]);
  });

  /* Pedir a mesma propriedade duas vezes é pedido maior sem ganho nenhum. */
  it("não repete quando o mapa aponta duas vezes para a mesma", () => {
    const pedidas = propriedadesPedidas({
      title: "subject",
      solution: "subject",
      date: "createdate",
    });

    expect(pedidas).toEqual(["subject", "createdate"]);
  });
});

describe("proximaPagina", () => {
  it("devolve o cursor quando há mais", () => {
    expect(proximaPagina({ paging: { next: { after: "250" } } })).toBe("250");
  });

  /* O fim é a ausência do cursor, como nas conversas. */
  it("devolve nulo no fim", () => {
    expect(proximaPagina({ results: [] })).toBeNull();
    expect(proximaPagina({ paging: {} })).toBeNull();
    expect(proximaPagina(null)).toBeNull();
  });
});
