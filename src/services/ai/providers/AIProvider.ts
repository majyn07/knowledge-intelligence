import type { AIChatRequest } from "@/models/AIChatRequest";

import type { AIProviderId } from "./catalog";

/**
 * O que um provedor de IA precisa saber fazer.
 *
 * Duas operações, e a diferença entre elas não é o modelo: `chat` devolve
 * texto para a conversa da análise, `analyze` devolve JSON que passa pelo
 * schema estrito antes de virar oportunidade. Quem decide o que fazer com o
 * resultado é a revisão humana, em qualquer um dos dois.
 *
 * Somar um provedor é escrever um arquivo que satisfaça isto e citá-lo no
 * registro. Nada fora de `services/ai/server` conhece nome de modelo, formato
 * de mensagem ou SDK — foi para isso que a fronteira existe.
 */
export interface AIProvider {
  id: AIProviderId;
  /** Resposta em texto, para a conversa da análise. */
  chat(request: AIChatRequest): Promise<string>;
  /** Resposta estruturada, validada depois pelo schema da análise. */
  analyze(request: AIChatRequest): Promise<string>;
}

/**
 * Prazo que damos ao provedor antes de desistir.
 *
 * Sem ele um pedido pendurado prende a rota até o teto da plataforma, e quem
 * pediu a análise fica olhando um botão girando sem nada acontecer. Noventa
 * segundos é folgado para uma análise estruturada e curto o bastante para a
 * falha chegar como falha.
 */
export const AI_TIMEOUT_MS = 90_000;
