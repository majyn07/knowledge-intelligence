import type { ActivityEvent, ActivityType } from "@/models/ActivityEvent";

import type { Follow } from "./follows";

/**
 * O que aconteceu que interessa a **você**.
 *
 * A menção existia e não chegava a lugar nenhum: quem era mencionado só
 * descobria abrindo a tela certa por acaso. Como não há e-mail para notificar,
 * e não vai haver enquanto o SMTP não existir., o caminho honesto é o produto
 * contar por si.
 *
 * Puro, e recebe tudo resolvido, como `runPanel`: os providers já têm as
 * coleções em memória, então montar a central não custa consulta nenhuma.
 *
 * **Nem tudo vira aviso.** Um produto que avisa demais é um produto cujos
 * avisos ninguém lê, e aí o aviso que importava se perde junto. Fato relevante
 * aqui é mudança de estágio, plano criado, oportunidade aprovada e exclusão,
 * "alguém editou um artigo" não é.
 */

const RELEVANTES: ActivityType[] = [
  "article_status_changed",
  "article_deleted",
  "plan_status_changed",
  "plan_created",
  "opportunity_approved",
  "ticket_deleted",
];

export type NoticeReason = "mention" | "follow" | "mine";

export interface Notice {
  id: string;
  at: string;
  reason: NoticeReason;
  /** O que aconteceu, em uma frase. */
  text: string;
  subjectLabel: string;
  /** Para onde a tela leva. Vazio quando não há destino. */
  href: string;
  /** Aconteceu depois da última vez que esta pessoa olhou. */
  unread: boolean;
}

/** Uma menção encontrada num comentário, já resolvida por quem tem os planos. */
export interface MentionHit {
  id: string;
  planId: string;
  planTitle: string;
  /** Quem escreveu o comentário. */
  author: string;
  at: string;
  excerpt: string;
}

const reasonLabel: Record<NoticeReason, string> = {
  mention: "Você foi mencionado",
  follow: "Você acompanha",
  mine: "Atribuído a você",
};

export function noticeReasonLabel(reason: NoticeReason): string {
  return reasonLabel[reason];
}

export interface NoticeInput {
  events: ActivityEvent[];
  mentions: MentionHit[];
  follows: Follow[];
  /** Identificadores de registros atribuídos a esta pessoa. */
  mine: Set<string>;
  /** Como esta pessoa aparece em `actor`. Vazio quando não há conta. */
  me: string;
  /** ISO da última vez que ela abriu a central. Vazio é "nunca". */
  since: string;
  /** Teto da lista. Rolagem infinita numa central não ajuda ninguém. */
  limit?: number;
}

export function buildNotices(input: NoticeInput): Notice[] {
  const { events, mentions, follows, mine, me, since, limit = 40 } = input;

  const acompanhados = new Set(follows.map((follow) => follow.subjectId));
  const avisos: Notice[] = [];

  for (const mencao of mentions) {
    /*
      Menção que você mesmo escreveu não avisa. Citar alguém e ser avisado de
      que se citou alguém é o produto conversando consigo.
    */
    if (me !== "" && mencao.author === me) continue;

    avisos.push({
      id: `mention:${mencao.id}`,
      at: mencao.at,
      reason: "mention",
      text: mencao.excerpt,
      subjectLabel: mencao.planTitle,
      href: `/improvement-plan?plan=${mencao.planId}`,
      unread: mencao.at > since,
    });
  }

  for (const event of events) {
    if (!RELEVANTES.includes(event.type)) continue;

    // O que você mesmo fez não é notícia para você.
    if (me !== "" && event.actor === me) continue;

    const acompanha = acompanhados.has(event.subject.id);
    const meu = mine.has(event.subject.id);

    if (!acompanha && !meu) continue;

    avisos.push({
      id: `event:${event.id}`,
      at: event.at,
      // Acompanhar é escolha explícita; atribuição pode ter vindo de outra
      // pessoa. Quando vale para os dois, a escolha explícita descreve melhor.
      reason: acompanha ? "follow" : "mine",
      text: event.detail,
      subjectLabel: event.subject.label,
      href: hrefOf(event),
      unread: event.at > since,
    });
  }

  return avisos.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** Quantos ainda não foram vistos. É o número no sino. */
export function unreadCount(notices: Notice[]): number {
  return notices.filter((notice) => notice.unread).length;
}

function hrefOf(event: ActivityEvent): string {
  switch (event.subject.kind) {
    case "plan":
      return `/improvement-plan?plan=${event.subject.id}`;
    case "article":
      return `/library/${event.subject.id}`;
    case "ticket":
      return `/analysis?ticket=${event.subject.id}`;
    case "project":
      return `/projects/${event.subject.id}`;
    default:
      // Oportunidade e análise não têm endereço próprio: o aviso continua
      // valendo, e levar para lugar nenhum é melhor que levar para o errado.
      return "";
  }
}
