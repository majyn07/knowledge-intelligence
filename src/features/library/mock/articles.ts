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
    content: `## Problema

Após uma atualização do sistema, alguns usuários deixam de conseguir autenticar e recebem mensagem de sessão inválida.

## Causa

O processo de atualização pode invalidar o token da sessão anterior ou alterar a configuração do provedor de identidade.

## Solução

1. Confirme se o token da sessão expirou
2. Verifique as permissões do usuário e o grupo ao qual ele pertence
3. Limpe o cache do navegador
4. Solicite novo login

## Como validar

O usuário conclui o login e acessa o módulo sem nova mensagem de erro.`.trim(),
    projectId: "project-001",
    genreId: "gen-artigo",
    status: "published",
    sectionId: "sec-altoqi-visus-workflow",
    tags: ["autenticação", "acesso"],
    keywords: ["login", "token", "sessão", "permissão", "atualização"],
    author: "Suporte Visus",
    contentFormat: "markdown",
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
    genreId: "gen-artigo",
    status: "published",
    sectionId: "sec-altoqi-visus-collab",
    tags: ["sincronização"],
    keywords: ["sincronizar", "conflito", "nuvem", "versão"],
    author: "Suporte Visus",
    contentFormat: "markdown",
    createdAt: new Date("2026-04-22"),
    updatedAt: new Date("2026-05-30"),
  },
  {
    id: "article-003",
    title: "Problemas de acesso ao Workflow",
    summary: "Erros comuns de acesso ao Workflow e como diagnosticá-los.",
    content: `## Problema

Usuários relatam erro ao abrir o Workflow, mesmo com credenciais corretas.

## O que verificar

- Usuário está ativo na conta
- Permissões do perfil aplicado
- Grupos aos quais o usuário pertence
- Autenticação integrada configurada

## Solução

Ajuste o perfil de permissão e solicite que o usuário faça login novamente.`.trim(),
    projectId: "project-001",
    genreId: "gen-artigo",
    status: "published",
    sectionId: "sec-altoqi-visus-workflow",
    tags: ["acesso", "permissões"],
    keywords: ["workflow", "grupo", "perfil", "usuário"],
    author: "Suporte Visus",
    contentFormat: "markdown",
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
    genreId: "gen-artigo",
    status: "published",
    sectionId: "sec-altoqi-visus-workflow",
    tags: ["workflow", "configuração"],
    keywords: ["criar", "fluxo", "etapas", "modelo"],
    author: "Suporte Visus",
    contentFormat: "markdown",
    createdAt: new Date("2026-07-15"),
    updatedAt: new Date("2026-07-15"),
  },
  {
    id: "article-005",
    title: "Fluxo de aprovação de artigos",
    summary: "Documentação do processo de revisão e publicação da Base de Conhecimento.",
    content: "",
    projectId: "project-001",
    genreId: "gen-workflow",
    status: "draft",
    sectionId: "sec-altoqi-visus-plataforma-altoqi-visus",
    tags: ["aprovação", "kb"],
    keywords: [],
    author: "Suporte Visus",
    contentFormat: "markdown",
    createdAt: new Date("2026-07-10"),
    updatedAt: new Date("2026-07-12"),
  },
  {
    id: "article-006",
    title: "FAQ - Planning 4D",
    summary: "Perguntas frequentes relacionadas ao módulo Planning 4D.",
    content: "",
    projectId: "project-003",
    genreId: "gen-faq",
    status: "published",
    sectionId: "sec-altoqi-visus-planning",
    tags: ["planning", "4d"],
    keywords: ["cronograma", "gantt"],
    author: "Suporte Visus",
    contentFormat: "markdown",
    createdAt: new Date("2026-06-28"),
    updatedAt: new Date("2026-07-02"),
  },
];
