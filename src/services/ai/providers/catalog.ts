/**
 * Quais provedores de IA o produto conhece, e qual está valendo.
 *
 * Puro de propósito: a tela de Integrações lê daqui para dizer a verdade sobre
 * o ambiente, e o servidor lê daqui para escolher com quem falar. Duas listas
 * do mesmo vocabulário divergem. É a mesma razão da trilha de navegação sair
 * do cadastro de rotas do menu.
 *
 * A escolha é **declarada**, não deduzida da presença de chave, pelo mesmo
 * motivo do modo compartilhado: chave provisionada em ambiente é acidente de
 * infraestrutura, e não decisão de produto.
 */

/**
 * O identificador de um provedor.
 *
 * Texto, e não união fechada: quem manda é o catálogo abaixo, e uma união com
 * um membro só não protege de nada enquanto obriga a inventar um provedor
 * falso para testar a escolha entre dois.
 */
export type AIProviderId = string;

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  /** Variável do ambiente do servidor que guarda a chave. Só a presença é lida. */
  envKey: string;
  purpose: string;
  /**
   * O provedor lê documento anexado (PDF, imagem) além de texto?
   *
   * É **declarado**, e não deduzido de o provedor existir, pela mesma razão
   * do resto deste arquivo: capacidade suposta falha em silêncio. Sem isto,
   * trocar o provedor por um que só lê texto faria o anexo ser ignorado, e a
   * pessoa receberia campos vazios sem nada dizendo que o arquivo não foi
   * lido: o pior tipo de defeito, porque parece resposta.
   *
   * Quem declara `false` faz a tela **esconder o botão de anexar**, em vez de
   * oferecer um caminho que termina em nada. É a mesma regra do botão de
   * entrar com a conta Google.
   */
  readsFiles: boolean;
}

/**
 * A ordem é a preferência quando ninguém declarou e há mais de um configurado.
 * É decisão escrita, não sorteio, e a tela diz que a usou.
 */
export const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    purpose: "Análise de atendimentos",
    readsFiles: true,
  },
];

/**
 * O provedor que está valendo lê arquivo?
 *
 * Sem provedor ativo a resposta é `false`, e não um erro: quem pergunta é a
 * tela, para decidir se mostra o botão de anexar, e ela não deve tratar
 * ausência de configuração como falha: o produto roda sem IA, e a tela de
 * preenchimento simplesmente não oferece o que não existe.
 */
export function activeProviderReadsFiles(
  env: Record<string, string | undefined>
): boolean {
  const { id } = resolveActiveProvider(env);

  return id === null ? false : (findProvider(id)?.readsFiles ?? false);
}

export function findProvider(id: string): AIProviderInfo | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Por que o provedor ativo é o que é, ou por que não há nenhum.
 *
 * `declarado`  , `AI_PROVIDER` nomeou um, e ele tem chave.
 * `unico`      , ninguém declarou, e só um está configurado.
 * `preferencia`, ninguém declarou, e há mais de um. Vale a ordem do catálogo,
 *                 e a tela diz isso: escolher em silêncio entre dois seria
 *                 apresentar como decisão o que foi ordem alfabética do acaso.
 * `declarado-sem-chave`. Nomearam um provedor que não tem chave neste
 *                 ambiente. Não caímos em outro: quem declarou quis aquele, e
 *                 substituir por conta própria esconderia o erro de digitação.
 * `nenhum`     , não há chave nenhuma. A análise por IA não funciona, e é o
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
 * mexer no processo, e para a tela poder passar só o que ela sabe.
 */
export function resolveActiveProvider(
  env: Record<string, string | undefined>,
  catalogo: AIProviderInfo[] = AI_PROVIDERS
): ActiveProvider {
  const configured = catalogo.filter((provider) => {
    const value = env[provider.envKey];
    return typeof value === "string" && value.trim() !== "";
  }).map((provider) => provider.id);

  const declared = (env.AI_PROVIDER ?? "").trim().toLowerCase();

  if (declared !== "") {
    const known = catalogo.find((provider) => provider.id === declared);

    if (known && configured.includes(known.id)) {
      return { id: known.id, reason: "declarado", declared, configured };
    }

    return { id: null, reason: "declarado-sem-chave", declared, configured };
  }

  if (configured.length === 0) return { id: null, reason: "nenhum", configured };
  if (configured.length === 1) return { id: configured[0], reason: "unico", configured };

  const preferido = catalogo.find((provider) => configured.includes(provider.id))!;

  return { id: preferido.id, reason: "preferencia", configured };
}
