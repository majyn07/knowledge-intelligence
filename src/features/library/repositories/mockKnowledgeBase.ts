import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

export const MOCK_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: "1",
    title: "Erro ao autenticar após atualização",
    summary: "Procedimento para resolver falhas de autenticação após atualização.",
    content: `
Após uma atualização do sistema, alguns usuários podem perder a autenticação.

Verifique:

- Token expirado
- Permissões do usuário
- Sessão inválida
- Cache do navegador

Caso necessário, solicite novo login.
`.trim(),
  },
  {
    id: "2",
    title: "Falha ao sincronizar projetos",
    summary: "Soluções para erros de sincronização.",
    content: `
Verifique:

- conexão com internet
- permissões
- versão do projeto
- conflitos de sincronização
`.trim(),
  },
  {
    id: "3",
    title: "Problemas de acesso ao Workflow",
    summary: "Erros comuns de acesso ao Workflow.",
    content: `
Confira:

- usuário ativo
- permissões
- grupos
- autenticação
`.trim(),
  },
];