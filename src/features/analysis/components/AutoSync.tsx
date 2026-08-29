"use client";

import { useCallback } from "react";

import { usePeople } from "@/features/people/providers/PeopleProvider";
import { planejarVarredura } from "@/services/hubspot/helpDeskSchedule";
import { useProject } from "@/providers/ProjectProvider";

import { renovarTranca, soltarTranca, tomarTranca } from "../autoSyncRepository";
import { caixasDoSuporte, lerConversas, listarConversas } from "../helpDeskScan";
import { useAutoSync } from "../hooks/useAutoSync";
import { useTickets } from "../providers/TicketsProvider";

/**
 * A busca automática, montada no nível da aplicação.
 *
 * Ela vivia dentro da tela de Atendimentos, e ali só rodava enquanto alguém
 * estava **naquela tela**. A tela dizia outra coisa: "quem administra e está com
 * o produto aberto". Ligada por duas horas, com o produto aberto no
 * Levantamento, ela não rodou uma vez — e não havia erro nenhum para achar,
 * porque não havia nada acontecendo.
 *
 * Aqui ela acompanha a sessão, não a rota. Não desenha nada: quem mostra estado
 * é o cartão em Atendimentos, que é onde a consequência aparece.
 */
export function AutoSync() {
  const { ticketsOf, importFromHelpDesk } = useTickets();
  const { currentPerson } = usePeople();
  const { activeProjectId } = useProject();

  /*
    Usa o mesmo motor do diálogo, e não uma segunda cópia: duas varreduras
    escritas em separado divergem, e a que roda sozinha seria justamente a que
    ninguém está olhando quando divergir.

    Sem teto de quantos ler, ao contrário da busca à mão. Ali o teto existe
    porque alguém escolheu a janela e pode ter escolhido grande demais; aqui a
    janela é o intervalo desde a última busca, pequeno por construção.
  */
  const buscarSozinho = useCallback(
    async (desde: string, ate: string) => {
      const tranca = await tomarTranca(currentPerson);

      if (!tranca.tomada) return;

      try {
        const conversas = await listarConversas({ caixas: await caixasDoSuporte(), desde });

        const conhecidos = ticketsOf(activeProjectId)
          .filter((ticket) => ticket.source?.provider === "hubspot")
          .map((ticket) => ({
            externalId: ticket.source?.externalId ?? "",
            ultimaMensagemEm: String(ticket.raw?.ultimaMensagemEm ?? ""),
          }));

        const plano = planejarVarredura(conversas, conhecidos, desde, ate);

        const { trazidos } = await lerConversas({
          visitar: plano.visitar,
          projectId: activeProjectId ?? "",
          aoLote: () => void renovarTranca(currentPerson),
        });

        importFromHelpDesk(trazidos, "automática");

        /*
          O cursor guarda o **fim da janela**, e não o instante da busca. Com
          atraso de dois dias, buscar hoje cobre até anteontem, e a próxima
          precisa partir de anteontem.
        */
        await soltarTranca(true, ate);
      } catch {
        /*
          Em silêncio, e de propósito. Ninguém pediu esta busca: um aviso de
          falha no meio do trabalho de outra pessoa é ruído sobre algo que ela
          não começou, e a próxima conferência tenta de novo em cinco minutos.
          A tranca volta de qualquer jeito, senão a falha trancaria a equipe.
        */
        await soltarTranca(false);
      }
    },
    [activeProjectId, currentPerson, importFromHelpDesk, ticketsOf]
  );

  useAutoSync(buscarSozinho);

  return null;
}
