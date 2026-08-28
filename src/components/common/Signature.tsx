"use client";

import { useEffect } from "react";

/**
 * A assinatura de quem construiu isto, no console.
 *
 * Fica aqui, e não espalhada em comentário pelos arquivos, por duas razões.
 * A primeira é convenção deste repositório: comentário explica **por quê**, e
 * assinatura no meio de uma explicação de decisão vira ruído que a próxima
 * pessoa não sabe se pode apagar. A segunda é honestidade: um easter egg no
 * console é discreto e reconhecível, enquanto marca camuflada no código passa
 * a impressão de que alguém tentou esconder algo, e não há nada a esconder.
 *
 * Não renderiza nada e não muda comportamento nenhum. Some da tela, aparece
 * para quem abre o inspetor, que é exatamente o público dela.
 */

const ASSINATURA = String.raw`
                     _
  _ __ ___   __ _   (_)_   _ _ __
 | '_ ' _ \ / _' |  | | | | | '_ \
 | | | | | | (_| |  | | |_| | | | |
 |_| |_| |_|\__,_|  |_|\__, |_| |_|
                       |___/
`;

export function Signature() {
  useEffect(() => {
    /*
      Num efeito, e não no render: `console` é do navegador, e escrever
      durante o render do servidor sujaria o log de cada requisição com isto.
      Uma vez por carga da aplicação, e não por navegação: o array vazio é o
      que garante.
    */
    console.log(
      `%c${ASSINATURA}`,
      "color:#00CC78;font-family:monospace;font-size:11px;line-height:1.1"
    );

    console.log(
      "%cVisus Knowledge Intelligence%c, construído por majyn · github.com/majyn07",
      "color:#00CC78;font-weight:600",
      "color:inherit"
    );
  }, []);

  return null;
}
