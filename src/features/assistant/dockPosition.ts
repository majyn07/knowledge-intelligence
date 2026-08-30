/**
 * Onde o painel fica na tela.
 *
 * A posição é preferência de **máquina**, como o tema e a forma da lista: quem
 * arrastou para o canto esquerdo o fez neste monitor. Por isso ela fica no
 * navegador, e por isso ela precisa ser reencaixada na abertura — a posição
 * gravada num monitor de 2.560 põe o painel fora da tela num notebook de 1.366,
 * e quem abrisse não veria nada nem teria como arrastar de volta.
 */

export interface DockPosition {
  /** Da direita, porque é onde ele nasce e é o lado que fica fixo ao redimensionar. */
  right: number;
  bottom: number;
}

export const DOCK_INICIAL: DockPosition = { right: 24, bottom: 24 };

/** Quanto do painel tem de continuar visível. Menos que isto e não há o que pegar. */
const MARGEM = 8;

export function encaixar(
  posicao: DockPosition,
  janela: { width: number; height: number },
  tamanho: { width: number; height: number }
): DockPosition {
  /*
    Janela menor que o painel: o encaixe devolve a origem em vez de um valor
    negativo. Negativo põe a barra de arrastar acima do topo, e o painel fica
    sem alça, que é o mesmo problema que este encaixe veio resolver.
  */
  const maxRight = Math.max(MARGEM, janela.width - tamanho.width - MARGEM);
  const maxBottom = Math.max(MARGEM, janela.height - tamanho.height - MARGEM);

  return {
    right: Math.min(Math.max(posicao.right, MARGEM), maxRight),
    bottom: Math.min(Math.max(posicao.bottom, MARGEM), maxBottom),
  };
}

/** O que veio do armazenamento pode ser qualquer coisa: uma versão anterior, ou lixo. */
export function lerPosicao(bruto: unknown): DockPosition {
  if (typeof bruto !== "object" || bruto === null) return DOCK_INICIAL;

  const { right, bottom } = bruto as Partial<DockPosition>;

  return {
    right: Number.isFinite(right) ? (right as number) : DOCK_INICIAL.right,
    bottom: Number.isFinite(bottom) ? (bottom as number) : DOCK_INICIAL.bottom,
  };
}
