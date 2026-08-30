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
      Chutar produziria atendimento contado no mês errado: o painel já teve
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
      Atendimento sem solução não é candidato a virar conhecimento. É o que o
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
      causa: "",
      motivoDeContato: "",
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
      causa: "",
      motivoDeContato: "",
      company: "",
      date: "",
      source: { provider: "hubspot", externalId: "45812", importedAt: "2026-01-01T00:00:00.000Z" },
    };

    expect(plan("Ticket ID,Assunto\n45812,Novo", undefined, [existente]).update[0].projectId).toBe(
      "p9"
    );
  });

  /*
    O relatório do suporte chega para **somar** a classificação a atendimentos
    que já existem, e esses vieram pela conversa: é do `raw` que a lista tira o
    nome do cliente e o número do chamado. Reconstruir o registro do zero teria
    apagado os dois em mil linhas, sem erro nenhum.
  */
  it("reimportar preserva o que o arquivo não traz", () => {
    const existente: Ticket = {
      id: "t1",
      projectId: "p9",
      title: "Antigo",
      solution: "Resposta que o relatório não traz",
      causa: "",
      motivoDeContato: "",
      company: "Alpha",
      date: "2026-07-15",
      raw: { contato: { nome: "Fulano" }, hubspotTicketId: "45812" },
      source: { provider: "hubspot", externalId: "45812", importedAt: "2026-01-01T00:00:00.000Z" },
    };

    const atualizado = plan(
      "Ticket ID,Assunto,Causa,Motivo de contato" +
        "\n45812,Antigo,Erro de instalação,Dúvida de uso",
      undefined,
      [existente]
    ).update[0];

    expect(atualizado.causa).toBe("Erro de instalação");
    expect(atualizado.motivoDeContato).toBe("Dúvida de uso");
    expect(atualizado.raw).toEqual(existente.raw);
    expect(atualizado.solution).toBe("Resposta que o relatório não traz");
    expect(atualizado.company).toBe("Alpha");
    expect(atualizado.date).toBe("2026-07-15");
  });

  /*
    Coluna mapeada manda, inclusive vazia: se o relatório diz que o campo está
    em branco, isso é informação, e não ausência de informação.
  */
  it("coluna mapeada e vazia apaga; coluna ausente não opina", () => {
    const existente: Ticket = {
      id: "t1",
      projectId: "p1",
      title: "Antigo",
      solution: "",
      causa: "Erro de instalação",
      motivoDeContato: "Dúvida de uso",
      company: "",
      date: "",
      source: { provider: "hubspot", externalId: "45812", importedAt: "2026-01-01T00:00:00.000Z" },
    };

    const atualizado = plan("Ticket ID,Assunto,Causa\n45812,Antigo,", undefined, [existente])
      .update[0];

    expect(atualizado.causa).toBe("");
    expect(atualizado.motivoDeContato).toBe("Dúvida de uso");
  });

  /*
    "Motivo do contato" mapeava para o assunto, de quando o assunto era a única
    coisa que descrevia o atendimento. Deixar assim apagaria a classificação no
    mesmo movimento em que ela chega.
  */
  it("motivo de contato não vira assunto", () => {
    const resultado = plan("Ticket ID,Assunto,Motivo do contato\n45812,O assunto,Dúvida de uso");

    expect(resultado.create[0].title).toBe("O assunto");
    expect(resultado.create[0].motivoDeContato).toBe("Dúvida de uso");
  });

  /*
    Os cabeçalhos que a HubSpot escreve carregam o prefixo do pipeline e a
    pergunta inteira. Cada pipeline tem o seu vocabulário: o de Setup pergunta a
    causa raiz e chama o motivo de "sintoma", o de Suporte só tem a categoria.
    Reconhecer só "causa" deixaria o mapeamento em branco no arquivo de verdade.
  */
  it("reconhece os cabeçalhos como a HubSpot os escreve", () => {
    const doSetup = guessTicketMapping([
      "Ticket ID",
      "Assunto",
      "[Setup] Causa | Qual a causa raiz que gerou o problema?",
      "[Setup] Sintoma | Motivo detalhado do contato",
    ]);

    expect(doSetup.causa).toBe(2);
    expect(doSetup.motivoDeContato).toBe(3);

    const doSuporte = guessTicketMapping([
      "[Support] Categoria | Motivo principal do contato",
    ]);

    expect(doSuporte.motivoDeContato).toBe(0);
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
