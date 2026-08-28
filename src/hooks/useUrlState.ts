"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { applyParams, readParams, type ParamValues } from "@/lib/urlState";

/**
 * Mantém o recorte da tela no endereço.
 *
 * Devolve `[valores, escrever, lido]`: a mesma forma de `usePersistedState` e
 * de `useSharedCollection`, e pelo mesmo motivo: quem consome não precisa saber
 * de onde o estado veio.
 *
 * O primeiro render devolve **o padrão**, e o que está na URL entra num efeito
 * depois da montagem. Ler no render exigiria `useSearchParams`, que tiraria
 * estas rotas da pré-renderização e pediria uma fronteira de Suspense, e a
 * regra do projeto continua valendo: servidor e primeiro render do cliente
 * produzem o mesmo HTML.
 *
 * A escrita usa `replaceState`, não `pushState`. Cada tecla na busca viraria
 * uma entrada no histórico, e o botão de voltar deixaria de voltar para a tela
 * anterior para voltar letra por letra.
 */
export function useUrlState(
  defaults: ParamValues
): [ParamValues, (values: ParamValues) => void, boolean] {
  const [values, setValues] = useState<ParamValues>(defaults);
  const [read, setRead] = useState(false);

  /*
    O padrão vem de um objeto novo a cada render do consumidor. Guardar numa
    `ref` evita que o efeito de leitura rode de novo a cada render e sobrescreva
    o que a pessoa acabou de escolher com o que está na URL.
  */
  const padrao = useRef(defaults);

  useEffect(() => {
    setValues(readParams(window.location.search, padrao.current));
    setRead(true);
  }, []);

  const write = useCallback((next: ParamValues) => {
    setValues(next);

    const search = applyParams(window.location.search, next, padrao.current);

    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, []);

  return [values, write, read];
}
