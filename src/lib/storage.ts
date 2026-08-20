export type StorageWriteResult = "ok" | "quota" | "unavailable" | "error";

/**
 * Fronteira segura do `localStorage`.
 *
 * Escrever pode falhar — cota estourada, modo privado, armazenamento
 * desabilitado. Sem tratamento, o erro sobe de dentro de um efeito e derruba a
 * aplicação inteira. Aqui a falha vira um resultado que quem chamou decide
 * como comunicar; nunca uma exceção.
 */
export function writeJSON(key: string, value: unknown): StorageWriteResult {
  if (typeof window === "undefined") return "unavailable";

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return "ok";
  } catch (error) {
    if (isQuotaError(error)) return "quota";
    return "error";
  }
}

/** Escreve texto puro, para valores que nunca foram serializados. */
export function writeRaw(key: string, value: string): StorageWriteResult {
  if (typeof window === "undefined") return "unavailable";

  try {
    localStorage.setItem(key, value);
    return "ok";
  } catch (error) {
    return isQuotaError(error) ? "quota" : "error";
  }
}

export function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Lê e converte, devolvendo o padrão quando o conteúdo é ilegível. */
export function readJSON<T>(key: string, fallback: T, parse?: (raw: string) => T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;

  try {
    return parse ? parse(raw) : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function remove(key: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch {
    // Nada a fazer: remover é sempre melhor esforço.
  }
}

/** Chaves que a aplicação escreve, para o caminho de recuperação. */
export const APP_STORAGE_KEYS = [
  "visus-projects",
  "visus-active-project-id",
  "visus-tickets",
  "visus-support-conversations",
  "visus-knowledge-lifecycle",
  "visus-improvement-plans",
  "visus-library",
  "visus-people",
  "visus-current-person",
  "visus-activity",
  "visus-workspace-sidebar-collapsed",
  "visus-brand-theme",
] as const;

/** Usado apenas na tela de erro: devolve o navegador ao estado de semente. */
export function clearAppStorage(): void {
  for (const key of APP_STORAGE_KEYS) remove(key);
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Os navegadores divergem no nome e no código; cobrimos os conhecidos.
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    ("code" in error && (error as { code: number }).code === 22)
  );
}
