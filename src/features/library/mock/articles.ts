import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

/**
 * Semente da Base de Conhecimento. Reúne o conteúdo que antes vivia numa base
 * paralela usada só pela busca, para que exista um único acervo.
 */
export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: "article-001",
    title: "Erro ao autenticar após atualização",
    summary: "Procedimento para resolver falhas de autenticação após atualização do sistema.",
    content: `
Após uma atualização do sistema, alguns usuários podem perder a autenticação.

Verifique:

- Token expirado
- Permissões do usuário
- Sessão inválida
- Cache do navegador

Caso necessário, solicite novo login.
`.trim(),
    projectId: "project-001",
    type: "article",
    status: "published",
    product: "AltoQi Visus",
    module: "Workflow",
    category: "Instalação e acesso ao software",
    tags: ["autenticação", "acesso"],
    keywords: ["login", "token", "sessão", "permissão", "atualização"],
    createdAt: new Date("2026-05-10"),
    updatedAt: new Date("2026-06-18"),
  },
  {
    id: "article-002",
    title: "Falha ao sincronizar projetos",
    summary: "Soluções para erros de sincronização entre estação e nuvem.",
    content: `
Verifique:

- conexão com internet
- permissões
- versão do projeto
- conflitos de sincronização
`.trim(),
    projectId: "project-001",
    type: "article",
    status: "published",
    product: "AltoQi Visus",
    module: "Collab",
    category: "Utilização do software",
    tags: ["sincronização"],
    keywords: ["sincronizar", "conflito", "nuvem", "versão"],
    createdAt: new Date("2026-04-22"),
    updatedAt: new Date("2026-05-30"),
  },
  {
    id: "article-003",
    title: "Problemas de acesso ao Workflow",
    summary: "Erros comuns de acesso ao Workflow e como diagnosticá-los.",
    content: `
Confira:

- usuário ativo
- permissões
- grupos
- autenticação
`.trim(),
    projectId: "project-001",
    type: "article",
    status: "published",
    product: "AltoQi Visus",
    module: "Workflow",
    category: "Instalação e acesso ao software",
    tags: ["acesso", "permissões"],
    keywords: ["workflow", "grupo", "perfil", "usuário"],
    createdAt: new Date("2026-03-14"),
    updatedAt: new Date("2026-06-02"),
  },
  {
    id: "article-004",
    title: "Como criar um Workflow",
    summary: "Guia para criação e configuração de workflows no Visus.",
    content: `
Passo a passo para criar um novo fluxo:

1. Acesse o menu **Workflows**
2. Escolha um modelo ou comece em branco
3. Defina as etapas e os responsáveis
4. Publique o fluxo para a equipe
`.trim(),
    projectId: "project-001",
    type: "article",
    status: "published",
    product: "AltoQi Visus",
    module: "Workflow",
    category: "Utilização do software",
    tags: ["workflow", "configuração"],
    keywords: ["criar", "fluxo", "etapas", "modelo"],
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
  },
  {
    id: "article-005",
    title: "Fluxo de aprovação de artigos",
    summary: "Documentação do processo de revisão e publicação da Base de Conhecimento.",
    content: "",
    projectId: "project-001",
    type: "workflow",
    status: "draft",
    product: "AltoQi Visus",
    module: "",
    category: "Processos",
    tags: ["aprovação", "kb"],
    keywords: [],
    createdAt: new Date("2026-07-10"),
    updatedAt: new Date("2026-07-12"),
  },
  {
    id: "article-006",
    title: "FAQ - Planning 4D",
    summary: "Perguntas frequentes relacionadas ao módulo Planning 4D.",
    content: "",
    projectId: "project-003",
    type: "faq",
    status: "published",
    product: "AltoQi Visus",
    module: "Planning",
    category: "Utilização do software",
    tags: ["planning", "4d"],
    keywords: ["cronograma", "gantt"],
    createdAt: new Date("2026-06-28"),
    updatedAt: new Date("2026-07-02"),
  },
];
