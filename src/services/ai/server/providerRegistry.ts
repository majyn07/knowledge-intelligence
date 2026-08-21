import "server-only";

import { AIConfigurationError } from "../analysis/analysisErrors";
import type { AIProvider } from "../providers/AIProvider";
import { resolveActiveProvider, type AIProviderId } from "../providers/catalog";
import { geminiService } from "./geminiService";

/**
 * Onde os provedores se registram.
 *
 * Somar um é escrever o arquivo e citá-lo aqui. Nada acima desta camada
 * conhece SDK, nome de modelo ou formato de mensagem — a rota pede análise, e
 * quem responde é quem estiver valendo.
 *
 * A Claude ainda não está aqui **de propósito**: ela entra escrita contra a
 * resposta real da API, e não contra o que a documentação promete. Ligar rede
 * ou credencial exige autorização antes, e a autorização não saiu.
 */
const REGISTRY: Partial<Record<AIProviderId, AIProvider>> = {
  gemini: geminiService,
};

/**
 * O provedor que está valendo, ou a recusa explicando por quê.
 *
 * `AIConfigurationError` em vez de `null`: quem chama vai usar o resultado na
 * linha seguinte, e devolver nulo empurraria a mesma decisão para todos os
 * pontos de uso.
 */
export function activeProvider(): AIProvider {
  const resolved = resolveActiveProvider(process.env);

  if (resolved.id === null) throw new AIConfigurationError(resolved.declared);

  const provider = REGISTRY[resolved.id];

  /*
    Chave configurada para um provedor que o produto ainda não implementa —
    hoje, a Claude. Não caímos no outro: quem pôs a chave quis aquele, e
    responder com outro modelo em silêncio seria trocar o autor da análise sem
    ninguém saber.
  */
  if (!provider) throw new AIConfigurationError(resolved.id);

  return provider;
}
