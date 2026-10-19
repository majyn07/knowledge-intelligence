"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { articleText } from "../content/articleText";
import { foldText } from "../content/articleExcerpt";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { findSection, sectionPath } from "@/models/Taxonomy";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { useActivity } from "@/features/activities/providers/ActivityProvider";

import { editadosAqui, estadoNoPortal, type PortalState } from "../portalSync";

import type { LibraryFilters } from "../types/LibraryFilters";

const defaultFilters: LibraryFilters = {
  search: "",
  status: "all",
  categoryId: "all",
  portal: "all",
};

/**
 * Filtros da Biblioteca.
 *
 * As opções vêm do cadastro, não de constante no código: categoria criada
 * aparece aqui sozinha, categoria removida some. Antes desta sprint a lista de
 * produtos era fixa, então o filtro e o formulário podiam discordar.
 */
export function useLibraryFilters(items: KnowledgeArticle[]) {
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const { taxonomy } = useTaxonomy();
  const { events } = useActivity();

  /*
    O estado de cada artigo em relação ao portal, calculado uma vez por acervo e
    por histórico, e não a cada filtro: são 1.822 impressões de texto.
  */
  const noPortal = useMemo(() => {
    const editados = editadosAqui(events);
    const mapa = new Map<string, PortalState>();

    for (const item of items) {
      const estado = estadoNoPortal(item, editados);
      if (estado) mapa.set(item.id, estado);
    }

    return mapa;
  }, [items, events]);

  const buscando = filters.search.trim() !== "";

  /*
    O texto de cada artigo, sem marcação. Montado **uma vez por acervo**, e
    fora do caminho de quem digita.

    Sem índice, buscar no corpo limparia o HTML de mil e oitocentos artigos a
    cada tecla. Com índice construído dentro do render, a primeira tecla
    travava a interface por dois segundos e dois. E com o índice preso à busca
    em curso, ele era jogado fora ao limpar o campo e reconstruído na busca
    seguinte: o mesmo travamento, de novo.

    Agora ele é montado quando o navegador está ocioso, logo depois de o acervo
    chegar: quem nunca busca não paga nada de tempo de tela, e quem busca
    encontra o índice pronto. Se a busca começar antes de o ocioso acontecer, o
    trecho abaixo o constrói na hora, tarde é melhor que nunca.
  */
  const [indice, setIndice] = useState<{
    para: KnowledgeArticle[];
    mapa: Map<string, string>;
  } | null>(null);

  const montarIndice = useCallback((paraItens: KnowledgeArticle[]) => {
    const mapa = new Map<string, string>();

    for (const item of paraItens) {
      mapa.set(item.id, foldText(articleText(item)));
    }

    return mapa;
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    let cancelado = false;

    /*
      `requestIdleCallback` não existe em todo navegador; o `setTimeout` cobre
      o resto sem travar a montagem da tela.
    */
    const temOcioso = typeof window !== "undefined" && "requestIdleCallback" in window;

    const id = temOcioso
      ? window.requestIdleCallback(
          () => {
            if (!cancelado) setIndice({ para: items, mapa: montarIndice(items) });
          },
          { timeout: 4000 }
        )
      : window.setTimeout(() => {
          if (!cancelado) setIndice({ para: items, mapa: montarIndice(items) });
        }, 300);

    return () => {
      cancelado = true;
      if (temOcioso) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [items, montarIndice]);

  const searchIndex = useMemo(() => {
    if (!buscando) return new Map<string, string>();

    // O índice velho responderia sobre o texto de antes da edição.
    if (indice && indice.para === items) return indice.mapa;

    // A busca começou antes de o ocioso acontecer: tarde é melhor que nunca.
    return montarIndice(items);
  }, [items, buscando, indice, montarIndice]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = foldText(filters.search.trim());

      /*
        O corpo entra na busca, e é o que faltava: com o portal importado, o que
        alguém procura quase nunca está no título, está no meio do artigo.
      */
      const matchesSearch =
        search === "" ||
        foldText(item.title).includes(search) ||
        foldText(item.summary).includes(search) ||
        foldText(sectionPath(taxonomy, item.sectionId)).includes(search) ||
        item.tags.some((tag) => foldText(tag).includes(search)) ||
        item.keywords.some((keyword) => foldText(keyword).includes(search)) ||
        (searchIndex.get(item.id) ?? "").includes(search);

      const matchesStatus =
        filters.status === "all" || item.status === filters.status;

      const section = findSection(taxonomy, item.sectionId);

      const matchesCategory =
        filters.categoryId === "all" ||
        (filters.categoryId === "unset"
          ? section === undefined
          : section?.categoryId === filters.categoryId);

      const matchesPortal = filters.portal === "all" || noPortal.get(item.id) === filters.portal;

      return matchesSearch && matchesStatus && matchesCategory && matchesPortal;
    });
  }, [items, filters, taxonomy, searchIndex, noPortal]);

  /** Quantos artigos ficaram sem seção: o filtro só aparece se houver algum. */
  const unclassifiedCount = useMemo(
    () => items.filter((item) => findSection(taxonomy, item.sectionId) === undefined).length,
    [items, taxonomy]
  );

  /**
   * Quantos em cada situação que pede alguém. Zero esconde a opção: filtro que
   * só devolve vazio é botão que não faz nada.
   */
  const portalCounts = useMemo(() => {
    const contagem: Partial<Record<PortalState, number>> = {};

    for (const estado of noPortal.values()) {
      if (estado !== "em-dia") contagem[estado] = (contagem[estado] ?? 0) + 1;
    }

    return contagem;
  }, [noPortal]);

  return {
    filters,
    setFilters,
    filteredItems,
    unclassifiedCount,
    portalCounts,
  };
}
