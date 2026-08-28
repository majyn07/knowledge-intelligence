/**
 * Junta muitos pedidos seguidos numa execução só.
 *
 * O tempo real avisa **por linha**. Uma classificação em massa grava noventa e
 * oito artigos, então chegam noventa e oito avisos, e a releitura responde a
 * cada um relendo o acervo inteiro: 22,7 MB vezes noventa e oito, em cada aba
 * aberta da equipe. O trabalho é o mesmo nas noventa e oito vezes, porque a
 * releitura busca o estado atual e não o evento.
 *
 * Por isso a espera. Passado o silêncio, roda uma vez só.
 *
 * O teto existe para a importação do portal, que grava por quarenta e cinco
 * minutos sem parar: só com a espera, a tela de quem assiste nunca atualizaria,
 * porque o silêncio nunca chega. Com o teto ela atualiza a cada poucos
 * segundos, que é o que alguém acompanhando espera ver.
 */
export interface Coalescer {
  pedir: () => void;
  cancelar: () => void;
}

export function criarCoalescer(
  acao: () => void,
  espera: number,
  teto: number,
  agora: () => number = Date.now
): Coalescer {
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let primeiroPedido = 0;

  function limpar() {
    if (temporizador !== null) {
      clearTimeout(temporizador);
      temporizador = null;
    }
  }

  function executar() {
    limpar();
    primeiroPedido = 0;
    acao();
  }

  return {
    pedir() {
      const instante = agora();

      if (temporizador === null) {
        primeiroPedido = instante;
      }

      limpar();

      /*
        O que sobra do teto, contado desde o primeiro pedido da rajada. Se já
        estourou, roda agora: adiar mais seria deixar a tela parada durante uma
        gravação longa, que é justamente quando alguém está olhando.
      */
      const restante = teto - (instante - primeiroPedido);

      temporizador = setTimeout(executar, Math.max(0, Math.min(espera, restante)));
    },

    cancelar() {
      limpar();
      primeiroPedido = 0;
    },
  };
}
