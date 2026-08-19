export class AIConfigurationError extends Error {
  constructor() {
    super("A configuração do provedor de IA está indisponível.");
    this.name = "AIConfigurationError";
  }
}

export class AIProviderError extends Error {
  constructor() {
    super("O provedor de IA não pôde concluir a solicitação.");
    this.name = "AIProviderError";
  }
}

export class InvalidAnalysisResponseError extends Error {
  constructor() {
    super("A IA retornou uma análise em formato inválido.");
    this.name = "InvalidAnalysisResponseError";
  }
}
