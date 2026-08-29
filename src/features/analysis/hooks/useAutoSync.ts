"use client";

import { useEffect, useRef } from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";
import { isSharedWorkspace } from "@/lib/supabase/mode";

import { decidirSincronizacao } from "../autoSync";
import { lerEstado } from "../autoSyncRepository";

/**
 * A busca automática, que roda na aba de quem já está aqui.
 *
 * Ela não é um relógio disparando sozinho: é uma conferência barata, feita de
 * vez em quando, que só age quando todas as condições batem. Quem decide é
 * `decidirSincronizacao`, que é pura e testada; este arquivo só liga a decisão
 * ao tempo e à tela.
 *
 * **Só administrador dispara**, e não por hierarquia: a rota da HubSpot recusa
 * qualquer outra pessoa, então tentar seria gastar uma requisição para tomar um
 * 403. Na prática isso significa que a busca automática acontece quando alguém
 * que administra está com o produto aberto, e a tela diz exatamente isso.
 */

/**
 * De quanto em quanto tempo a aba pergunta se já é hora.
 *
 * Perguntar é uma leitura de uma linha; buscar é que é caro. Cinco minutos é
 * curto o bastante para a busca de hora em hora não atrasar muito, e longo o
 * bastante para a pergunta não aparecer no perfil de rede de ninguém.
 */
const CONFERIR_A_CADA_MS = 5 * 60 * 1000;

/** Quanto esperar depois de a aba abrir, para não competir com a carga inicial. */
const ESPERA_INICIAL_MS = 30 * 1000;

export function useAutoSync(buscar: (desde: string, ate: string) => Promise<void>) {
  const { souAdministrador } = usePeople();

  /*
    A função de busca vem numa ref porque ela é recriada a cada render de quem
    chama. Sem isto, o intervalo seria desmontado e remontado o tempo todo, e a
    conferência nunca chegaria a acontecer.
  */
  const buscarRef = useRef(buscar);

  useEffect(() => {
    buscarRef.current = buscar;
  }, [buscar]);

  /** Verdadeiro enquanto uma busca nossa está em curso, para não empilhar. */
  const ocupado = useRef(false);

  useEffect(() => {
    if (!isSharedWorkspace() || !souAdministrador) return;

    let vivo = true;

    async function conferir() {
      if (!vivo || ocupado.current) return;

      const estado = await lerEstado();

      if (!estado || !vivo) return;

      const decisao = decidirSincronizacao(estado, new Date());

      if (!decisao.sincronizar) return;

      ocupado.current = true;

      try {
        await buscarRef.current(decisao.desde, decisao.ate);
      } finally {
        ocupado.current = false;
      }
    }

    const primeira = setTimeout(() => void conferir(), ESPERA_INICIAL_MS);
    const relogio = setInterval(() => void conferir(), CONFERIR_A_CADA_MS);

    return () => {
      vivo = false;
      clearTimeout(primeira);
      clearInterval(relogio);
    };
  }, [souAdministrador]);
}
