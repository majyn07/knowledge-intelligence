import type { AIFailure } from "../providers/providerFailure";

/**
 * Falha de configuração: não há provedor utilizável neste ambiente.
 *
 * Guarda **o que foi declarado**, quando alguém declarou. Um `AI_PROVIDER`
 * escrito errado e um ambiente sem chave nenhuma são problemas diferentes, e
 * quem administra precisa saber qual dos dois é.
 */
export class AIConfigurationError extends Error {
  readonly declared?: string;

  constructor(declared?: string) {
    super("A configuração do provedor de IA está indisponível.");
    this.name = "AIConfigurationError";
    this.declared = declared;
  }
}

/**
 * Falha do provedor, com o tipo preservado.
 *
 * Antes eram todas a mesma frase ("tente novamente"), inclusive quando a
 * chave estava errada e tentar de novo não ia mudar nada. O tipo e a mensagem
 * original sobem juntos, pelo mesmo motivo da tradução do erro de acesso: o
 * texto do provedor é a única pista de quem administra.
 */
export class AIProviderError extends Error {
  readonly provider: string;
  readonly failure: AIFailure;

  constructor(provider: string, failure: AIFailure) {
    super(`O provedor de IA não pôde concluir a solicitação (${failure.kind}).`);
    this.name = "AIProviderError";
    this.provider = provider;
    this.failure = failure;
  }
}

/**
 * O pedido trouxe algo que o provedor ativo não sabe receber.
 *
 * Existe por causa do anexo: um provedor que só lê texto receberia o PDF e
 * responderia sobre nada, e a pessoa veria campos vazios sem nada dizendo que
 * o arquivo não foi lido. Ignorar em silêncio é o pior desfecho, porque parece
 * resposta.
 *
 * Separado de `AIConfigurationError` porque a saída é outra: ali falta
 * configurar, aqui a configuração está certa e o caminho é remover o anexo ou
 * trocar o provedor.
 */
export class AIUnsupportedInputError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super("O provedor de IA ativo não recebe este tipo de entrada.");
    this.name = "AIUnsupportedInputError";
    this.provider = provider;
  }
}

export class InvalidAnalysisResponseError extends Error {
  constructor() {
    super("A IA retornou uma análise em formato inválido.");
    this.name = "InvalidAnalysisResponseError";
  }
}
