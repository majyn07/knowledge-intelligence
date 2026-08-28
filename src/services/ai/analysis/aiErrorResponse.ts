import {
  AIConfigurationError,
  AIProviderError,
  AIUnsupportedInputError,
  InvalidAnalysisResponseError,
} from "./analysisErrors";

/**
 * O que a rota responde quando a análise não sai.
 *
 * Puro, e compartilhado pelas duas rotas: escritos em separado, os dois
 * divergem. É a mesma razão de exibir e exportar passarem pelo mesmo
 * `cellValue`.
 *
 * As mensagens dizem **o que fazer**, e não o que aconteceu por dentro. Antes
 * eram duas frases para tudo, e "tente novamente" aparecia inclusive quando a
 * chave estava errada e tentar de novo não ia mudar nada.
 */

export interface AIErrorResponse {
  status: number;
  message: string;
}

export function aiErrorResponse(error: unknown): AIErrorResponse {
  if (error instanceof AIConfigurationError) {
    return {
      status: 503,
      message: error.declared
        ? `O provedor de IA configurado (${error.declared}) não está disponível neste ambiente. Isso se resolve na configuração.`
        : "O serviço de IA não está configurado neste ambiente.",
    };
  }

  if (error instanceof AIProviderError) {
    switch (error.failure.kind) {
      case "credencial":
        return {
          status: 503,
          message:
            "A chave do provedor de IA não foi aceita. Isso se resolve na configuração, tentar de novo não muda.",
        };

      case "limite":
        return {
          status: 429,
          message:
            "O provedor de IA atingiu o limite de uso. Espere alguns minutos e peça de novo.",
        };

      case "prazo":
        return {
          status: 504,
          message: "O provedor de IA passou do tempo limite. Peça a análise de novo.",
        };

      case "indisponivel":
        return {
          status: 503,
          message:
            "O provedor de IA está indisponível ou sobrecarregado. Espere alguns minutos e peça de novo.",
        };

      default:
        /*
          Desconhecida leva a mensagem original junto, pela mesma razão do erro
          de acesso: ela é a única pista de quem administra, e trocá-la por
          texto genérico apaga a investigação inteira.
        */
        return {
          status: 502,
          message: error.failure.detail
            ? `O provedor de IA falhou: ${error.failure.detail}`
            : "O provedor de IA falhou sem dizer o motivo.",
        };
    }
  }

  if (error instanceof AIUnsupportedInputError) {
    /*
      422, e não 503: nada está fora do ar. O pedido é que não cabe no
      provedor que está valendo, e a saída está na mão de quem pediu.
    */
    return {
      status: 422,
      message:
        "O provedor de IA configurado neste ambiente não lê arquivos anexados. Descreva em texto, ou peça a quem administra para trocar o provedor.",
    };
  }

  if (error instanceof InvalidAnalysisResponseError) {
    return {
      status: 422,
      message: "A IA devolveu uma análise em formato inválido. Peça de novo.",
    };
  }

  return { status: 500, message: "Não foi possível processar a solicitação." };
}
