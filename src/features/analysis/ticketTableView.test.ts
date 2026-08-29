import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";

import {
  chamadoDo,
  ultimaAtividadeDe,
  clienteDo,
  matchesTicket,
  produtosDoTicket,
  sortTickets,
  ticketCellValue,
  ticketStage,
  type TicketCycle,
} from "./ticketTableView";

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: "tic-1",
  projectId: "p1",
  title: "Flecha excessiva em viga contínua",
  solution: "Ajustada a inércia fissurada.",
  company: "Construtora Alfa",
  causa: "",
  motivoDeContato: "",
  date: "2026-08-14",
  ...extra,
});

const vazio: TicketCycle = { analisados: new Set(), comArtigo: new Set() };

describe("ticketStage", () => {
  it("sem solução ainda nem pode virar conhecimento", () => {
    expect(ticketStage(atendimento({ solution: "  " }), vazio)).toBe("sem-solucao");
  });

  it("resolvido e não lido entra na fila", () => {
    expect(ticketStage(atendimento(), vazio)).toBe("a-analisar");
  });

  it("analisado sai da fila", () => {
    const ciclo = { analisados: new Set(["tic-1"]), comArtigo: new Set<string>() };

    expect(ticketStage(atendimento(), ciclo)).toBe("analisado");
  });

  /* Virou artigo vence analisado: é o fim do ciclo, não o meio. */
  it("o artigo publicado vence a análise", () => {
    const ciclo = { analisados: new Set(["tic-1"]), comArtigo: new Set(["tic-1"]) };

    expect(ticketStage(atendimento(), ciclo)).toBe("publicado");
  });
});

describe("ticketCellValue", () => {
  it("mostra a data no formato de quem lê", () => {
    expect(ticketCellValue(atendimento(), "date", vazio)).toBe("14/08/2026");
  });

  it("deixa vazio o que não tem data", () => {
    expect(ticketCellValue(atendimento({ date: "" }), "date", vazio)).toBe("");
  });

  it("mostra o rótulo do estágio, não a chave", () => {
    expect(ticketCellValue(atendimento(), "stage", vazio)).toBe("A analisar");
  });
});

