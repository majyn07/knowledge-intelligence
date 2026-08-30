import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";

import { indexarRespostas, respostasDoChatbot } from "./chatbotAnswers";

const conversa = (corpos: string[]): SupportConversation => ({
  id: "c1",
  ticketId: "t1",
  messages: corpos.map((body, i) => ({
    id: `m${i}`,
    author: "Alguém",
    role: i % 2 === 0 ? "automacao" : "cliente",
    body,
    createdAt: "2026-08-20T10:00:00.000Z",
  })),
});

const AREA = "Selecione a opção que melhor descreve o motivo do seu contato hoje:";
const TIPO = "Selecione a opção que melhor representa o tipo da sua solicitação:";

describe("respostasDoChatbot", () => {
  /*
    A classificação do ticket está atrás de um escopo que a credencial não tem,
    e não há exportação em CSV. Mas o bot pergunta ao cliente antes de abrir o
    chamado, e a resposta é uma mensagem da conversa — que já temos.
  */
  it("lê a escolha que vem depois de cada pergunta", () => {
    const resposta = respostasDoChatbot(
      conversa([AREA, "Setup e Suporte ao Produto", TIPO, "Ativação de licenças ou login"])
    );

    expect(resposta.areaDoContato).toBe("Setup e Suporte ao Produto");
    expect(resposta.tipoDaSolicitacao).toBe("Ativação de licenças ou login");
  });

  /*
    "Voltar ao menu anterior" aparece sete vezes no acervo e é navegação:
    contá-la criaria uma linha no ranking que não descreve atendimento nenhum.
    Quem voltou respondeu depois.
  */
  it("pula a opção de navegação e segue até a resposta", () => {
    const resposta = respostasDoChatbot(
      conversa([TIPO, "Voltar ao menu anterior", "Erro ou problema exibido"])
    );

    expect(resposta.tipoDaSolicitacao).toBe("Erro ou problema exibido");
  });

  /*
    Um cliente digitou "Bom dia, voltou o acesso. Está funcionando normalmente."
    logo depois da pergunta, e aquilo virou um valor de uma ocorrência só. As
    opções do bot são curtas: o teto separa escolha de texto livre sem precisar
    conhecer a lista, que muda quando o suporte a muda.
  */
  /*
    O teto sozinho não bastou: esta frase tem cinquenta e cinco caracteres e
    apareceu no ranking do acervo real como se fosse escolha de uma pessoa.
    Opção de menu não termina em ponto nem emenda duas frases.
  */
  it("frase com pontuação de fim não é escolha", () => {
    const resposta = respostasDoChatbot(
      conversa([AREA, "Bom dia, voltou o acesso. Está funcionando normalmente."])
    );

    expect(resposta.areaDoContato).toBe("");
  });

  it("as opções de verdade não têm pontuação de fim e passam", () => {
    for (const opcao of [
      "Dúvida sobre como usar uma funcionalidade",
      "Erro ou problema exibido enquanto uso o software",
      "Ativação de licenças ou login",
      "Setup & Suporte Técnico",
    ]) {
      expect(respostasDoChatbot(conversa([TIPO, opcao])).tipoDaSolicitacao).toBe(opcao);
    }
  });

  it("texto livre longo não é escolha", () => {
    const resposta = respostasDoChatbot(
      conversa([
        AREA,
        "Bom dia, voltou o acesso. Está funcionando normalmente, obrigado pela ajuda de vocês hoje.",
      ])
    );

    expect(resposta.areaDoContato).toBe("");
  });

  it("pergunta sem resposta fica vazia", () => {
    expect(respostasDoChatbot(conversa([AREA])).areaDoContato).toBe("");
  });

  it("conversa sem as perguntas devolve os dois vazios", () => {
    const resposta = respostasDoChatbot(conversa(["Olá", "Bom dia"]));

    expect(resposta).toEqual({ areaDoContato: "", tipoDaSolicitacao: "" });
  });

  it("sem conversa não quebra", () => {
    expect(respostasDoChatbot(undefined).areaDoContato).toBe("");
  });

  /* A redação do bot variou com o tempo; o miolo da frase é o que se manteve. */
  it("casa por trecho, não pela frase inteira", () => {
    const resposta = respostasDoChatbot(
      conversa(["Por favor, selecione a opção que melhor descreve o motivo do seu contato:", "Financeiro"])
    );

    expect(resposta.areaDoContato).toBe("Financeiro");
  });

  it("a primeira pergunta vence, e não a última", () => {
    const resposta = respostasDoChatbot(conversa([AREA, "Financeiro", AREA, "Cursos"]));

    expect(resposta.areaDoContato).toBe("Financeiro");
  });
});

describe("indexarRespostas", () => {
  it("indexa por atendimento, uma vez por coleção", () => {
    const lista = [conversa([AREA, "Financeiro"])];

    expect(indexarRespostas(lista)).toBe(indexarRespostas(lista));
    expect(indexarRespostas(lista).get("t1")?.areaDoContato).toBe("Financeiro");
  });

  it("coleção nova refaz o índice", () => {
    const primeira = indexarRespostas([conversa([AREA, "Financeiro"])]);
    const segunda = indexarRespostas([conversa([AREA, "Cursos"])]);

    expect(segunda).not.toBe(primeira);
    expect(segunda.get("t1")?.areaDoContato).toBe("Cursos");
  });
});
