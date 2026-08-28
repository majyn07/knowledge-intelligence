"use client";

import { useEffect, useState } from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";
import { getSupabase } from "@/lib/supabase/client";

export interface Editor {
  id: string;
  name: string;
}

/**
 * Quem mais está com este artigo aberto para edição.
 *
 * Aviso, e não bloqueio. Travar o registro enquanto alguém edita transforma
 * uma aba esquecida aberta na sexta-feira num artigo inacessível até segunda,
 * e não há ninguém para destravar, não há papéis no produto. Saber que outra
 * pessoa está ali resolve o caso real, que é duas pessoas escrevendo sem
 * perceber.
 *
 * Usa a presença do tempo real, e não uma tabela: presença é estado efêmero e
 * some sozinha quando a aba fecha. Numa tabela, quem fechasse o navegador sem
 * avisar ficaria "editando" para sempre.
 *
 * Sem servidor não há com quem colidir, e a lista vem vazia.
 */
export function useEditingPresence(articleId: string): Editor[] {
  const { me } = usePeople();
  const [editors, setEditors] = useState<Editor[]>([]);

  const supabase = getSupabase();

  const myId = me?.id ?? "";
  const myName = me?.name ?? "";

  useEffect(() => {
    if (!supabase || articleId === "" || myId === "") return;

    const channel = supabase.channel(`edit:${articleId}`, {
      config: { presence: { key: myId } },
    });

    const read = () => {
      const state = channel.presenceState<{ name: string }>();

      /*
        A própria pessoa sai da lista: o aviso é sobre os outros, e ver o
        próprio nome ali faria parecer que há conflito quando não há.
      */
      setEditors(
        Object.entries(state)
          .filter(([id]) => id !== myId)
          .map(([id, presences]) => ({ id, name: presences[0]?.name ?? "Alguém" }))
      );
    };

    channel
      .on("presence", { event: "sync" }, read)
      .on("presence", { event: "join" }, read)
      .on("presence", { event: "leave" }, read)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ name: myName });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId, myId, myName, supabase]);

  return editors;
}
