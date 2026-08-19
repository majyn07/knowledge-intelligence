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

  return `
## Registro do atendimento

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
