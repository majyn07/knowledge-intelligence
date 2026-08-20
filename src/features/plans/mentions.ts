import { resolveAssignment, type Person, type Team } from "@/models/Assignment";

/**
 * Menção a pessoa ou equipe dentro de um texto.
 *
 * Guarda **identificador e rótulo**, no formato `@[Nome](id)`, pelo mesmo
 * motivo da atribuição: o nome é editável pela própria pessoa, e um texto que
 * guardasse só o nome perderia o vínculo assim que alguém se renomeasse.
 *
 * O rótulo vai junto de propósito. Ele não é a fonte da verdade — quem exibe
 * resolve o identificador e mostra o nome atual — mas é o que sobra quando a
 * conta some, e sobrar "@Raoni" é melhor que sobrar "@pes-7f3a".
 */

/** `@[Nome](identificador)` — o rótulo não pode conter `]`, o id não pode conter `)`. */
const MENTION = /@\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export interface Mention {
  ref: string;
  /** Como o nome estava quando a menção foi escrita. */
  label: string;
}

export type MentionSegment =
  | { kind: "text"; value: string }
  | { kind: "mention"; ref: string; label: string };

/** Quem foi mencionado, sem repetição, na ordem em que aparecem. */
export function parseMentions(text: string): Mention[] {
  const seen = new Set<string>();
  const mentions: Mention[] = [];

  for (const match of text.matchAll(MENTION)) {
    const [, label, ref] = match;
    if (seen.has(ref)) continue;

    seen.add(ref);
    mentions.push({ ref, label });
  }

  return mentions;
}

/**
 * O texto partido entre trechos comuns e menções.
 *
 * Devolver segmentos em vez de HTML mantém a renderização com quem renderiza:
 * montar marcação aqui obrigaria a confiar em texto escrito por alguém, que é
 * exatamente o que não se faz.
 */
export function mentionSegments(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MENTION)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, start) });
    }

    segments.push({ kind: "mention", label: match[1], ref: match[2] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", value: text.slice(cursor) });
  }

  return segments;
}

/**
 * O nome a exibir para uma menção.
 *
 * Resolve pelo identificador, que é o vínculo. Quando ele não resolve mais —
 * conta removida, equipe excluída — devolve o rótulo guardado, porque a menção
 * aconteceu e apagá-la reescreveria o que foi dito.
 */
export function mentionName(
  mention: Mention,
  people: Person[],
  teams: Team[]
): string {
  const resolved = resolveAssignment(mention.ref, people, teams);

  /*
    `unknown` significa que o resolvedor não encontrou ninguém e devolveu o
    próprio identificador como nome. Aqui isso é inútil: quem lê o comentário
    não reconhece `pes-7f3a`, mas reconhece o nome que estava escrito quando a
    menção foi feita.
  */
  return resolved && resolved.kind !== "unknown" ? resolved.name : mention.label;
}

/** O texto sem a marcação, para busca e para listagens curtas. */
export function plainMentionText(text: string): string {
  return text.replace(MENTION, (_, label: string) => `@${label}`);
}

/**
 * Insere uma menção na posição do cursor, substituindo o `@` que a disparou.
 *
 * Devolve o texto e onde o cursor deve ficar: sem isso, escolher alguém
 * jogaria o cursor para o fim e obrigaria a pessoa a voltar com o mouse.
 */
export function insertMention(
  text: string,
  cursor: number,
  ref: string,
  label: string
): { text: string; cursor: number } {
  const antes = text.slice(0, cursor);
  const arroba = antes.lastIndexOf("@");

  // Sem `@` aberto, a menção entra onde o cursor está.
  const início = arroba < 0 ? cursor : arroba;

  const token = `@[${label}](${ref}) `;
  const novo = text.slice(0, início) + token + text.slice(cursor);

  return { text: novo, cursor: início + token.length };
}

/**
 * O trecho digitado depois de um `@`, ou `null` quando não há menção em curso.
 *
 * Espaço encerra a busca: "@ " é uma arroba solta no texto, não alguém sendo
 * procurado.
 */
export function mentionQuery(text: string, cursor: number): string | null {
  const antes = text.slice(0, cursor);
  const arroba = antes.lastIndexOf("@");

  if (arroba < 0) return null;

  // Precisa começar palavra: "e@mail" não abre menção.
  const anterior = arroba === 0 ? " " : antes[arroba - 1];
  if (!/[\s(]/.test(anterior)) return null;

  const trecho = antes.slice(arroba + 1);
  if (/[\s\]()]/.test(trecho)) return null;

  return trecho;
}
