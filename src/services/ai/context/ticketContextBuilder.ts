import type { AIContext } from "@/models/AIContext";
import type { SupportConversationMessage } from "@/models/SupportConversation";

/**
 * Quem falou, para o provedor de IA — e o cliente vai sem nome.
 *
 * O rótulo do autor deixou de ser genérico para a **tela**: quem trabalha a
 * fila precisa saber de quem é o chamado. O transcrito enviado ao provedor é
 * outro destino, e a decisão não vem junto: nome de cliente ali sai do nosso
 * domínio e entra no de terceiro, e nada no prompt melhora por saber que a
 * pessoa se chama Ana.
 *
 * Quem atendeu continua nomeado: é gente da AltoQi, e o nome distingue quem
 * respondeu o quê quando a conversa tem dois atendentes.
 */
function quem(message: SupportConversationMessage): string {
  return message.role === "cliente" ? "Cliente" : message.author;
}

function buildConversationSection(
  context: AIContext
): string {
  const messages = context.conversation?.messages ?? [];

  if (messages.length === 0) {
    return `
## Registro do atendimento

Nenhum registro de conversa disponível para este atendimento.
`.trim();
  }

  const transcript = messages
    .map((message) => `${quem(message)} (${message.createdAt}):\n${message.body}`)
    .join("\n\n");

  /*
    A ressalva vai **antes** do transcrito, e não depois: o modelo lê em ordem,
    e um aviso no fim chega quando ele já formou a resposta sobre o que leu.
  */
  const ressalva = context.conversationTruncated
    ? "\n\nATENÇÃO: a conversa é longa e foi enviada em parte. Se a resposta " +
      "depender do que pode estar na parte que faltou, diga isso.\n"
    : "";

  return `
## Registro do atendimento${ressalva}

${transcript}
`.trim();
}

export function buildTicketContext(
  context?: AIContext
): string {
  if (!context?.ticket) {
    return `
# CONTEXTO DO ATENDIMENTO

Nenhum atendimento informado.
`.trim();
  }

  const { ticket } = context;

  return `
# CONTEXTO DO ATENDIMENTO

Título:
${ticket.title}

Empresa:
${ticket.company}

Solução registrada:
${ticket.solution}

Data:
${ticket.date}

${buildConversationSection(context)}
`.trim();
}
