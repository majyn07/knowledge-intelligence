import type { AIChatMessage } from "@/models/AIChatMessage";
import type { AIChatRequest } from "@/models/AIChatRequest";

import { buildConversationContext } from "../context/conversationContextBuilder";
import { buildKnowledgeContext } from "../context/knowledgeContextBuilder";
import { buildTicketContext } from "../context/ticketContextBuilder";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysisPrompt";
import { getAnalysisResponseJsonSchema } from "./analysisResponseSchema";

export function buildStructuredAnalysisPrompt({ context, messages }: AIChatRequest): AIChatMessage[] {
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
    "Sua resposta deve ser exclusivamente um JSON válido, sem markdown ou texto adicional.",
    "Preencha todos os campos obrigatórios exatamente conforme o schema e não inclua campos adicionais.",
    "Use data e hora ISO 8601 com timezone em analyzedAt.",
    "Não use null para campos obrigatórios; se o contexto for insuficiente, descreva essa limitação nos campos textuais relevantes.",
    "",
    "Schema obrigatório:",
    JSON.stringify(getAnalysisResponseJsonSchema(), null, 2),
  ].join("\n");

  return [
    { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
}
