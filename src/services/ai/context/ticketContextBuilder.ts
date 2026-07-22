import type { AIContext } from "@/models/AIContext";

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
`.trim();
}