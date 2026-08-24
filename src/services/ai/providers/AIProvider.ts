import type { AIAttachment } from "@/models/AIAttachment";
import type { AIChatMessage } from "@/models/AIChatMessage";
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
/**
 * Quanto raciocínio o pedido justifica.
 *
 * Não é ajuste fino de desempenho: é a diferença entre a extração funcionar e
 * estourar o prazo. Medido contra a API, com a mesma página e o mesmo pedido:
 * com raciocínio, **59 segundos** e 1661 tokens de pensamento; sem,
 * **14 segundos** e a mesma resposta — 417 contra 421 tokens de saída. Era o
 * raciocínio que consumia o prazo inteiro e devolvia `503` sob anexo maior.
 *
 * `minimo` é para **extrair o que está escrito**: ler um documento e distribuir
 * o conteúdo por campos não exige deliberação, e pagá-la custa a resposta.
 * `padrao` é para julgar — a análise do atendimento, onde a conclusão não está
 * no texto e precisa ser construída.
 *
 * É conceito de todos os provedores atuais, e não da Google: cada um mapeia
 * para o que o seu SDK chama disso. Quem não tiver o conceito ignora, e nada
 * quebra — a diferença aparece no relógio, não no contrato.
 */
export type AIReasoning = "minimo" | "padrao";

export interface AIProvider {
  id: AIProviderId;
  /** Resposta em texto, para a conversa da análise. */
  chat(request: AIChatRequest): Promise<string>;
  /** Resposta estruturada, validada depois pelo schema da análise. */
  analyze(request: AIChatRequest): Promise<string>;
  /**
   * Um pedido qualquer, com as mensagens já montadas.
   *
   * Existe porque `chat` e `analyze` carregavam o construtor de prompt da
   * análise dentro do provider — o que obrigava toda operação nova a virar um
   * método novo do contrato. Com isto, o prompt fica onde é assunto do
   * produto, e o provider volta a saber só falar com o modelo.
   *
   * `files` entra como opção, e não como método novo, pelo mesmo motivo: um
   * `completeWithFiles` faria o contrato crescer a cada formato de entrada, e
   * anexar é detalhe do pedido, não outra operação.
   *
   * **Quem não lê arquivo declara `readsFiles: false` no catálogo, e não
   * ignora a opção.** Ignorar produziria a pior resposta possível — o modelo
   * respondendo sobre nada, sem erro, com o documento descartado em silêncio —
   * e quem pediu concluiria que o arquivo não tinha a informação. Declarado,
   * o pedido é recusado antes de sair e a tela nem oferece o anexo.
   *
   * O anexo chega em base64 com o tipo declarado, que é o formato que Gemini,
   * Claude e GPT aceitam. Converter para o que o SDK espera é trabalho do
   * arquivo do provedor, e não sobe daqui.
   */
  complete(
    messages: AIChatMessage[],
    options?: { json?: boolean; files?: AIAttachment[]; reasoning?: AIReasoning }
  ): Promise<string>;
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
