import { toIsoDate } from "@/lib/dates";
import { oneOf, items, record, text } from "@/lib/shape";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

function externalSource(raw: unknown) {
  const source = record(raw);
  if (!text(source.externalId)) return {};

  return {
    source: {
      provider: "hubspot" as const,
      externalId: text(source.externalId),
      importedAt: text(source.importedAt),
    },
  };
}

/** Garante a forma do atendimento vinda do armazenamento. */
export function normalizeTicket(raw: unknown): Ticket {
  const value = record(raw);

  return {
    id: text(value.id),
    projectId: text(value.projectId),
    title: text(value.title),
    solution: text(value.solution),
    company: text(value.company),
    causa: text(value.causa),
    motivoDeContato: text(value.motivoDeContato),
    /*
      O campo era de texto livre, e os registros anteriores guardam
      `dd/mm/aaaa`. A conversão acontece na leitura e se firma na próxima
      gravação, sem migração de dados, como na atribuição.

      O que não é data reconhecível vira vazio de propósito: "ontem" não
      situa nada no tempo, e mantê-lo faria o registro cair fora de toda
      janela sem que ninguém entendesse por quê.
    */
    date: toIsoDate(text(value.date)),
    // Ausente é "em uso": registro gravado antes da lixeira existir.
    ...(text(value.deletedAt) ? { deletedAt: text(value.deletedAt) } : {}),
    ...externalSource(value.source),
    /*
      O registro cru entra como veio, sem normalizar campo por campo: ele é
      justamente o que **não** cabe no nosso modelo, e conferir a forma dele
      significaria decidir de antemão o que a origem pode ter. Só se confere
      que é objeto; vazio some em vez de virar `{}`, que pareceria origem
      presente e vazia.
    */
    ...(temConteudo(value.raw) ? { raw: record(value.raw) } : {}),
  };
}

/** Objeto com pelo menos uma chave. `{}` não é origem, é ausência de origem. */
function temConteudo(valor: unknown): boolean {
  return typeof valor === "object" && valor !== null && Object.keys(valor).length > 0;
}

/** Os papeis conhecidos, para conferir o que veio do armazenamento. */
const PAPEIS = ["cliente", "suporte", "automacao", "sistema"] as const;

export function normalizeConversation(raw: unknown): SupportConversation {
  const value = record(raw);

  return {
    id: text(value.id),
    ticketId: text(value.ticketId),
    messages: items(value.messages).map((entry) => {
      const message = record(entry);
      return {
        id: text(message.id) || crypto.randomUUID(),
        author: text(message.author),
        /*
          Registro gravado antes deste campo não sabe quem era quem. "sistema"
          é o padrão honesto: não afirma cliente nem suporte, e a tela desenha
          neutro em vez de escolher um lado por sorteio.
        */
        role: oneOf(message.role, PAPEIS, "sistema"),
        body: text(message.body),
        createdAt: text(message.createdAt),
        ...(text(message.channel) ? { channel: text(message.channel) } : {}),
      };
    }),
    ...externalSource(value.source),
  };
}

export function parseTickets(raw: string): Ticket[] {
  return items(JSON.parse(raw)).map(normalizeTicket);
}

export function parseConversations(raw: string): SupportConversation[] {
  return items(JSON.parse(raw)).map(normalizeConversation);
}
