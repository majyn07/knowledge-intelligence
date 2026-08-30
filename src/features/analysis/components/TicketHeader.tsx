"use client";

import { Brain, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type { Ticket } from "@/models/Ticket";

/**
 * A identidade do atendimento, acima da conversa.
 *
 * Ela ficava na coluna de atributos, e lá um assunto como "Ticket AltoQi
 * nº47954714157 - Falha Abrir Software - Builder" quebrava em seis linhas.
 * Identidade não é atributo: ela diz **o que se está lendo**, e por isso fica
 * junto do que se lê.
 *
 * O número da HubSpot vem primeiro, e o nosso identificador nem aparece.
 * `hs-6952014856` é o id da conversa e não acha nada na busca do CRM: quem lê
 * esta tela vai procurar lá, e precisa do número que funciona lá.
 */
export function TicketHeader({
  ticket,
  isAnalyzing,
  onAnalyze,
  onDelete,
  analysisStatus,
}: {
  ticket: Ticket;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onDelete: () => void;
  analysisStatus?: AnalysisStatus;
}) {
  const chamado = typeof ticket.raw?.hubspotTicketId === "string" ? ticket.raw.hubspotTicketId : "";

  const cliente =
    typeof ticket.raw?.contato === "object" && ticket.raw.contato !== null
      ? String((ticket.raw.contato as { nome?: unknown }).nome ?? "")
      : "";

  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {chamado ? (
            <span className="rounded-md bg-primary/12 px-2 py-1 font-mono text-[11px] text-primary">
              #{chamado}
            </span>
          ) : (
            <span className="uppercase tracking-[0.14em]">Sem número na HubSpot</span>
          )}

          {cliente && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {cliente}
            </span>
          )}
        </p>

        {/*
          `break-words` porque o assunto vem do e-mail do cliente e traz
          protocolo e endereço sem espaço nenhum.
        */}
        <h2 className="mt-1.5 break-words text-xl font-semibold leading-7 tracking-tight">
          {ticket.title}
        </h2>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {/*
          O rótulo diz o estado, e não sempre a mesma coisa.

          Com a análise esperando revisão o botão se desabilitava e continuava
          escrito "Analisar com IA", em estilo primário: clique que não faz
          nada, sem dizer por quê. Quem clica conclui que a IA quebrou.
        */}
        <Button
          disabled={isAnalyzing || analysisStatus === "in_review"}
          variant={analysisStatus === "in_review" ? "outline" : "default"}
          title={
            analysisStatus === "in_review"
              ? "A análise anterior está esperando revisão. Aprove ou descarte as oportunidades abaixo para analisar de novo."
              : undefined
          }
          onClick={onAnalyze}
        >
          <Brain className="mr-2 h-4 w-4" />
          {isAnalyzing
            ? "Analisando..."
            : analysisStatus === "in_review"
              ? "Aguardando sua revisão"
              : analysisStatus === "completed"
                ? "Executar nova análise"
                : "Analisar com IA"}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Excluir atendimento" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
