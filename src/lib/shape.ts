/**
 * Leitura defensiva de dados de forma desconhecida.
 *
 * Conteúdo vindo do armazenamento não tem tipo garantido: foi gravado por
 * alguma versão do produto, possivelmente anterior à atual. Estas funções
 * leem campo a campo sem nunca assumir que ele existe.
 */

export function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function flag(value: unknown): boolean {
  return value === true;
}

export function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Mantém o valor apenas quando ele pertence ao conjunto permitido. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Datas inválidas viram a época, para nunca produzirem "Invalid Date" na tela. */
export function date(value: unknown): Date {
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
