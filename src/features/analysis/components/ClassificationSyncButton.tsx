"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { contar } from "@/lib/plural";
import type { TicketClassificationField } from "@/models/TicketClassification";

import { aplicacaoDe, planejarClassificacao } from "../classificationSync";
import { useTickets } from "../providers/TicketsProvider";

type Classificacao = Record<TicketClassificationField, string>;

/** Entre um lote e o seguinte. Onze pedidos não estouram limite, mas é a máquina do suporte. */
const PAUSA_MS = 600;

/**
 * Trazer da HubSpot a classificação que o suporte já fez.
 *
 * Só leitura lá: quem grava é o nosso banco, numa escrita só no fim. Em série,
 * com progresso, e dá para parar. Se um lote falha, o que já veio é aplicado e
 * a tela diz onde parou — perder dez lotes lidos por causa do décimo primeiro
 * seria jogar fora leitura pronta.
 *
 * Aparece só para quem administra, como a busca na HubSpot: a porta de verdade
 * é a rota, e oferecer o que vai ser recusado é pior que não oferecer.
 */
export function ClassificationSyncButton() {
  const { souAdministrador } = usePeople();
  const { tickets, applyClassification } = useTickets();
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const parar = useRef(false);

  const plano = useMemo(() => planejarClassificacao(tickets), [tickets]);

  if (!souAdministrador || plano.lotes.length === 0) return null;

  async function trazer() {
    parar.current = false;
    setResultado(null);
    setProgresso({ feitos: 0, total: plano.lotes.length });

    const respostas: Record<string, Classificacao> = {};
    let ausentes = 0;
    let falha: string | null = null;

    for (let i = 0; i < plano.lotes.length; i += 1) {
      if (parar.current) break;
      if (i > 0) await new Promise((resolva) => setTimeout(resolva, PAUSA_MS));

      try {
        const resposta = await fetch("/api/hubspot/classificacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: plano.lotes[i] }),
        });
        const dados: {
          classificacoes?: Record<string, Classificacao>;
          ausentes?: string[];
          message?: string;
        } = await resposta.json();

        if (!resposta.ok || !dados.classificacoes) {
          falha = `${dados.message ?? "A HubSpot não respondeu."} Parou no lote ${i + 1} de ${plano.lotes.length}.`;
          break;
        }

        Object.assign(respostas, dados.classificacoes);
        ausentes += dados.ausentes?.length ?? 0;
      } catch {
        falha = `Não foi possível falar com o servidor. Parou no lote ${i + 1} de ${plano.lotes.length}.`;
        break;
      }

      setProgresso({ feitos: i + 1, total: plano.lotes.length });
    }

    const porTicket = aplicacaoDe(respostas, plano.porChamado);
    applyClassification(porTicket);
    setProgresso(null);

    const partes = [
      `${contar(porTicket.size, "atendimento")} ${porTicket.size === 1 ? "atualizado" : "atualizados"}`,
      ausentes > 0 ? `${contar(ausentes, "chamado")} não ${ausentes === 1 ? "existe" : "existem"} mais na HubSpot` : "",
      plano.semNumero > 0 ? `${contar(plano.semNumero, "atendimento")} sem número de chamado, de fora` : "",
    ].filter(Boolean);

    setResultado([falha, partes.join("; ") + "."].filter(Boolean).join(" "));
  }

  const rodando = progresso !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rodando ? (
        <>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Lendo o lote {progresso.feitos + 1} de {progresso.total}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => (parar.current = true)}>
            Parar
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-8 max-w-full whitespace-normal text-left"
          onClick={trazer}
          title="Só leitura na HubSpot. Os onze campos de cada atendimento passam a ser os de lá."
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Trazer classificação da HubSpot ({contar(plano.lotes.length, "pedido")})
        </Button>
      )}

      {resultado && <p className="w-full text-xs text-muted-foreground">{resultado}</p>}
    </div>
  );
}
