import type { AnalysisResult } from "@/models/AnalysisResult";

export const mockAnalysisResult: AnalysisResult = {
  identification: {
    ticketId: "ticket-001",
    title: "Falha na autenticação após atualização",
    company: "Empresa Exemplo",
    solution: "Visus Workflow",
    analyst: "IA",
    analyzedAt: new Date().toISOString(),
  },

  summary: {
    resume:
      "A análise identificou divergências entre a documentação disponível e o procedimento utilizado pelo suporte.",

    customerProblem:
      "O usuário não conseguiu concluir o processo de autenticação.",

    rootCause:
      "A Base de Conhecimento não foi atualizada após alterações no sistema.",

    supportAction:
      "O analista orientou o cliente utilizando um procedimento ainda não documentado.",

    outcome:
      "O atendimento foi concluído com sucesso e foram identificadas oportunidades de melhoria para a Base de Conhecimento.",
  },

  classification: {
    documentationStatus: "partial",
    confidenceLevel: "high",
  },

  confidence: 94,

  relatedArticles: 2,

  opportunities: [
    {
      id: "opp-001",
      type: "update_article",
      title: "Atualizar artigo de autenticação",
      description:
        "Adicionar o novo fluxo de autenticação, incluindo as validações executadas após a atualização do sistema.",
      justification:
        "O procedimento utilizado pelo suporte não está refletido na documentação atual.",
      status: "proposed",
    },
    {
      id: "opp-002",
      type: "warning",
      title: "Revisar documentação de permissões",
      description:
        "Revisar os artigos relacionados às permissões para refletir os novos perfis disponíveis.",
      justification:
        "Foi identificada documentação desatualizada durante a análise do atendimento.",
      status: "proposed",
    },
  ],
};
