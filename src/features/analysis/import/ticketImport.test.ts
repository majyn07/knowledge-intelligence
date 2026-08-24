import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";
import { parseDelimited } from "@/lib/delimited";

import {
  buildTicketImportPlan,
  emptyTicketMapping,
  guessTicketMapping,
  ticketMappingIsComplete,
  type TicketMapping,
} from "./ticketImport";

const options = { projectId: "p1", now: new Date("2026-08-24T12:00:00.000Z") };

function plan(csv: string, mapping?: TicketMapping, existing: Ticket[] = []) {
  const table = parseDelimited(csv);
  return buildTicketImportPlan(
    table,
    mapping ?? guessTicketMapping(table.headers),
    existing,
    options
  );
}

describe("guessTicketMapping", () => {
  it("reconhece os cabeçalhos da HubSpot", () => {
    const mapping = guessTicketMapping(["Ticket ID", "Assunto", "Solução", "Empresa", "Data"]);

    expect(mapping.externalId).toBe(0);
    expect(mapping.title).toBe(1);
    expect(mapping.solution).toBe(2);
    expect(mapping.company).toBe(3);
    expect(mapping.date).toBe(4);
  });

  it("cabeçalho desconhecido fica vazio", () => {
    /*
      Mesma regra da importação de artigos: casar por trecho faria "data de
      fechamento" e "data de criação" disputarem o mesmo campo, e a vencedora
      contaminaria o arquivo inteiro.
    */
    expect(guessTicketMapping(["data de fechamento do contrato"]).date).toBeNull();
  });

  it("uma coluna alimenta um campo só", () => {
    const mapping = guessTicketMapping(["id"]);
    const usos = Object.values(mapping).filter((index) => index === 0);

    expect(usos).toHaveLength(1);
  });
});

describe("ticketMappingIsComplete", () => {
  it("sem assunto não dá para importar", () => {
    expect(ticketMappingIsComplete(emptyTicketMapping())).toBe(false);
    expect(ticketMappingIsComplete({ ...emptyTicketMapping(), title: 0 })).toBe(true);
  });
});

describe("buildTicketImportPlan", () => {
  it("cria o que ainda não existe", () => {
    const resultado = plan("Assunto,Solução,Empresa,Data\nErro ao exportar,Reinstalado,Alfa,10/03/2026");

    expect(resultado.create).toHaveLength(1);
    expect(resultado.create[0].title).toBe("Erro ao exportar");
    expect(resultado.create[0].projectId).toBe("p1");
  });

  it("a data vira dia de calendário, e o que não dá para situar é contado", () => {
    /*
      Chutar produziria atendimento contado no mês errado — o painel já teve
      esse defeito uma vez, e a correção foi recusar o que não é data.
    */
    const resultado = plan("Assunto,Data\nA,10/03/2026\nB,ontem\nC,2026-04-01");

    expect(resultado.create[0].date).toBe("2026-03-10");
    expect(resultado.create[1].date).toBe("");
    expect(resultado.create[2].date).toBe("2026-04-01");
    expect(resultado.unreadableDate).toBe(1);
  });

  it("linha sem assunto é recusada e contada", () => {
    const resultado = plan("Assunto,Solução\n,sem sujeito\nCom assunto,ok");

    expect(resultado.create).toHaveLength(1);
    expect(resultado.skippedNoTitle).toBe(1);
  });

  it("conta quantos chegam sem solução", () => {
    /*
      Atendimento sem solução não é candidato a virar conhecimento — é o que o
      Levantamento usa para não cobrar trabalho impossível.
    */
    const resultado = plan("Assunto,Solução\nA,Resolvido\nB,");

    expect(resultado.withoutSolution).toBe(1);
  });

  it("o mesmo identificador atualiza em vez de duplicar", () => {
    const existente: Ticket = {
      id: "t-antigo",
      projectId: "p9",
      title: "Assunto antigo",
      solution: "",
      company: "",
      date: "2026-01-01",
      source: { provider: "hubspot", externalId: "45812", importedAt: "2026-01-01T00:00:00.000Z" },
    };

    const resultado = plan("Ticket ID,Assunto\n45812,Assunto novo", undefined, [existente]);

    expect(resultado.create).toHaveLength(0);
    expect(resultado.update).toHaveLength(1);
    expect(resultado.update[0].id).toBe("t-antigo");
    expect(resultado.update[0].title).toBe("Assunto novo");
  });

  it("reimportar preserva a iniciativa que já tinha sido escolhida aqui", () => {
    /*
      A iniciativa é decisão nossa, não da HubSpot. A segunda importação não
      pode mover o atendimento para o projeto ativo do momento.
    */
    const existente: Ticket = {
      id: "t1",
      projectId: "p9",
      title: "Antigo",
      solution: "",
      company: "",
      date: "",
      source: { provider: "hubspot", externalId: "45812", importedAt: "2026-01-01T00:00:00.000Z" },
    };

    expect(plan("Ticket ID,Assunto\n45812,Novo", undefined, [existente]).update[0].projectId).toBe(
      "p9"
    );
  });

  it("o mesmo atendimento duas vezes no arquivo vira um registro só", () => {
    const resultado = plan("Ticket ID,Assunto\n45812,Primeira\n45812,Segunda");

    expect(resultado.create).toHaveLength(1);
    expect(resultado.create[0].title).toBe("Segunda");
    expect(resultado.duplicatedInFile).toBe(1);
  });

  it("guarda a procedência, que é o que permite reimportar", () => {
    const resultado = plan("Ticket ID,Assunto\n45812,A");

    expect(resultado.create[0].source).toEqual({
      provider: "hubspot",
      externalId: "45812",
      importedAt: options.now.toISOString(),
    });
  });

  it("sem identificador não inventa procedência", () => {
    // Sem ele a reimportação duplicaria; dizer que veio da HubSpot sem saber de
    // qual registro seria afirmar o que não se sabe.
    expect(plan("Assunto\nA").create[0].source).toBeUndefined();
  });

  it("coluna que ninguém lê é anunciada", () => {
    const resultado = plan("Assunto,uma coluna qualquer\nA,x");

    expect(resultado.unusedColumns).toEqual(["uma coluna qualquer"]);
  });
});
