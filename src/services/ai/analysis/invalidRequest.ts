import type { ZodError } from "zod";

/**
 * Por que o pedido foi recusado, e não só que foi.
 *
 * As rotas de IA respondiam "Dados inválidos para iniciar a análise." e nada
 * mais, e a tela traduzia isso para "não foi possível concluir a análise". Não
 * era pouco detalhe: era detalhe **nenhum**. Quando o registro cru do
 * atendimento entrou no modelo, todo pedido passou a ser recusado pelo contrato
 * estrito, e não havia nada, nem na tela nem no console do servidor, apontando
 * para o campo a mais.
 *
 * O que sai daqui é caminho de campo e motivo, que é forma e não conteúdo:
 * `context.ticket.raw: campo não previsto`. Nenhum valor do pedido é copiado
 * para a resposta, então nada de cliente atravessa junto.
 *
 * O corte existe porque um objeto com uma chave errada por campo produziria uma
 * mensagem do tamanho do pedido, e uma mensagem que ninguém lê é o problema que
 * viemos consertar.
 */
const NO_MAXIMO = 5;

export function invalidRequestMessage(assunto: string, erro: ZodError): string {
  const problemas = erro.issues.slice(0, NO_MAXIMO).map((issue) => {
    const caminho = issue.path.join(".");

    return caminho === "" ? issue.message : `${caminho}: ${issue.message}`;
  });

  const restantes = erro.issues.length - problemas.length;
  const eOutros = restantes > 0 ? `, e mais ${restantes}` : "";

  return `${assunto} ${problemas.join("; ")}${eOutros}.`;
}
