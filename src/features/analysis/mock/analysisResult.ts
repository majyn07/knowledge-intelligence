import type { AnalysisResult } from "@/models/AnalysisResult";

export const mockAnalysisResult: AnalysisResult = {
  classification: "partial",

  confidence: 0.94,

  relatedArticles: 2,

  recommendations: [
    {
      id: "rec-001",

      solution: "Workflow",

      type: "update",

      article: "Workflow - Cadastro de Usuários",

      section: "Autenticação",

      suggestedContent:
        "Adicionar um procedimento explicando o novo fluxo de autenticação após a atualização do sistema, incluindo as validações realizadas durante o login.",

      justification:
        "O procedimento identificado no atendimento não está documentado no artigo atual.",
    },

    {
      id: "rec-002",

      solution: "Workflow",

      type: "review",

      article: "Workflow - Permissões",

      section: "Perfis de Acesso",

      suggestedContent:
        "Revisar as permissões descritas para refletir o comportamento atual da aplicação e incluir os novos perfis disponíveis.",

      justification:
        "O conteúdo do artigo está desatualizado em relação à versão atual do sistema.",
    },
  ],
};