import type { AnalysisMessage } from "@/models/AnalysisMessage";

export function buildConversationContext(
  messages: AnalysisMessage[]
): string {
  const conversation = messages
    .map((message) => {
      const author =
        message.author === "assistant"
          ? "IA"
          : "Analista";

      return `${author}: ${message.message}`;
    })
    .join("\n\n");

  return `
# HISTÓRICO DA CONVERSA

${conversation || "Nenhuma conversa iniciada."}
`.trim();
}