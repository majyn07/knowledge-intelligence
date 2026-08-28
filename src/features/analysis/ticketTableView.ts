import { formatDay } from "@/lib/dates";
import { searchTerms } from "@/lib/vocabulary";
import type { Ticket } from "@/models/Ticket";

/**
 * O atendimento como lista que se opera.
 *
 * A tela nasceu para a barra lateral com três registros que existia quando foi
 * escrita: ela renderizava todos, com filtro por substring. Com mil, é a grade
 * de 1.800 cartões de novo, e a pergunta muda de "o que tem aqui" para "onde
 * está este, e o que falta nele".
 *
 * As colunas são as do atendimento, e não as do artigo: aqui o que identifica
 * é assunto, quem pediu e quando, mais o estado do ciclo, que é a única coisa
 * derivada.
 */

export const TICKET_COLUMNS = [
  "title",
  "company",
  "date",
  "stage",
  "solution",
] as const;

export type TicketColumn = (typeof TICKET_COLUMNS)[number];

export const ticketColumnLabel: Record<TicketColumn, string> = {
  title: "Assunto",
  company: "Empresa",
  date: "Data",
  stage: "No ciclo",
  solution: "Solução",
};

/**
 * O assunto não pode ser escondido: sem ele a linha deixa de identificar o
 * registro, e a tabela vira um conjunto de atributos sem sujeito.
 */
export const TICKET_REQUIRED_COLUMNS: TicketColumn[] = ["title"];

export const defaultTicketColumns: TicketColumn[] = ["title", "company", "date", "stage"];

/**
 * Onde o atendimento está no ciclo.
 *
 * É a única coisa derivada da lista, e é o que a fila de trabalho pergunta:
 * um atendimento que já virou artigo está resolvido, um analisado está em
 * curso, e um sem solução ainda nem pode virar conhecimento.
 */
export type TicketStage = "sem-solucao" | "a-analisar" | "analisado" | "publicado";

export const ticketStageLabel: Record<TicketStage, string> = {
  "sem-solucao": "Sem solução",
  "a-analisar": "A analisar",
  analisado: "Analisado",
  publicado: "Virou artigo",
};

export interface TicketCycle {
  analisados: Set<string>;
  comArtigo: Set<string>;
}

export function ticketStage(ticket: Ticket, ciclo: TicketCycle): TicketStage {
  if (ciclo.comArtigo.has(ticket.id)) return "publicado";
  if (ciclo.analisados.has(ticket.id)) return "analisado";
  if (ticket.solution.trim() === "") return "sem-solucao";

  return "a-analisar";
}

/**
 * O valor de uma célula.
 *
 * Exibir e exportar passam por aqui, como na Biblioteca: escritos em separado,
 * os dois divergem, e a planilha deixaria de ser o que estava na tela.
 */
export function ticketCellValue(
  ticket: Ticket,
  column: TicketColumn,
  ciclo: TicketCycle
): string {
  switch (column) {
    case "title":
      return ticket.title;
    case "company":
      return ticket.company;
    case "date":
      return ticket.date === "" ? "" : formatDay(ticket.date);
    case "stage":
      return ticketStageLabel[ticketStage(ticket, ciclo)];
    case "solution":
      return ticket.solution;
  }
}

export type TicketSort = "recentes" | "antigos" | "assunto" | "empresa";

export const ticketSortLabel: Record<TicketSort, string> = {
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  assunto: "Assunto (A–Z)",
  empresa: "Empresa (A–Z)",
};

/**
 * Data vazia vai para o fim, nas duas ordens.
 *
 * O que não dá para situar no tempo não é nem recente nem antigo, e deixá-lo
 * no topo de "mais recentes" faria a lista abrir com o que menos se sabe.
 */
export function sortTickets(tickets: Ticket[], sort: TicketSort): Ticket[] {
  const copia = [...tickets];

  switch (sort) {
    case "recentes":
      return copia.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    case "antigos":
      return copia.sort((a, b) => {
        if (a.date === "") return 1;
        if (b.date === "") return -1;
        return a.date.localeCompare(b.date);
      });
    case "assunto":
      return copia.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    case "empresa":
      return copia.sort(
        (a, b) =>
          a.company.localeCompare(b.company, "pt-BR") || a.title.localeCompare(b.title, "pt-BR")
      );
  }
}

/**
 * A busca do atendimento.
 *
 * Sem acento e sem caixa: exigir o acento certo é fazer errar duas vezes antes
 * de achar. Casa por termo e não pela frase inteira, então "flecha viga" acha
 * o atendimento que diz "viga com flecha".
 *
 * Usa `searchTerms` e não `termsOf`, que é a diferença que importa: `termsOf`
 * descarta palavra curta e comum porque existe para **comparar** textos, e
 * aqui isso faria a busca ignorar metade do que a pessoa escreveu.
 *
 * Cada termo casa por prefixo, porque quem digita "vig" está no meio de
 * escrever "viga" e a lista precisa reagir enquanto ele digita.
 */
export function matchesTicket(ticket: Ticket, query: string): boolean {
  const termos = searchTerms(query);

  if (termos.length === 0) return true;

  const texto = searchTerms(campos(ticket).join(" "));

  return termos.every((termo) => texto.some((palavra) => palavra.startsWith(termo)));
}

function campos(ticket: Ticket): string[] {
  return [ticket.title, ticket.company, ticket.solution, ticket.source?.externalId ?? ""];
}
