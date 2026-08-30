import type { AIContext } from "@/models/AIContext";

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
    .map(
      (message) =>
        `${message.author} (${message.createdAt}):\n${message.body}`
    )
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
