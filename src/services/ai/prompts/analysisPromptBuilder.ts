import type { AIChatMessage } from "@/models/AIChatMessage";
import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildConversationContext } from "../context/conversationContextBuilder";
import { buildKnowledgeContext } from "../context/knowledgeContextBuilder";
import { buildTicketContext } from "../context/ticketContextBuilder";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysisPrompt";

export function buildAnalysisPrompt({
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
    "Responda à última pergunta do analista considerando todo o contexto recebido. Caso o contexto seja insuficiente, informe explicitamente quais informações adicionais seriam necessárias.",
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