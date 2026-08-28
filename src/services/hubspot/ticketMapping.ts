import { toIsoDate } from "@/lib/dates";
import { record, text } from "@/lib/shape";

/**
 * O atendimento da HubSpot virando o nosso.
 *
 * Escrito **antes** de o escopo `tickets` existir na credencial, e por isso
 * separado do serviço que busca: o mapeamento é a parte que dá para conferir
 * por teste sem nenhuma rede, e é a parte que precisa estar certa no dia em
 * que a liberação chegar.
 *
 * De qual propriedade sai cada campo é **cadastro, não constante**. As quatro
 * primeiras abaixo são as padrão da HubSpot, presentes em qualquer conta, mas
 * a solução do atendimento costuma morar numa propriedade personalizada com
 * nome que só quem administra a conta sabe. Ler os nomes exige o mesmo escopo
 * que falta: `GET /crm/v3/properties/tickets` também devolve 403.
 *
 * Então o padrão é palpite declarado, e trocá-lo é editar este mapa. Sem essa
 * separação, descobrir o nome certo significaria reescrever a leitura.
 */
export interface TicketPropertyMap {
  title: string;
  solution: string;
  date: string;
}

/**
 * As padrão da HubSpot. `subject` e `content` existem em toda conta, e
 * `closed_date` é o dia em que o atendimento se resolveu, que é o que a nossa
 * data significa.
 */
export const PROPRIEDADES_PADRAO: TicketPropertyMap = {
  title: "subject",
  solution: "content",
  date: "closed_date",
};

/** A data de criação entra como reserva: atendimento aberto não tem fechamento. */
export const PROPRIEDADE_DE_CRIACAO = "createdate";

/** O que pedimos à API. Pedir tudo traria dezenas de campos que não usamos. */
export function propriedadesPedidas(mapa: TicketPropertyMap): string[] {
  return [...new Set([mapa.title, mapa.solution, mapa.date, PROPRIEDADE_DE_CRIACAO])].filter(
    (nome) => nome !== ""
  );
}

export interface HubSpotTicket {
  externalId: string;
  title: string;
  solution: string;
  date: string;
}

/**
 * Data em `aaaa-mm-dd`, e o que não dá para situar no tempo fica vazio.
 *
 * A HubSpot devolve instante ISO completo. Nosso campo é dia de calendário, e
 * chutar um dia a partir de um instante em fuso alheio erraria na virada do
 * mês, que é justamente onde ninguém olharia para conferir.
 */
function diaDe(bruto: string): string {
  if (bruto === "") return "";

  const so = bruto.slice(0, 10);
  return toIsoDate(so);
}

/**
 * Um registro da HubSpot virando um atendimento nosso.
 *
 * Devolve `null` quando falta o que identifica: sem id não dá para casar na
 * reimportação, e sem assunto a linha entraria na lista sem dizer o que é.
 * Recusar aqui é melhor que gravar um registro que ninguém consegue ler.
 */
export function toTicket(bruto: unknown, mapa: TicketPropertyMap): HubSpotTicket | null {
  const raiz = record(bruto);
  const props = record(raiz.properties);

  const externalId = text(raiz.id).trim();
  const title = text(props[mapa.title]).trim();

  if (externalId === "" || title === "") return null;

  /*
    Fechamento primeiro, criação como reserva. Atendimento ainda aberto não tem
    data de fechamento, e deixar a data vazia faria ele cair fora de toda
    janela do painel sem que ninguém entendesse por quê.
  */
  const fechamento = diaDe(text(props[mapa.date]).trim());
  const criacao = diaDe(text(props[PROPRIEDADE_DE_CRIACAO]).trim());

  return {
    externalId,
    title,
    solution: text(props[mapa.solution]).trim(),
    date: fechamento || criacao,
  };
}

/** O cursor da paginação. O fim é a **ausência** dele, como nas conversas. */
export function proximaPagina(bruto: unknown): string | null {
  const paging = record(record(bruto).paging);
  const proximo = text(record(paging.next).after).trim();

  return proximo === "" ? null : proximo;
}
