import type { AIChatMessage } from "@/models/AIChatMessage";
import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildConversationContext } from "../context/conversationContextBuilder";
import { buildKnowledgeContext } from "../context/knowledgeContextBuilder";
import { buildTicketContext } from "../context/ticketContextBuilder";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysisPrompt";
import { ANALYSIS_RESPONSE_SCHEMA } from "./analysisResponseSchema";

export function buildStructuredAnalysisPrompt({
  context,
  messages,
}: AIChatRequest): AIChatMessage[] {
  const prompt = [
    buildTicketContext(context),
    "",
    buildKnowledgeContext(context),
    "",
    buildConversationContext(messages),
    "",
    "# TAREFA",
    "",
    "Analise o atendimento considerando todo o contexto disponível.",
    "",
    "Sua resposta deve ser EXCLUSIVAMENTE um JSON válido.",
    "",
    "Não utilize markdown.",
    "Não utilize ```json.",
    "Não escreva explicações antes ou depois do JSON.",
    "",
    'Os valores permitidos para "type" são exclusivamente:',
    "",
    "- new_article",
    "- update_article",
    "- faq",
    "- tip",
    "- warning",
    "",
    "Preencha todos os campos obrigatórios.",
    "Caso alguma informação não possa ser determinada pelo contexto, utilize null.",
    "Não invente informações que não estejam presentes no contexto.",
    "Retorne apenas um único objeto JSON.",
    "",
    "Estrutura obrigatória:",
    "",
    JSON.stringify(ANALYSIS_RESPONSE_SCHEMA, null, 2),
  ].join("\n");

  return [
    {
      role: "system",
      content: ANALYSIS_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: prompt,
    },
  ];
}