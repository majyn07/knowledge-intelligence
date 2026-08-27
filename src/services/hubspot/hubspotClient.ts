import "server-only";

/**
 * A fronteira de rede com a HubSpot.
 *
 * Somente leitura, por decisão: a chave é de um app privado que não
 * administramos, e escrever no CRM com credencial de outra pessoa é o tipo de
 * ação que não se toma por conta própria.
 */

const BASE = "https://api.hubapi.com";
const PRAZO_PADRAO_MS = 20000;

export type HubSpotFailureKind =
  | "sem-credencial"
  | "credencial-recusada"
  | "sem-permissao"
  | "prazo-esgotado"
  | "falha";

export class HubSpotFailure extends Error {
  constructor(
    readonly kind: HubSpotFailureKind,
    message: string
  ) {
    super(message);
    this.name = "HubSpotFailure";
  }
}

/**
 * A falha tem tipo porque as causas pedem ações diferentes.
 *
 * Credencial recusada é a provável aqui e merece nome próprio: o token é de
 * outra pessoa e pode ser rotacionado sem aviso. Dizer "tente novamente" nesse
 * caso manda alguém repetir um pedido que nunca vai passar.
 */
function classify(status: number, corpo: string): HubSpotFailure {
  let detalhe = corpo.slice(0, 200);
  try {
    const json: unknown = JSON.parse(corpo);
    if (json && typeof json === "object" && "message" in json) {
      detalhe = String((json as { message: unknown }).message);
    }
  } catch {
    /* corpo não-JSON: fica o texto cru, que é a única pista de quem administra */
  }

  if (status === 401) {
    return new HubSpotFailure(
      "credencial-recusada",
      "A HubSpot recusou a credencial. Ela pode ter sido trocada ou revogada."
    );
  }

  if (status === 403) {
    return new HubSpotFailure(
      "sem-permissao",
      `A credencial não alcança este dado na HubSpot. ${detalhe}`
    );
  }

  return new HubSpotFailure("falha", `A HubSpot respondeu ${status}. ${detalhe}`);
}

function prazo(): number {
  const bruto = Number.parseInt(process.env.HUBSPOT_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : PRAZO_PADRAO_MS;
}

function token(): string {
  const valor = process.env.HUBSPOT_ACCESS_TOKEN?.trim();

  /*
    Ausência de credencial é estado previsto, não erro de programação: o
    produto roda sem a integração, como roda sem o Supabase.
  */
  if (!valor) {
    throw new HubSpotFailure(
      "sem-credencial",
      "A integração com a HubSpot não está configurada neste ambiente."
    );
  }

  return valor;
}

async function chamar(caminho: string, init?: RequestInit): Promise<unknown> {
  const autorizacao = token();

  let resposta: Response;

  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${autorizacao}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(prazo()),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new HubSpotFailure(
        "prazo-esgotado",
        "A HubSpot não respondeu no prazo. Tente de novo em instantes."
      );
    }

    throw new HubSpotFailure("falha", "Não foi possível falar com a HubSpot.");
  }

  const corpo = await resposta.text();

  if (!resposta.ok) throw classify(resposta.status, corpo);

  try {
    return JSON.parse(corpo) as unknown;
  } catch {
    throw new HubSpotFailure("falha", "A HubSpot devolveu uma resposta ilegível.");
  }
}

export const hubspot = {
  get: (caminho: string) => chamar(caminho),
  post: (caminho: string, corpo: unknown) =>
    chamar(caminho, { method: "POST", body: JSON.stringify(corpo) }),
};

/** Se dá para sequer tentar. A tela usa isto para não oferecer um botão morto. */
export function hubspotConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim());
}