describe("sortTickets", () => {
  const a = atendimento({ id: "a", date: "2026-01-10", title: "Zebra", company: "Beta" });
  const b = atendimento({ id: "b", date: "2026-08-01", title: "Alfa", company: "Alfa" });
  const semData = atendimento({ id: "c", date: "", title: "Meio", company: "Gama" });

  it("mais recentes primeiro", () => {
    expect(sortTickets([a, b], "recentes").map((t) => t.id)).toEqual(["b", "a"]);
  });

  /*
    O que não dá para situar no tempo não é nem recente nem antigo, e no topo
    faria a lista abrir com o que menos se sabe.
  */
  it("data vazia vai para o fim nas duas ordens", () => {
    expect(sortTickets([semData, a, b], "recentes").at(-1)?.id).toBe("c");
    expect(sortTickets([semData, a, b], "antigos").at(-1)?.id).toBe("c");
  });

  it("por assunto e por empresa", () => {
    expect(sortTickets([a, b], "assunto").map((t) => t.id)).toEqual(["b", "a"]);
    expect(sortTickets([a, b], "empresa").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("não muda a lista recebida", () => {
    const lista = [a, b];
    sortTickets(lista, "assunto");

    expect(lista.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("matchesTicket", () => {
  it("acha sem acento", () => {
    expect(matchesTicket(atendimento(), "continua")).toBe(true);
  });

  /* Casa por termo: quem digita duas palavras espera as duas, em qualquer ordem. */
  it("exige todos os termos, em qualquer ordem", () => {
    expect(matchesTicket(atendimento(), "flecha viga")).toBe(true);
    expect(matchesTicket(atendimento(), "viga flecha")).toBe(true);
    expect(matchesTicket(atendimento(), "flecha laje")).toBe(false);
  });

  it("olha a solução e a empresa também", () => {
    expect(matchesTicket(atendimento(), "fissurada")).toBe(true);
    expect(matchesTicket(atendimento(), "construtora alfa")).toBe(true);
  });

  it("acha pelo número do chamado na HubSpot", () => {
    const t = atendimento({
      source: { provider: "hubspot", externalId: "47673917220", importedAt: "" },
    });

    expect(matchesTicket(t, "47673917220")).toBe(true);
  });

  /* Busca curta não tem termo, e ainda assim precisa funcionar. */
  it("cai para trecho quando a busca é curta demais para virar termo", () => {
    expect(matchesTicket(atendimento(), "vig")).toBe(true);
    expect(matchesTicket(atendimento(), "xyz")).toBe(false);
  });

  it("busca vazia não filtra nada", () => {
    expect(matchesTicket(atendimento(), "   ")).toBe(true);
  });
});

/**
 * O que a HubSpot devolve e o modelo não guarda em campo próprio: o nome de
 * quem abriu e o número do chamado. Os dois vivem no registro cru, e a busca,
 * o filtro e a lista precisam da mesma resposta.
 */
const daHubSpot = (nome: string, chamado: string, extra: Partial<Ticket> = {}) =>
  atendimento({ raw: { contato: { nome }, hubspotTicketId: chamado }, ...extra });

describe("clienteDo e chamadoDo", () => {
  it("leem o nome e o número do registro cru", () => {
    const ticket = daHubSpot("Guilherme Barcelos", "47809916061");

    expect(clienteDo(ticket)).toBe("Guilherme Barcelos");
    expect(chamadoDo(ticket)).toBe("47809916061");
  });

  /* Atendimento cadastrado à mão não tem registro cru, e isso é estado previsto. */
  it("devolvem vazio sem registro cru", () => {
    expect(clienteDo(atendimento())).toBe("");
    expect(chamadoDo(atendimento())).toBe("");
  });

  it("não quebram com registro cru de outra forma", () => {
    expect(clienteDo(atendimento({ raw: { contato: "texto solto" } }))).toBe("");
    expect(chamadoDo(atendimento({ raw: { hubspotTicketId: 47809916061 } }))).toBe("");
  });
});

describe("a busca do atendimento", () => {
  /*
    O campo prometia "nº do chamado" e varria o id da conversa: quem copiava o
    número da HubSpot e colava aqui não achava nada, e não tinha como saber que
    procurava o número certo no campo errado.
  */
  it("acha pelo número do chamado da HubSpot", () => {
    expect(matchesTicket(daHubSpot("Guilherme", "47809916061"), "47809916061")).toBe(true);
  });

  it("acha pelo id da conversa, que é o que está na URL da tela", () => {
    const ticket = atendimento({
      source: { provider: "hubspot", externalId: "11101673731", importedAt: "" },
    });

    expect(matchesTicket(ticket, "11101673731")).toBe(true);
  });

  /* Quem atendeu lembra do nome de quem ligou antes do assunto que digitou. */
  it("acha pelo nome de quem abriu", () => {
    expect(matchesTicket(daHubSpot("Guilherme Barcelos", "1"), "barcelos")).toBe(true);
  });

  it("continua achando por assunto e empresa", () => {
    expect(matchesTicket(atendimento(), "flecha")).toBe(true);
    expect(matchesTicket(atendimento(), "alfa")).toBe(true);
  });

  it("não acha o que não está em campo nenhum", () => {
    expect(matchesTicket(daHubSpot("Guilherme", "1"), "eberick")).toBe(false);
  });
});

describe("produtosDoTicket", () => {
  /* Gravado vence dedução: veio da HubSpot e não se adivinha por cima. */
  it("prefere o que veio gravado", () => {
    const ticket = atendimento({ title: "Erro no Builder", raw: { produtos: ["Eberick"] } });

    expect(produtosDoTicket(ticket)).toEqual(["Eberick"]);
  });

  it("deduz do assunto quando não há gravado", () => {
    expect(produtosDoTicket(atendimento({ title: "Falha ao abrir o Builder" }))).toContain(
      "AltoQi Builder"
    );
  });

  /*
    A tela de detalhe passa a fala do cliente, onde "estou no Eberick 2024"
    aparece muito mais do que no assunto.
  */
  it("aceita o texto da conversa quando quem chama o tem", () => {
    const ticket = atendimento({ title: "Não consigo abrir o projeto" });

    expect(produtosDoTicket(ticket, "estou no Eberick 2024")).toContain("AltoQi Eberick");
  });

  it("sem produto identificável devolve vazio", () => {
    expect(produtosDoTicket(atendimento({ title: "Dúvida geral" }))).toEqual([]);
  });
});

describe("ordenar por cliente", () => {
  it("põe em ordem alfabética de quem abriu", () => {
    const lista = [
      daHubSpot("Zuleica", "1", { id: "z" }),
      daHubSpot("Ana", "2", { id: "a" }),
    ];

    expect(sortTickets(lista, "cliente").map((t) => t.id)).toEqual(["a", "z"]);
  });
});

describe("a célula de cliente", () => {
  it("mostra o nome de quem abriu", () => {
    expect(ticketCellValue(daHubSpot("Guilherme Barcelos", "1"), "client", vazio)).toBe(
      "Guilherme Barcelos"
    );
  });
});

/*
  O que se procura quase nunca está no assunto: metade deles começa com "Ticket
  AltoQi nº". A frase que descreve o problema está na conversa.
*/
describe("a busca dentro da conversa", () => {
  it("acha pelo que o cliente escreveu", () => {
    const ticket = atendimento({ title: "Ticket AltoQi nº47809916061" });

    expect(matchesTicket(ticket, "deslocado", "o modelo ifc esta deslocado na laje")).toBe(true);
  });

  it("exige todos os termos, mesmo espalhados entre campo e conversa", () => {
    const ticket = atendimento({ title: "Falha ao abrir" });

    expect(matchesTicket(ticket, "falha deslocado", "o modelo esta deslocado")).toBe(true);
    expect(matchesTicket(ticket, "falha inexistente", "o modelo esta deslocado")).toBe(false);
  });

  it("sem conversa, continua valendo o que já valia", () => {
    expect(matchesTicket(atendimento(), "flecha")).toBe(true);
    expect(matchesTicket(atendimento(), "deslocado")).toBe(false);
  });
});

describe("ordenar por atividade recente", () => {
  const comAtividade = (id: string, quando: string) =>
    atendimento({ id, raw: { ultimaMensagemEm: quando } });

  /*
    A ordem de um help desk: um chamado aberto na semana passada e respondido
    hoje é trabalho de hoje.
  */
  it("põe na frente o que se moveu por último", () => {
    const lista = [
      comAtividade("antigo", "2026-08-01T10:00:00.000Z"),
      comAtividade("novo", "2026-08-28T10:00:00.000Z"),
    ];

    expect(sortTickets(lista, "atividade").map((t) => t.id)).toEqual(["novo", "antigo"]);
  });

  /* O que não dá para situar no tempo não é nem recente nem antigo. */
  it("manda para o fim o que não tem carimbo", () => {
    const lista = [atendimento({ id: "sem" }), comAtividade("com", "2026-08-01T10:00:00.000Z")];

    expect(sortTickets(lista, "atividade").map((t) => t.id)).toEqual(["com", "sem"]);
  });

  it("lê o carimbo do registro cru", () => {
    expect(ultimaAtividadeDe(comAtividade("a", "2026-08-28T10:00:00.000Z"))).toBe(
      "2026-08-28T10:00:00.000Z"
    );
    expect(ultimaAtividadeDe(atendimento())).toBe("");
  });
});
