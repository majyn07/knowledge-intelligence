/**
 * Quais provedores de IA o produto conhece, e qual está valendo.
 *
 * Puro de propósito: a tela de Integrações lê daqui para dizer a verdade sobre
 * o ambiente, e o servidor lê daqui para escolher com quem falar. Duas listas
 * do mesmo vocabulário divergem — é a mesma razão da trilha de navegação sair
 * do cadastro de rotas do menu.
 *
 * A escolha é **declarada**, não deduzida da presença de chave, pelo mesmo
 * motivo do modo compartilhado: chave provisionada em ambiente é acidente de
 * infraestrutura, e não decisão de produto.
 */

export type AIProviderId = "gemini" | "claude";

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  /** Variável do ambiente do servidor que guarda a chave. Só a presença é lida. */
  envKey: string;
  purpose: string;
}

/**
 * A ordem é a preferência quando ninguém declarou e há mais de um configurado.
 * É decisão escrita, não sorteio — e a tela diz que a usou.
 */
export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    purpose: "Análise de atendimentos",
  },
  {
    id: "claude",
    name: "Claude",
    envKey: "ANTHROPIC_API_KEY",
    purpose: "Análise e acesso à HubSpot",
  },
];

export function findProvider(id: string): AIProviderInfo | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Por que o provedor ativo é o que é — ou por que não há nenhum.
 *
 * `declarado`   — `AI_PROVIDER` nomeou um, e ele tem chave.
 * `unico`       — ninguém declarou, e só um está configurado.
 * `preferencia` — ninguém declarou, e há mais de um. Vale a ordem do catálogo,
 *                 e a tela diz isso: escolher em silêncio entre dois seria
 *                 apresentar como decisão o que foi ordem alfabética do acaso.
 * `declarado-sem-chave` — nomearam um provedor que não tem chave neste
 *                 ambiente. Não caímos em outro: quem declarou quis aquele, e
 *                 substituir por conta própria esconderia o erro de digitação.
 * `nenhum`      — não há chave nenhuma. A análise por IA não funciona, e é o
 *                 estado em que o produto roda até alguém configurar.
 */
export type ActiveProviderReason =
  | "declarado"
  | "unico"
  | "preferencia"
  | "declarado-sem-chave"
  | "nenhum";

export interface ActiveProvider {
  id: AIProviderId | null;
  reason: ActiveProviderReason;
  /** O que foi declarado, quando não deu para usar. Serve para a tela nomear o erro. */
  declared?: string;
  configured: AIProviderId[];
}

/**
 * Recebe o ambiente em vez de ler `process.env`, para poder ser testada sem
 * mexer no processo — e para a tela poder passar só o que ela sabe.
 */
export function resolveActiveProvider(env: Record<string, string | undefined>): ActiveProvider {
  const configured = AI_PROVIDERS.filter((provider) => {
    const value = env[provider.envKey];
    return typeof value === "string" && value.trim() !== "";
  }).map((provider) => provider.id);

  const declared = (env.AI_PROVIDER ?? "").trim().toLowerCase();

  if (declared !== "") {
    const known = findProvider(declared);

    if (known && configured.includes(known.id)) {
      return { id: known.id, reason: "declarado", declared, configured };
    }

    return { id: null, reason: "declarado-sem-chave", declared, configured };
  }

  if (configured.length === 0) return { id: null, reason: "nenhum", configured };
  if (configured.length === 1) return { id: configured[0], reason: "unico", configured };

  const preferido = AI_PROVIDERS.find((provider) => configured.includes(provider.id))!;

  return { id: preferido.id, reason: "preferencia", configured };
}
