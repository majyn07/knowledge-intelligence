"use client";

import { varreduraEmCurso, type EstadoDaSincronizacao } from "./autoSync";

/**
 * O interruptor da busca automática, que vive no banco e não no navegador.
 *
 * Tema, forma da lista e colunas ficam no navegador porque são preferência de
 * quem está ali. Este não: ele decide se o produto fala com o servidor de
 * suporte da AltoQi, e essa decisão vale para as catorze pessoas ao mesmo
 * tempo. Guardá-la por máquina faria cada um ter a sua, e a máquina do outro
 * lado sentiria a soma de todas.
 *
 * **A leitura passa por uma rota nossa, e isso custou uma tarde para descobrir
 * por quê.** Duas coisas conspiram contra falar com o banco daqui:
 *
 * `app_settings` não cabe no mapa de tabelas tipadas. Ela seria a décima sexta,
 * e o genérico da Supabase estoura o limite de inferência do TypeScript ali,
 * derrubando as outras quinze para `never`. Fora do mapa, `from()` compila com
 * um disfarce e **não dispara requisição nenhuma**.
 *
 * E `auth.getSession()` no navegador ficava **pendurado**: sem erro, sem rede,
 * sem aviso. A tela esperava para sempre por um estado que não vinha, e não
 * havia nada para achar porque não havia nada acontecendo.
 *
 * No servidor a sessão vem do cookie, por um caminho que a porta da HubSpot já
 * usa e que já está sob teste. É o mesmo banco e as mesmas políticas.
 */

const VAZIO: EstadoDaSincronizacao = {
  ligado: false,
  bloqueado: false,
  ultimaEm: "",
  execucaoEm: "",
  execucaoPor: "",
};

/**
 * Garante a forma, venha o que vier.
 *
 * Todo dado lido do armazenamento passa por um normalizador, e `jsonb` não é
 * exceção: a linha pode ter sido gravada por uma versão anterior do produto, e
 * a primeira leitura de um campo ausente derrubaria a tela.
 */
export function normalizarEstado(valor: unknown): EstadoDaSincronizacao {
  if (typeof valor !== "object" || valor === null) return VAZIO;

  const bruto = valor as Record<string, unknown>;

  const texto = (chave: string) =>
    typeof bruto[chave] === "string" ? (bruto[chave] as string) : "";

  return {
    ligado: bruto.ligado === true,
    /*
      Ausente é `false`, e é o lado certo do erro: uma linha gravada antes deste
      campo existir não pode chegar bloqueando a equipe inteira sem ninguém ter
      ligado nada.
    */
    bloqueado: bruto.bloqueado === true,
    ultimaEm: texto("ultimaEm"),
    execucaoEm: texto("execucaoEm"),
    execucaoPor: texto("execucaoPor"),
  };
}

const ROTA = "/api/settings/auto-sync";

export async function lerEstado(): Promise<EstadoDaSincronizacao | null> {
  try {
    const resposta = await fetch(ROTA);

    if (!resposta.ok) return null;

    const corpo = (await resposta.json()) as { estado?: unknown };

    return normalizarEstado(corpo.estado);
  } catch {
    /* Rede fora do ar é estado previsto: quem chama decide o que fazer. */
    return null;
  }
}

/**
 * Grava, e devolve o erro em vez de engolir.
 *
 * A política do banco recusa quem não administra, e essa recusa precisa chegar
 * à tela: um interruptor que volta sozinho ao estado anterior, sem dizer nada,
 * é pior que um desabilitado.
 */
export async function gravarEstado(
  estado: EstadoDaSincronizacao
): Promise<{ erro: string } | null> {
  try {
    const resposta = await fetch(ROTA, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(estado),
    });

    if (resposta.ok) return null;

    const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;

    /*
      A mensagem do servidor vai junto, como na tradução do erro de acesso: ela
      é a única pista de quem administra quando a recusa não é a esperada.
    */
    return { erro: corpo?.message ?? `HTTP ${resposta.status}` };
  } catch {
    return { erro: "Não foi possível falar com o servidor." };
  }
}

/**
 * Toma a tranca da varredura, ou diz quem já está com ela.
 *
 * A leitura e a escrita são dois passos, então duas abas que começam no mesmo
 * segundo podem passar as duas. Não há transação aqui, e não vale inventar uma:
 * o caso que importa é o comum (alguém já está varrendo há minutos), e o
 * empate exato de dois cliques simultâneos custa uma varredura duplicada, não
 * um dado errado.
 */
export async function tomarTranca(
  quem: string
): Promise<{ tomada: true } | { tomada: false; por: string }> {
  const atual = (await lerEstado()) ?? VAZIO;

  if (varreduraEmCurso(atual, new Date())) {
    return { tomada: false, por: atual.execucaoPor };
  }

  await gravarEstado({ ...atual, execucaoEm: new Date().toISOString(), execucaoPor: quem });

  return { tomada: true };
}

/**
 * Diz que a varredura continua viva.
 *
 * Chamado a cada lote, e não uma vez no começo: uma aba fechada no meio
 * deixaria a tranca fechada para sempre, e ninguém teria como abrir. Com o
 * sinal de vida, a tranca sem renovação é dada como abandonada sozinha.
 */
export async function renovarTranca(quem: string): Promise<void> {
  const atual = await lerEstado();

  if (!atual) return;

  await gravarEstado({ ...atual, execucaoEm: new Date().toISOString(), execucaoPor: quem });
}

/** Devolve a tranca e registra que houve busca agora. */
export async function soltarTranca(marcarBusca: boolean): Promise<void> {
  const atual = await lerEstado();

  if (!atual) return;

  await gravarEstado({
    ...atual,
    execucaoEm: "",
    execucaoPor: "",
    ultimaEm: marcarBusca ? new Date().toISOString() : atual.ultimaEm,
  });
}
