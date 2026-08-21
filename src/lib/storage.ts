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
/**
 * Chaves nomeadas do armazenamento.
 *
 * Existem aqui e em nenhum outro lugar. Cada provider repetia a própria como
 * literal, e a duplicação já produziu divergência: a migração para o servidor
 * procurou "visus-plans" enquanto o provider gravava em
 * "visus-improvement-plans", e não encontrou nada.
 */
export const STORAGE_KEYS = {
  projects: "visus-projects",
  activeProject: "visus-active-project-id",
  tickets: "visus-tickets",
  conversations: "visus-support-conversations",
  analyses: "visus-knowledge-lifecycle",
  plans: "visus-improvement-plans",
  articles: "visus-library",
  taxonomy: "visus-taxonomy",
  people: "visus-people",
  currentPerson: "visus-current-person",
  activity: "visus-activity",
  recent: "visus-recently-viewed",
  sidebar: "visus-workspace-sidebar-collapsed",
  panels: "visus-dashboard-panels",
  follows: "visus-follows",
  savedViews: "visus-saved-views",
  libraryMode: "visus-library-mode",
  libraryColumns: "visus-library-columns",
  brandTheme: "visus-brand-theme",
} as const;

/** Tudo que a recuperação de falha apaga para voltar à semente. */
export const APP_STORAGE_KEYS = Object.values(STORAGE_KEYS);

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
