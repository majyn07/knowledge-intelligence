/**
 * A busca que acontece sozinha, na aba de quem está trabalhando.
 *
 * Não é um cron, e a diferença é uma decisão e não uma limitação. Um cron roda
 * no servidor **sem sessão de ninguém**, e as políticas de acesso deste produto
 * exigem sessão para escrever. Fazê-lo funcionar exigiria devolver ao ambiente
 * uma chave que ignora todas as políticas, que foi removida de propósito.
 *
 * Então quem sincroniza é o navegador de quem já está aqui, com a sessão que
 * ele já tem. Nada de segredo novo, nada de caminho que escapa das políticas.
 *
 * **O preço está anotado, não escondido:** de madrugada, no fim de semana e no
 * feriado ninguém tem a aba aberta, e nada entra. É por isso que a retomada
 * cobre o intervalo perdido em vez de olhar só a última hora: quem abre o
 * produto na segunda de manhã precisa que a busca alcance a sexta.
 */

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

/** De quanto em quanto tempo vale buscar de novo. */
export const INTERVALO_PADRAO_MS = HORA;

/**
 * Quanto a janela recua além do intervalo perdido.
 *
 * A listagem filtra pelo carimbo da última mensagem, e esse carimbo é o da
 * HubSpot enquanto o corte é o relógio de quem executa. Dois relógios nunca
 * batem no milissegundo, e sem folga a conversa que chega exatamente na virada
 * cai no vão entre duas execuções: nenhuma das duas a alcança, e ninguém
 * descobre porque não há erro nenhum.
 */
export const FOLGA_MS = 10 * MINUTO;

/**
 * A janela não recua para sempre.
 *
 * Duas semanas sem ninguém abrir o produto significa férias coletivas ou
 * produto parado, e aí a retomada seria a varredura do histórico inteiro
 * disparada sozinha, sem ninguém escolher. Acima disto quem decide é gente, na
 * tela de busca.
 */
export const RETOMADA_MAXIMA_MS = 14 * 24 * HORA;

export interface EstadoDaSincronizacao {
  /** O interruptor, que só quem administra muda. */
  ligado: boolean;
  /** Quando a última busca terminou, em ISO. Vazio se nunca houve. */
  ultimaEm: string;
}

export type Decisao =
  | { sincronizar: true; desde: string }
  | { sincronizar: false; motivo: MotivoDeNaoSincronizar };

export type MotivoDeNaoSincronizar =
  | "desligado"
  | "cedo-demais"
  | "parado-tempo-demais"
  | "sem-registro";

/**
 * Decide se vale buscar agora, e a partir de quando.
 *
 * `agora` entra como valor para a função continuar pura: ela é testada, e ler o
 * relógio aqui dentro tornaria o teste dependente do minuto em que roda.
 */
export function decidirSincronizacao(
  estado: EstadoDaSincronizacao,
  agora: Date,
  intervaloMs = INTERVALO_PADRAO_MS
): Decisao {
  if (!estado.ligado) return { sincronizar: false, motivo: "desligado" };

  /*
    Sem registro de execução anterior não dá para saber o que ficou para trás, e
    escolher uma janela por conta própria seria disparar contra o servidor do
    suporte um tamanho que ninguém pediu. A primeira busca é de gente.
  */
  if (estado.ultimaEm === "") return { sincronizar: false, motivo: "sem-registro" };

  const ultima = new Date(estado.ultimaEm).getTime();

  if (Number.isNaN(ultima)) return { sincronizar: false, motivo: "sem-registro" };

  const desdeEntao = agora.getTime() - ultima;

  if (desdeEntao < intervaloMs) return { sincronizar: false, motivo: "cedo-demais" };
  if (desdeEntao > RETOMADA_MAXIMA_MS) {
    return { sincronizar: false, motivo: "parado-tempo-demais" };
  }

  /*
    A janela cobre o intervalo perdido, e não a última hora. Se a última busca
    foi na sexta, quem abre o produto na segunda precisa que ela alcance a
    sexta: buscar só a última hora deixaria o fim de semana inteiro para trás,
    em silêncio.
  */
  return {
    sincronizar: true,
    desde: new Date(ultima - FOLGA_MS).toISOString(),
  };
}

export const motivoLegivel: Record<MotivoDeNaoSincronizar, string> = {
  desligado: "A busca automática está desligada.",
  "cedo-demais": "A última busca foi há pouco.",
  "parado-tempo-demais":
    "Faz mais de duas semanas sem buscar. Uma janela desse tamanho é escolha de gente, na busca manual.",
  "sem-registro": "Ainda não houve uma primeira busca. Ela é feita à mão.",
};

/** Como o intervalo é dito na tela, sem obrigar ninguém a converter milissegundos. */
export function intervaloLegivel(ms: number): string {
  const horas = Math.round(ms / HORA);

  if (horas >= 1) return horas === 1 ? "a cada hora" : `a cada ${horas} horas`;

  return `a cada ${Math.round(ms / MINUTO)} minutos`;
}
