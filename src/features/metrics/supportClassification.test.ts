import { describe, expect, it } from "vitest";

import type { Ticket } from "@/models/Ticket";
import { emptyClassification } from "@/models/TicketClassification";

import { tallyClassification, tallyField } from "./supportClassification";

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: crypto.randomUUID(),
  projectId: "p1",
  title: "Assunto",
  solution: "",
  company: "",
  ...emptyClassification(),
  date: "2026-08-01",
  ...extra,
});

describe("tallyClassification", () => {
  it("conta por valor, do mais frequente para o menos", () => {
    const resultado = tallyField(
      [
        atendimento({ causa: "Erro de instalação" }),
        atendimento({ causa: "Erro de instalação" }),
        atendimento({ causa: "Falta de licença" }),
      ],
      "causa"
    );

    expect(resultado.itens.map((item) => [item.label, item.quantos])).toEqual([
      ["Erro de instalação", 2],
      ["Falta de licença", 1],
    ]);
  });

  /*
    São duas perguntas: um defeito de instalação chega como dúvida de uso. Ler
    uma pelo campo da outra produziria um ranking sobre outra coisa.
  */
  it("cada campo responde por si", () => {
    const tickets = [atendimento({ causa: "Defeito", sintoma: "Dúvida de uso" })];

    expect(tallyField(tickets, "causa").itens[0].label).toBe("Defeito");
    expect(tallyField(tickets, "sintoma").itens[0].label).toBe("Dúvida de uso");
  });

  /*
    "Erro de Instalação" e "Erro de instalação" são o mesmo assunto, e duas
    linhas do mesmo assunto é o que um ranking não pode ter. O rótulo exibido é
    a primeira grafia, porque inventar uma terceira seria pior.
  */
  it("junta grafias que diferem só na caixa", () => {
    const resultado = tallyField(
      [
        atendimento({ causa: "Erro de instalação" }),
        atendimento({ causa: "ERRO DE INSTALAÇÃO" }),
      ],
      "causa"
    );

    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0]).toMatchObject({ label: "Erro de instalação", quantos: 2 });
  });

  it("espaço em volta não cria linha nova", () => {
    const resultado = tallyField(
      [atendimento({ causa: "  Defeito  " }), atendimento({ causa: "Defeito" })],
      "causa"
    );

    expect(resultado.itens).toHaveLength(1);
  });

  /*
    Vazio não é uma categoria chamada "vazio": é atendimento que ninguém
    classificou, e some do ranking para ser contado à parte. Os 1.025 que
    entraram pela conversa estão todos aqui, porque o escopo `tickets` não está
    na credencial.
  */
  it("o não classificado fica de fora da lista e é contado à parte", () => {
    const resultado = tallyField(
      [atendimento({ causa: "Defeito" }), atendimento(), atendimento({ causa: "   " })],
      "causa"
    );

    expect(resultado.itens).toHaveLength(1);
    expect(resultado.semClassificacao).toBe(2);
    expect(resultado.classificados).toBe(1);
    expect(resultado.total).toBe(3);
  });

  /*
    A fatia é sobre os classificados. Dividir pelo total misturaria "isto é
    raro" com "isto não foi classificado", e as duas pedem providências
    diferentes.
  */
  it("a fatia é sobre os classificados", () => {
    const resultado = tallyField(
      [
        atendimento({ causa: "Defeito" }),
        atendimento({ causa: "Defeito" }),
        atendimento({ causa: "Licença" }),
        atendimento(),
      ],
      "causa"
    );

    expect(resultado.itens[0].fatia).toBeCloseTo(2 / 3);
    expect(resultado.itens[1].fatia).toBeCloseTo(1 / 3);
  });

  it("corta na lista e diz quantos valores existem", () => {
    const tickets = ["a", "b", "c", "d", "e", "f"].map((causa) => atendimento({ causa }));

    const resultado = tallyField(tickets, "causa", 3);

    expect(resultado.itens).toHaveLength(3);
    expect(resultado.distintos).toBe(6);
  });

  it("sem nenhum classificado devolve lista vazia, e não divisão por zero", () => {
    const resultado = tallyField([atendimento(), atendimento()], "causa");

    expect(resultado.itens).toEqual([]);
    expect(resultado.classificados).toBe(0);
    expect(resultado.semClassificacao).toBe(2);
  });

  it("sem atendimento nenhum não quebra", () => {
    expect(tallyField([], "causa")).toMatchObject({ total: 0, itens: [] });
  });
});

describe("tallyClassification", () => {
  /*
    A classificação chega por duas portas — propriedade do ticket e escolha do
    cliente no bot — e as duas se contam igual. Duas contagens escritas em
    separado divergem na primeira mudança.
  */
  it("conta a partir de qualquer fonte, e não só do campo do registro", () => {
    const escolha = new Map([["a", "Financeiro"], ["b", "Financeiro"], ["c", "Cursos"]]);

    const resultado = tallyClassification(
      [atendimento({ id: "a" }), atendimento({ id: "b" }), atendimento({ id: "c" })],
      (ticket) => escolha.get(ticket.id) ?? ""
    );

    expect(resultado.itens.map((item) => [item.label, item.quantos])).toEqual([
      ["Financeiro", 2],
      ["Cursos", 1],
    ]);
  });

  /*
    Entre "Erro de instalação" e "ERRO DE INSTALAÇÃO" a lista mostra a que a
    equipe usa, e não a que a ordenação trouxe primeiro.
  */
  it("o rótulo exibido é a grafia mais frequente", () => {
    const resultado = tallyField(
      [
        atendimento({ causa: "ERRO DE INSTALAÇÃO" }),
        atendimento({ causa: "Erro de instalação" }),
        atendimento({ causa: "Erro de instalação" }),
      ],
      "causa"
    );

    expect(resultado.itens[0]).toMatchObject({ label: "Erro de instalação", quantos: 3 });
  });
});
