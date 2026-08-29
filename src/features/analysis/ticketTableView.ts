import { formatDay } from "@/lib/dates";
import { searchTerms } from "@/lib/vocabulary";
import { produtosNoTexto } from "@/services/hubspot/produtoDoAtendimento";
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

/**
 * Quem abriu o atendimento, e o número dele na HubSpot.
 *
 * Os dois vivem no registro cru: o modelo não tem campo para nenhum deles
 * porque o nome é dado do cliente e o número é da HubSpot, e guardar campo
 * nosso para o que é espelho criaria duas respostas para a mesma pergunta.
 *
 * Ficam aqui, e não espalhados pela tela, porque a busca, o filtro, a lista e
 * a exportação precisam da mesma resposta: quatro leituras do mesmo `raw`
 * divergem, e a divergência apareceria como a busca achando um atendimento que
 * a lista mostra sem nome.
 */
export function clienteDo(ticket: Ticket): string {
  const contato = ticket.raw?.contato;

  if (typeof contato !== "object" || contato === null) return "";

  const nome = (contato as { nome?: unknown }).nome;

  return typeof nome === "string" ? nome : "";
}

export function chamadoDo(ticket: Ticket): string {
  return typeof ticket.raw?.hubspotTicketId === "string" ? ticket.raw.hubspotTicketId : "";
}

/**
 * Que produto o cliente disse estar usando: Builder, Eberick, Visus.
 *
 * "Solução" na AltoQi é o produto, e não a resposta que o suporte deu.
 *
 * Gravado quando veio da HubSpot; deduzido quando não veio, porque atendimento
 * que entrou antes deste campo existir não o tem e reimportar tudo para
 * preencher um campo derivado seria caro por nada.
 *
 * `textoExtra` é por onde a tela de detalhe passa a fala do cliente: lá a
 * conversa está em mãos, e "estou no Eberick 2024" aparece na terceira
 * mensagem muito mais do que no assunto. A lista não tem a conversa, e se
 * contenta com assunto e solução.
 *
 * Uma dedução só, e não uma por tela: duas divergem, e a divergência
 * apareceria como o filtro escondendo um atendimento que o detalhe marca como
 * Builder.
 */
export function produtosDoTicket(ticket: Ticket, textoExtra = ""): string[] {
  const gravados = Array.isArray(ticket.raw?.produtos)
    ? (ticket.raw.produtos as unknown[]).map(String).filter(Boolean)
    : [];

  if (gravados.length > 0) return gravados;

  /*
    A resposta do suporte fica de fora de propósito. Ela cita produto o tempo
    todo por educação ("aqui no Builder você faria assim"), e isso marcaria
    como Builder um atendimento que era sobre outra coisa.
  */
  return produtosNoTexto([ticket.title, textoExtra].join(" "));
}

export const TICKET_COLUMNS = [
  "title",
  "client",
  "company",
  "date",
  "stage",
  "solution",
] as const;

export type TicketColumn = (typeof TICKET_COLUMNS)[number];

export const ticketColumnLabel: Record<TicketColumn, string> = {
  title: "Assunto",
  client: "Cliente",
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

export const defaultTicketColumns: TicketColumn[] = [
  "title",
  "client",
  "company",
  "date",
  "stage",
];

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
    case "client":
      return clienteDo(ticket);
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

export type TicketSort =
  | "atividade"
  | "recentes"
  | "antigos"
  | "assunto"
  | "empresa"
  | "cliente";

export const ticketSortLabel: Record<TicketSort, string> = {
  atividade: "Atividade recente",
  recentes: "Mais recentes",
  antigos: "Mais antigos",
  assunto: "Assunto (A–Z)",
  empresa: "Empresa (A–Z)",
  cliente: "Cliente (A–Z)",
};

/**
 * Data vazia vai para o fim, nas duas ordens.
 *
 * O que não dá para situar no tempo não é nem recente nem antigo, e deixá-lo
 * no topo de "mais recentes" faria a lista abrir com o que menos se sabe.
 */
/**
 * Quando a conversa se moveu pela última vez.
 *
 * É o carimbo que a HubSpot devolve na listagem, guardado no registro cru. Não
 * é a data do atendimento: um chamado aberto na semana passada e respondido
 * hoje é trabalho de hoje, e num help desk é por isso que se ordena.
 */
export function ultimaAtividadeDe(ticket: Ticket): string {
  const carimbo = ticket.raw?.ultimaMensagemEm;

  return typeof carimbo === "string" ? carimbo : "";
}

export function sortTickets(tickets: Ticket[], sort: TicketSort): Ticket[] {
  const copia = [...tickets];

  switch (sort) {
    /*
      A ordem de um help desk: o que se mexeu por último vem primeiro. Sem
      carimbo vai para o fim, pelo mesmo motivo da data vazia — o que não dá
      para situar no tempo não é nem recente nem antigo.
    */
    case "atividade":
      return copia.sort((a, b) => ultimaAtividadeDe(b).localeCompare(ultimaAtividadeDe(a)));
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
    case "cliente":
      return copia.sort(
        (a, b) =>
          clienteDo(a).localeCompare(clienteDo(b), "pt-BR") ||
          a.title.localeCompare(b.title, "pt-BR")
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
export function matchesTicket(ticket: Ticket, query: string, conversa = ""): boolean {
  return combinaComBusca(searchTerms(query), searchTerms(camposDoTicket(ticket).join(" ")), conversa);
}

/**
 * O casamento em si, sobre texto **já preparado**.
 *
 * Separado de `matchesTicket` porque a lista prepara uma vez por coleção o que
 * esta fazia a cada tecla, por atendimento. Quem tem só um registro em mãos
 * continua chamando a de cima.
 */
export function combinaComBusca(
  busca: string[],
  texto: string[],
  conversa = ""
): boolean {
  if (busca.length === 0) return true;

  /*
    A conversa entra por último e por um caminho diferente: os campos casam por
    prefixo de palavra, e a conversa por trecho.

    O prefixo existe para a lista reagir enquanto alguém digita "vig". Fazer o
    mesmo sobre dezesseis mil mensagens exigiria quebrar tudo em palavras a cada
    tecla; `includes` sobre o texto já limpo custa uma varredura, e num acervo
    de quatro megabytes isso é barato.

    A diferença aparece pouco: quem digita "vig" acha pelo assunto de qualquer
    forma, e quem procura dentro da conversa costuma escrever a palavra inteira.
  */
  return busca.every(
    (termo) => texto.some((palavra) => palavra.startsWith(termo)) || conversa.includes(termo)
  );
}

/**
 * O que a busca varre.
 *
 * **O número do chamado entrou porque a tela já o prometia e não o entregava.**
 * O campo dizia "nº do chamado" e varria `source.externalId`, que é o id da
 * conversa: quem copiava `47954714157` da HubSpot e colava aqui não achava
 * nada, e não tinha como saber que estava procurando pelo número certo no
 * campo errado. O id da conversa fica, porque é o que aparece na URL da tela.
 *
 * **E o cliente**, que é como as pessoas realmente procuram: quem atendeu
 * lembra do nome de quem ligou muito antes de lembrar do assunto que digitou.
 */
export function camposDoTicket(ticket: Ticket): string[] {
  return [
    ticket.title,
    clienteDo(ticket),
    ticket.company,
    ticket.solution,
    chamadoDo(ticket),
    ticket.source?.externalId ?? "",
  ];
}
