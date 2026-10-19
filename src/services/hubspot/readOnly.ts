/**
 * Os únicos POST que a HubSpot usa para **ler**: busca e leitura em lote.
 *
 * A regra "só leitura" era comentário, e comentário não impede ninguém. Em
 * 19/10/2026 a chave ganhou escopos novos; com escopo de escrita concedido um
 * dia, um `post` mal apontado criaria ou alteraria registro de cliente no CRM
 * de produção. Aqui a regra é código, e vive fora do cliente HTTP para poder
 * ser testada sem rede.
 */
const POST_DE_LEITURA = /\/(search|batch\/read)$/;

export function postDeLeitura(caminho: string): boolean {
  return POST_DE_LEITURA.test(caminho.split("?")[0]);
}
