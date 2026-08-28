import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { AIAttachment } from "@/models/AIAttachment";
import type { AIChatMessage } from "@/models/AIChatMessage";

import { conversationOf, systemInstructionOf } from "./messageMapping";
import type { AIChatRequest } from "@/models/AIChatRequest";

import { AIConfigurationError, AIProviderError } from "../analysis/analysisErrors";
import { buildAnalysisPrompt } from "../prompts/analysisPromptBuilder";
import { buildStructuredAnalysisPrompt } from "../prompts/structuredAnalysisPromptBuilder";
import { AI_TIMEOUT_MS, type AIProvider, type AIReasoning } from "../providers/AIProvider";
import { classifyProviderFailure } from "../providers/providerFailure";

/**
 * O modelo é **fixado por versão**, e nunca por apelido móvel.
 *
 * `gemini-flash-latest` existe e seria mais curto, mas trocaria o modelo por
 * baixo do produto sem ninguém decidir, e aqui resultado de critério que
 * ninguém escolheu precisa ser anunciado. Um modelo novo muda o texto que a
 * análise devolve; isso é mudança de produto, e entra por commit.
 *
 * `gemini-2.5-flash` esteve aqui e **parou de existir para chave nova**: o
 * Google responde `404` dizendo que só quem já usava continua tendo acesso. A
 * produção seguia funcionando com a chave antiga, então o defeito só aparecia
 * para quem configurasse o ambiente do zero. Que é exatamente quem tem menos
 * informação para entender o erro.
 *
 * A escolha foi medida contra a API, e não contra a documentação: o próprio
 * erro do Google indicava o `3.6`, que falhou uma vez em quatro com
 * `UNAVAILABLE`, enquanto o `3.5` respondeu nas quatro em cerca de um segundo.
 * Documentação diz o que deveria existir; a resposta diz o que existe.
 */
const MODEL = "gemini-3.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIConfigurationError("gemini");
  return new GoogleGenAI({ apiKey });
}

/**
 * O único ponto que fala com o SDK.
 *
 * A mensagem de sistema é separada porque o Gemini a recebe num campo próprio,
 * e não como turno da conversa. É exatamente o tipo de detalhe que a fronteira
 * existe para não vazar para cima.
 */
async function complete(
  messages: AIChatMessage[],
  options: { json?: boolean; files?: AIAttachment[]; reasoning?: AIReasoning } = {}
): Promise<string> {
  const client = getClient();

  const systemInstruction = systemInstructionOf(messages);
  const texto = conversationOf(messages);

  /*
    Sem anexo o conteúdo continua sendo a string de sempre: o SDK aceita as
    duas formas, e trocar a chamada inteira por partes faria toda análise
    existente passar por um caminho novo sem necessidade.

    Com anexo, o texto vira a primeira parte e os arquivos vêm depois: o
    modelo lê a instrução antes do documento, e não o contrário.
  */
  const contents = options.files?.length
    ? [
        { text: texto },
        ...options.files.map((file) => ({
          inlineData: { mimeType: file.mimeType, data: file.data },
        })),
      ]
    : texto;

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents,
      config: {
        // Sem prazo, um pedido pendurado prende a rota até o teto da
        // plataforma, e quem pediu fica olhando um botão girar.
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(options.json ? { responseMimeType: "application/json" } : {}),
        /*
          `thinkingBudget: 0` desliga o raciocínio estendido, que neste modelo
          vem ligado. Só para quem pediu `minimo`: a análise do atendimento
          continua deliberando, porque ali a conclusão não está no texto.
        */
        ...(options.reasoning === "minimo" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    });

    /*
      Resposta vazia não é falha de rede: o modelo respondeu e não disse nada,
      filtro de segurança, ou geração interrompida. Vale a mesma classificação
      de desconhecida, mas com o motivo escrito, senão vira "indisponível" e
      manda tentar de novo para sempre.
    */
    if (!response.text) {
      throw new AIProviderError("gemini", {
        kind: "desconhecida",
        detail: "O modelo respondeu sem conteúdo.",
      });
    }

    /*
      Resposta cortada tem nome próprio.

      Sem `maxOutputTokens` declarado vale o teto do modelo, e a análise de uma
      conversa de oitenta mensagens chega perto dele: o texto vem pela metade,
      com o JSON aberto e sem fechar. Isso subia como "a IA devolveu uma
      análise em formato inválido. Peça de novo", que manda a pessoa repetir um
      pedido que vai ser cortado de novo, no mesmo lugar.

      `STOP` é o fim normal. Qualquer outro motivo é dito como veio, pelo mesmo
      princípio das outras falhas de provedor: o texto original é a única pista
      de quem administra.
    */
    const motivo = response.candidates?.[0]?.finishReason;

    if (motivo && motivo !== "STOP") {
      throw new AIProviderError("gemini", {
        kind: "desconhecida",
        detail: `O modelo interrompeu a resposta (${motivo}).`,
      });
    }

    return response.text;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;

    throw new AIProviderError("gemini", classifyProviderFailure(error));
  }
}

export const geminiService: AIProvider = {
  id: "gemini",

  complete,

  chat(request: AIChatRequest) {
    return complete(buildAnalysisPrompt(request));
  },

  analyze(request: AIChatRequest) {
    return complete(buildStructuredAnalysisPrompt(request), { json: true });
  },
};
