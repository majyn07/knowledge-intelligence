import type { SupportConversation } from "@/models/SupportConversation";

/** Conversas normalizadas no contrato de domínio, prontas para troca por uma fonte real. */
export const conversations: SupportConversation[] = [
  {
    id: "conversation-45812",
    ticketId: "45812",
    messages: [
      {
        id: "45812-1",
        author: "Cliente",
        body: "Após atualizar o Workflow não consigo mais acessar o sistema.",
        createdAt: "15/07/2026 09:12",
      },
      {
        id: "45812-2",
        author: "Suporte",
        body: "Pode informar a versão instalada do Workflow?",
        createdAt: "15/07/2026 09:18",
      },
      {
        id: "45812-3",
        author: "Cliente",
        body: "Estamos utilizando a versão 5.2.",
        createdAt: "15/07/2026 09:20",
      },
      {
        id: "45812-4",
        author: "Suporte",
        body: "Pode anexar o arquivo de log para análise?",
        createdAt: "15/07/2026 09:23",
      },
      {
        id: "45812-5",
        author: "Cliente",
        body: "Segue o log em anexo.",
        createdAt: "15/07/2026 09:31",
      },
      {
        id: "45812-6",
        author: "Suporte",
        body: "Identificamos uma configuração incorreta do Identity Provider após a atualização. Após ajustar a configuração, o acesso foi restabelecido.",
        createdAt: "15/07/2026 10:05",
      },
    ],
  },
  {
    id: "conversation-45813",
    ticketId: "45813",
    messages: [
      {
        id: "45813-1",
        author: "Cliente",
        body: "Os usuários perderam acesso aos projetos após alteração de permissões.",
        createdAt: "14/07/2026 14:02",
      },
      {
        id: "45813-2",
        author: "Suporte",
        body: "Foi identificado que o perfil aplicado não possuía permissão de leitura.",
        createdAt: "14/07/2026 14:28",
      },
    ],
  },
  {
    id: "conversation-45814",
    ticketId: "45814",
    messages: [
      {
        id: "45814-1",
        author: "Cliente",
        body: "A instalação do Planning é interrompida durante a configuração.",
        createdAt: "13/07/2026 11:10",
      },
      {
        id: "45814-2",
        author: "Suporte",
        body: "O instalador estava sendo bloqueado pelo antivírus da estação.",
        createdAt: "13/07/2026 11:46",
      },
    ],
  },
];
