import type { Article } from "@/models/Article";

export const articles: Article[] = [
  {
    id: "wf-001",
    knowledgeBaseId: "workflow",
    title: "Como configurar autenticação no Workflow",
    url: "/workflow/autenticacao",
    content:
      "Este artigo descreve como configurar a autenticação no Visus Workflow utilizando as configurações disponíveis no ambiente administrativo.",
    lastUpdated: "10/07/2026",
  },
  {
    id: "wf-002",
    knowledgeBaseId: "workflow",
    title: "Cadastro de usuários",
    url: "/workflow/cadastro-usuarios",
    content:
      "Procedimento para cadastro, edição e remoção de usuários na plataforma.",
    lastUpdated: "08/07/2026",
  },
  {
    id: "wf-003",
    knowledgeBaseId: "workflow",
    title: "Permissões e perfis de acesso",
    url: "/workflow/permissoes",
    content:
      "Descrição dos perfis de acesso disponíveis e suas respectivas permissões.",
    lastUpdated: "05/07/2026",
  },
  {
    id: "collab-001",
    knowledgeBaseId: "collab",
    title: "Publicação de documentos",
    url: "/collab/publicacao-documentos",
    content:
      "Fluxo para publicação de documentos no Visus Collab.",
    lastUpdated: "11/07/2026",
  },
  {
    id: "collab-002",
    knowledgeBaseId: "collab",
    title: "Controle de versões",
    url: "/collab/controle-versoes",
    content:
      "Como controlar e consultar o histórico de versões dos documentos.",
    lastUpdated: "09/07/2026",
  },
  {
    id: "cost-001",
    knowledgeBaseId: "cost-management",
    title: "Importação de orçamento",
    url: "/cost/importacao-orcamento",
    content:
      "Procedimento para importar orçamentos para o Visus Cost Management.",
    lastUpdated: "12/07/2026",
  },
];