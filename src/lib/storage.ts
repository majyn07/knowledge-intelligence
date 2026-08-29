import { limparCache } from "./collectionCache";

export type StorageWriteResult = "ok" | "quota" | "unavailable" | "error";

/**
 * Fronteira segura do `localStorage`.
 *
 * Escrever pode falhar. Cota estourada, modo privado, armazenamento
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
  /*
    Prefixo, e não chave: a recuperação é uma por registro em edição, para duas
    abas abertas em artigos diferentes não se sobrescreverem.
  */
  libraryRecovery: "visus-library-recovery",
  /*
    Quando esta pessoa abriu a central de avisos pela última vez, **neste
    navegador**. Limite conhecido: ler no computador não marca como lido no
    celular. A versão certa é uma coluna por pessoa no banco.
  */
  noticesSeenAt: "visus-notices-seen-at",
  brandTheme: "visus-brand-theme",
} as const;

/** Tudo que a recuperação de falha apaga para voltar à semente. */
export const APP_STORAGE_KEYS = Object.values(STORAGE_KEYS);

/**
 * Usado apenas na tela de erro: devolve o navegador ao estado de semente.
 *
 * Varre também as chaves **derivadas** de uma nossa: a recuperação de texto é
 * uma por registro, com o prefixo mais o identificador. Apagar só os nomes
 * exatos deixaria conteúdo para trás justamente na tela que promete voltar à
 * semente, e é conteúdo guardado em formato antigo que costuma ter causado o
 * erro que trouxe alguém até aqui.
 */
export function clearAppStorage(): void {
  for (const key of APP_STORAGE_KEYS) remove(key);

  if (typeof window === "undefined") return;

  try {
    const derivadas = Object.keys(localStorage).filter((key) =>
      APP_STORAGE_KEYS.some((base) => key.startsWith(`${base}:`))
    );

    for (const key of derivadas) remove(key);
  } catch {
    // Armazenamento indisponível: não há o que limpar.
  }

  /*
    O cache do acervo vai junto, e não é detalhe.

    Esta função é o que a tela de falha oferece, e a promessa dela é voltar à
    semente. O acervo no IndexedDB são 22,7 MB fora do `localStorage`: deixá-lo
    aqui faria a promessa ser mentira, e o formato antigo que trouxe alguém até
    esta tela pode estar justamente nele.

    Sem `await` porque quem chama recarrega a página em seguida, e a limpeza já
    foi pedida ao navegador. Esperar por ela seria adiar o recarregar por um
    resultado que não muda o que vem depois.
  */
  void limparCache();
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
