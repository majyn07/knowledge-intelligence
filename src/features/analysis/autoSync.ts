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

/**
 * Quanto a janela fica atrás do agora, quando ninguém escolheu.
 *
 * Dois dias é palpite calibrado numa amostra, e está aqui como **partida** e
 * não como verdade: quem administra ajusta na tela, porque quem sabe quanto o
 * suporte demora para associar o ticket é quem trabalha lá.
 */
export const ATRASO_PADRAO_DIAS = 2;

/** Largura máxima da janela quando há atraso a recuperar. */
export const JANELA_PADRAO_DIAS = 10;

export interface EstadoDaSincronizacao {
  /** O interruptor da busca automática, que só quem administra muda. */
  ligado: boolean;
  /**
   * O freio de mão: nenhuma chamada à HubSpot sai, nem automática nem à mão.
   *
   * É outro interruptor de propósito. Desligar a automática ainda deixa
   * qualquer administrador varrer três meses à mão, e a pergunta que originou
   * este campo é outra: "como impeço que alguém sobrecarregue o servidor do
   * suporte". A resposta precisa alcançar também quem clica.
   *
   * Vale **no servidor**. Um freio que só esconde botão não freia nada.
   */
  bloqueado: boolean;
  /** Quando a última busca terminou, em ISO. Vazio se nunca houve. */
  ultimaEm: string;
  /**
   * Quando a varredura em curso deu sinal de vida, em ISO. Vazio se não há.
   *
   * É o que impede duas varreduras ao mesmo tempo. Sem ele, dois
   * administradores com a tela aberta disparam duas varreduras de três meses
   * contra a mesma caixa, e o servidor do suporte sente as duas somadas.
   *
   * Renovado a cada lote, e não gravado uma vez no começo: uma aba fechada no
   * meio deixaria a tranca fechada para sempre, e ninguém teria como abrir.
   */
  execucaoEm: string;
  /** Quem está com a varredura em curso, para a tela dizer a quem perguntar. */
  execucaoPor: string;
  /**
   * Quantos dias a janela fica **atrás** do agora.
   *
   * Medido contra a caixa real: nas conversas mais recentes de uma janela de
   * três dias, 119 de 144 não tinham chamado associado; nas mais antigas da
   * mesma janela, treze de vinte viraram atendimento. O ticket nasce quando
   * alguém do suporte trata a conversa, e isso leva horas.
   *
   * Ler o que acabou de chegar é ler antes de existir o que se quer. Com
   * atraso, a conversa é lida quando já tem chamado, e vira atendimento na
   * primeira leitura.
   *
   * **É cadastro, não constante**, e por dois motivos. O primeiro é a regra
   * desta casa: o que depende do processo da equipe não fica escrito no
   * código. O segundo é que o número certo depende de quanto o suporte da
   * AltoQi demora para associar o ticket, e isso nenhuma medição nossa
   * responde melhor que quem trabalha lá.
   *
   * Zero devolve o comportamento antigo: janela até agora.
   */
  atrasoDias: number;
  /**
   * O quanto a janela pode alargar quando há atraso a recuperar.
   *
   * É teto, e não tamanho: o normal é a janela cobrir só o que passou desde a
   * última varredura. Ele existe para uma volta de férias não virar a varredura
   * do trimestre disparada sozinha.
   */
  janelaDias: number;
  /**
   * Até onde a última varredura chegou, em ISO.
   *
   * **Não é o mesmo que `ultimaEm`**, e a diferença é o que faz o atraso
   * funcionar. `ultimaEm` é quando alguém buscou; este é o fim da janela que
   * aquela busca cobriu. Com atraso de dois dias, buscar hoje cobre até
   * anteontem, e a próxima precisa partir de anteontem e não de hoje.
   *
   * Vazio quando nunca houve busca, ou quando a que houve não declarou fim.
   */
  cursorEm: string;
}

/**
 * Quanto tempo sem sinal de vida até a varredura ser dada como abandonada.
 *
 * A varredura renova o carimbo a cada lote, e um lote são vinte conversas com
 * pausa entre elas: passar disto significa aba fechada, rede caída ou máquina
 * suspensa. Curto o bastante para não travar a equipe por causa de um
 * navegador fechado, e longo o bastante para não atropelar quem está lendo.
 */
export const TRANCA_ABANDONADA_MS = 5 * 60 * 1000;

/** A varredura está em curso, e não é uma tranca esquecida. */
export function varreduraEmCurso(estado: EstadoDaSincronizacao, agora: Date): boolean {
  if (estado.execucaoEm === "") return false;

  const desde = new Date(estado.execucaoEm).getTime();

  if (Number.isNaN(desde)) return false;

  return agora.getTime() - desde < TRANCA_ABANDONADA_MS;
}

export type Decisao =
  | { sincronizar: true; desde: string; ate: string }
  | { sincronizar: false; motivo: MotivoDeNaoSincronizar };

export type MotivoDeNaoSincronizar =
  | "desligado"
  | "bloqueado"
  | "ja-em-curso"
  | "cedo-demais"
  | "nada-maduro"
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
  /*
    O freio vem antes de tudo. Ele existe para responder "como impeço que
    alguém sobrecarregue o servidor do suporte", e uma resposta que depende da
    ordem em que as condições são lidas não responde nada.
  */
  if (estado.bloqueado) return { sincronizar: false, motivo: "bloqueado" };
  if (!estado.ligado) return { sincronizar: false, motivo: "desligado" };
  if (varreduraEmCurso(estado, agora)) return { sincronizar: false, motivo: "ja-em-curso" };

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

  const DIA = 24 * 60 * 60 * 1000;

  /*
    O fim da janela fica atrás do agora. É o que faz a conversa ser lida depois
    de já ter chamado, em vez de ser lida vazia e relida na próxima.
  */
  const fim = agora.getTime() - Math.max(0, estado.atrasoDias) * DIA;

  /*
    O começo parte de onde a última varredura terminou, com a folga de sempre:
    dois relógios não batem no milissegundo, e a conversa que chega na virada
    cairia no vão entre duas execuções.

    Sem cursor, parte da largura máxima. É o caso de quem só fez buscas à mão
    antes de ligar a automática.
  */
  const cursor = estado.cursorEm === "" ? NaN : new Date(estado.cursorEm).getTime();

  const teto = fim - Math.max(1, estado.janelaDias) * DIA;
  const inicio = Number.isNaN(cursor) ? teto : Math.max(cursor - FOLGA_MS, teto);

  /*
    Janela vazia não é erro: com atraso de dois dias, uma busca manual que
    varreu até agora já cobriu tudo que está maduro. Buscar de novo antes de o
    tempo passar seria gastar requisição para reler o mesmo.
  */
  if (inicio >= fim) return { sincronizar: false, motivo: "nada-maduro" };

  return {
    sincronizar: true,
    desde: new Date(inicio).toISOString(),
    ate: new Date(fim).toISOString(),
  };
}

export const motivoLegivel: Record<MotivoDeNaoSincronizar, string> = {
  desligado: "A busca automática está desligada.",
  bloqueado: "As chamadas à HubSpot estão bloqueadas.",
  "ja-em-curso": "Já há uma varredura em curso.",
  "cedo-demais": "A última busca foi há pouco.",
  "nada-maduro":
    "Nada novo o bastante para buscar. A janela fica atrás do agora, porque conversa recente ainda não tem chamado associado.",
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
