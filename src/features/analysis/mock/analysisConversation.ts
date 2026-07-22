import type { AnalysisMessage } from "@/models/AnalysisMessage";

export const analysisConversation: AnalysisMessage[] = [
  {
    id: "1",
    author: "assistant",
    message:
      "Analisei o atendimento e identifiquei que a Base de Conhecimento cobre parcialmente o problema relatado.\n\nForam encontrados artigos relacionados ao tema, porém o procedimento utilizado para solucionar o atendimento não está completamente documentado.\n\nAs principais oportunidades de melhoria estão listadas acima. Caso queira aprofundar alguma sugestão ou discutir alternativas, podemos continuar a conversa por aqui.",
    createdAt: "15/07/2026 10:08",
    status: "completed",
  },
];