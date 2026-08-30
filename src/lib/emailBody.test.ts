import { describe, expect, it } from "vitest";

import { corpoEscrito } from "./emailBody";

describe("corpoEscrito", () => {
  /*
    O bloco de contato de quem enviou era o que colava o maior grupo do
    Levantamento: "andressa, bancarios, centro, commercial".
  */
  it("corta o bloco de assinatura depois de dois hífens", () => {
    const texto = [
      "Segue pedido: não faturar, aguardar ok.",
      "--",
      "Andressa Franciele Silva",
      "Commercial Specialist",
      "Rua Saldanha Marinho, 392 | Centro | Florianópolis - SC",
    ].join("\n");

    expect(corpoEscrito(texto)).toBe("Segue pedido: não faturar, aguardar ok.");
  });

  /*
    O aviso jurídico é longo e idêntico em toda mensagem da mesma empresa:
    sozinho, ele dobra o vocabulário de uma fala curta.
  */
  it("corta o aviso de confidencialidade", () => {
    const texto = [
      "Não recebemos a fatura de 08/2026.",
      "",
      "Esta mensagem e seus anexos podem conter informações confidenciais,",
      "de uso único e exclusivo do destinatário indicado.",
    ].join("\n");

    expect(corpoEscrito(texto)).toBe("Não recebemos a fatura de 08/2026.");
  });

  it("corta o rodapé de descadastro da lista", () => {
    const texto =
      "Por gentileza, favor enviar.\nTo unsubscribe from this group and stop receiving emails from it, send an email to financeiro+unsubscribe@altoqi.com.br.";

    expect(corpoEscrito(texto)).toBe("Por gentileza, favor enviar.");
  });

  it("corta a mensagem citada, em português e em inglês", () => {
    expect(
      corpoEscrito("Pode emitir a NF.\nEm qui., 20 de ago. de 2026 às 11:58, AltoQI escreveu:\nolá")
    ).toBe("Pode emitir a NF.");

    expect(corpoEscrito("Please proceed.\nOn Mon, Aug 24, 2026, AltoQI wrote:\nhello")).toBe(
      "Please proceed."
    );
  });

  it("corta o aviso de aplicativo de celular", () => {
    expect(corpoEscrito("O programa não abre.\nEnviado do meu iPhone")).toBe(
      "O programa não abre."
    );
  });

  /*
    Cortar no primeiro, e não em cada um: o que vem entre um marcador e o
    seguinte já é rodapé tanto quanto o resto.
  */
  it("corta no primeiro marcador quando há vários", () => {
    const texto = [
      "A viga some ao recalcular.",
      "--",
      "Fulano de Tal",
      "Esta mensagem e seus anexos são confidenciais.",
      "To unsubscribe from this group, envie um e-mail.",
    ].join("\n");

    expect(corpoEscrito(texto)).toBe("A viga some ao recalcular.");
  });

  /*
    Marcador é linha inteira, e não trecho: hífen no meio de frase é hífen, e
    quem fala "esta mensagem" no meio de um parágrafo está descrevendo o caso.
  */
  it("não corta em hífen no meio da frase", () => {
    const texto = "O erro aparece no Builder -- só depois de atualizar.";

    expect(corpoEscrito(texto)).toBe(texto);
  });

  it("não corta quando o marcador é parte do que a pessoa contou", () => {
    const texto = "Recebi esta mensagem e seus anexos abriram normalmente, o problema é outro.";

    expect(corpoEscrito(texto)).toBe(texto);
  });

  /*
    "De:" e "From:" ficaram de fora de propósito: num e-mail encaminhado, o
    pedido costuma estar dentro do trecho encaminhado, e cortar ali jogaria
    fora justamente a descrição. São 317 falas no acervo — ambíguo demais.
  */
  it("não corta em cabeçalho de encaminhamento", () => {
    const texto = "Segue abaixo.\nDe: Cliente <cliente@empresa.com>\nO modelo IFC abre deslocado";

    expect(corpoEscrito(texto)).toContain("IFC abre deslocado");
  });

  it("texto sem marcador nenhum atravessa inteiro", () => {
    const texto = "Bom dia, o Eberick não abre depois da atualização.";

    expect(corpoEscrito(texto)).toBe(texto);
  });

  it("mensagem que é só assinatura vira vazio", () => {
    expect(corpoEscrito("--\nFulano de Tal\nAnalista")).toBe("");
  });

  it("texto vazio não quebra", () => {
    expect(corpoEscrito("")).toBe("");
  });
});

/*
  A saudacao e enfeite EM CIMA, e os outros marcadores so cortam para baixo.
  Medido nas 1.025 solucoes do acervo: 301 (29%) abrem com saudacao, e 95 (9%)
  trazem um nome proprio nela.
*/
describe("a saudacao de abertura", () => {
  it("a saudacao com o nome do cliente sai", () => {
    const limpo = corpoEscrito("Boa tarde, Uesley!\nReposicione o modelo na origem.");

    expect(limpo).not.toContain("Uesley");
    expect(limpo).toContain("Reposicione o modelo na origem");
  });

  it("linha em branco antes da saudacao nao impede o corte", () => {
    const limpo = corpoEscrito("\n\nBom dia, Eduardo, tudo bem?\nAbra o menu Arquivo.");

    expect(limpo).toBe("Abra o menu Arquivo.");
  });

  /* Um paragrafo que comeca com Ola e segue explicando e a resposta. */
  it("linha longa que comeca com saudacao nao e cumprimento", () => {
    const resposta =
      "Ola, o erro acontece porque o modelo foi exportado fora da origem e o Eberick nao reposiciona sozinho na importacao, entao e preciso ajustar antes.";

    expect(corpoEscrito(resposta)).toBe(resposta);
  });

  it("texto sem saudacao fica intacto", () => {
    expect(corpoEscrito("Reposicione o modelo na origem.")).toBe("Reposicione o modelo na origem.");
  });

  /* So a primeira linha: um cumprimento no meio do texto e a pessoa falando. */
  it("saudacao no meio do texto fica", () => {
    const limpo = corpoEscrito("Segue o retorno.\nBoa tarde para voce tambem.");

    expect(limpo).toContain("Boa tarde");
  });
});
