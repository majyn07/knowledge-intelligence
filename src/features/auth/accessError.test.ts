import { describe, expect, it } from "vitest";

import { accessFailureFromSearch, accessFailureMessage } from "./accessError";

describe("accessFailureMessage", () => {
  it("explica o link pedido em outro navegador sem culpar o e-mail", () => {
    /*
      O defeito que fez o acesso parecer falha de entrega: a pessoa clicava,
      voltava para a tela em silêncio, e pedia outro link. A mensagem precisa
      dizer onde clicar — mandar pedir de novo sem explicar repete o erro.
    */
    const texto = accessFailureMessage("outro-navegador");

    expect(texto).toContain("navegador");
    expect(texto).toContain("nesta janela");
  });

  it("link expirado aponta para o mais recente", () => {
    const texto = accessFailureMessage("link-expirado");

    expect(texto).toContain("novo");
  });

  it("sem servidor manda avisar quem administra, e não tentar de novo", () => {
    /*
      Pedir outro link não resolve ausência de servidor. Sugerir isso faria a
      pessoa esgotar o limite de envio atrás de um erro de configuração.
    */
    const texto = accessFailureMessage("sem-servidor");

    expect(texto).toContain("administra");
    expect(texto).not.toContain("Peça um novo");
  });

  it("motivo desconhecido não vira frase genérica", () => {
    /*
      Texto inventado na tela de acesso é pior que tela limpa: quem lê tenta
      resolver algo que não é o problema.
    */
    expect(accessFailureMessage("qualquer-coisa")).toBeNull();
  });

  it("ausência de motivo não diz nada", () => {
    expect(accessFailureMessage(null)).toBeNull();
    expect(accessFailureMessage(undefined)).toBeNull();
    expect(accessFailureMessage("")).toBeNull();
  });

  it("reconhece o motivo independente de caixa e espaço", () => {
    expect(accessFailureMessage("  Link-Expirado ")).toContain("novo");
  });
});

describe("accessFailureFromSearch", () => {
  it("lê o motivo da query string", () => {
    expect(accessFailureFromSearch("?acesso=link-expirado")).toContain("novo");
  });

  it("ignora query sem o parâmetro", () => {
    expect(accessFailureFromSearch("?outra=coisa")).toBeNull();
    expect(accessFailureFromSearch("")).toBeNull();
  });

  it("convive com outros parâmetros na URL", () => {
    expect(accessFailureFromSearch("?ref=email&acesso=outro-navegador")).toContain(
      "navegador"
    );
  });
});
