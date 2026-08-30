"use client";

import { useEffect } from "react";

import { isTyping } from "@/lib/typing";

/**
 * Andar pela fila sem tirar as mãos do teclado.
 *
 * É como um help desk se usa: a pessoa lê um atendimento, decide, e passa ao
 * próximo. Com mil na lista, obrigá-la a mirar o cursor num item de quatro
 * linhas entre cada leitura é o que faz alguém parar de percorrer a fila.
 *
 * `j` e `k` ao lado das setas, que é a convenção de quem já usa listas assim,
 * e não invenção nossa. Ambas são de uma tecla só, então ambas precisam da
 * guarda de digitação: navegar a lista com ↑ enquanto o cursor está na busca
 * tiraria a pessoa de onde ela está escrevendo.
 *
 * Anda **dentro da página**, e não do recorte inteiro. A lista pagina de vinte
 * e cinco em vinte e cinco, e saltar para um item que não está na tela seria
 * seleção invisível: a pessoa apertaria a seta e nada pareceria acontecer.
 */
export function useListaPorTeclado({
  ids,
  selecionado,
  aoSelecionar,
  ativo = true,
}: {
  /** Os identificadores na ordem em que aparecem, na página atual. */
  ids: string[];
  selecionado: string;
  aoSelecionar: (id: string) => void;
  /** Desligado quando há diálogo aberto: ali as setas são de quem está no diálogo. */
  ativo?: boolean;
}) {
  useEffect(() => {
    if (!ativo || ids.length === 0) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (isTyping(evento.target)) return;

      /*
        Com modificador a tecla é outro atalho: Ctrl+K é a busca, Cmd+↓ é o fim
        da página no macOS. Deixar passar seria roubar comandos do sistema.
      */
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;

      const passo =
        evento.key === "ArrowDown" || evento.key === "j"
          ? 1
          : evento.key === "ArrowUp" || evento.key === "k"
            ? -1
            : 0;

      if (passo === 0) return;

      evento.preventDefault();

      const atual = ids.indexOf(selecionado);

      /*
        Sem seleção na página, a primeira seta escolhe a ponta correspondente:
        ↓ começa no topo e ↑ começa no fim. Começar sempre no topo faria o ↑
        parecer quebrado para quem acabou de trocar de página.
      */
      if (atual === -1) {
        aoSelecionar(passo === 1 ? ids[0] : ids[ids.length - 1]);
        return;
      }

      /*
        Para nas pontas em vez de dar a volta. Numa fila de trabalho, voltar ao
        primeiro depois do último faz alguém reler o que já leu sem perceber
        que deu a volta.
      */
      const proximo = Math.min(Math.max(atual + passo, 0), ids.length - 1);

      if (proximo !== atual) aoSelecionar(ids[proximo]);
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ativo, aoSelecionar, ids, selecionado]);
}
