/**
 * Que tipo de falha o provedor devolveu.
 *
 * Existe porque todas viravam a mesma frase: "O serviço de IA está
 * indisponível. Tente novamente." Chave errada, cota estourada, modelo
 * sobrecarregado e pedido que travou davam a mesma resposta — e as quatro
 * pedem coisas diferentes de quem lê. "Tente novamente" com a chave errada é
 * um convite a tentar para sempre.
 *
 * É a mesma regra da tradução do erro de acesso: o que dá para reconhecer vira
 * texto útil, e o que não dá **vai junto**, porque a mensagem original é a
 * única pista de quem administra.
 *
 * Puro: recebe o erro e devolve a classificação, sem tocar em rede nem em
 * ambiente.
 */

export type AIFailureKind =
  /** A chave não existe, expirou ou não tem permissão. Tentar de novo não muda. */
  | "credencial"
  /** Cota ou limite de taxa. Tentar de novo mais tarde muda. */
  | "limite"
  /** Passou do prazo que damos ao provedor. */
  | "prazo"
  /** O provedor está fora do ar ou sobrecarregado. */
  | "indisponivel"
  /** Não reconhecido. O texto original segue junto. */
  | "desconhecida";

export interface AIFailure {
  kind: AIFailureKind;
  /** Mensagem original do provedor, preservada. Vazia quando não havia. */
  detail: string;
}

/** Se tentar de novo pode dar certo sem ninguém mexer em configuração. */
export function isRetryable(kind: AIFailureKind): boolean {
  return kind === "limite" || kind === "prazo" || kind === "indisponivel";
}

interface Rule {
  kind: AIFailureKind;
  /** Códigos HTTP que caem aqui. */
  status: number[];
  /** Trechos da mensagem, em minúsculas. */
  contains: string[];
}

/*
  A ordem importa: "quota exceeded" contém "quota" e também poderia casar com
  regra mais genérica depois. O específico vem primeiro.
*/
const RULES: Rule[] = [
  {
    kind: "credencial",
    status: [401, 403],
    contains: ["api key", "api_key", "unauthenticated", "permission denied", "invalid key"],
  },
  {
    kind: "limite",
    status: [429],
    contains: ["rate limit", "quota", "resource_exhausted", "resource exhausted", "too many"],
  },
  {
    kind: "prazo",
    status: [408, 504],
    contains: ["abort", "timeout", "timed out", "deadline"],
  },
  {
    kind: "indisponivel",
    status: [500, 502, 503, 529],
    contains: ["overloaded", "unavailable", "internal error", "service is currently"],
  },
];

/** Códigos HTTP aparecem em campos diferentes conforme o SDK. */
function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const candidato = error as Record<string, unknown>;

  for (const campo of ["status", "statusCode", "code"]) {
    const valor = candidato[campo];
    if (typeof valor === "number" && valor >= 100 && valor < 600) return valor;
  }

  return null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }

  return "";
}

export function classifyProviderFailure(error: unknown): AIFailure {
  const detail = messageOf(error).trim();
  const status = statusOf(error);
  const texto = detail.toLowerCase();

  /*
    `AbortError` é o nome que o navegador e o Node dão ao pedido cancelado pelo
    nosso próprio prazo. Ele chega sem código e às vezes sem mensagem — só o
    nome identifica.
  */
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "prazo", detail };
  }

  const regra = RULES.find(
    (item) =>
      (status !== null && item.status.includes(status)) ||
      item.contains.some((trecho) => texto.includes(trecho))
  );

  return { kind: regra ? regra.kind : "desconhecida", detail };
}
