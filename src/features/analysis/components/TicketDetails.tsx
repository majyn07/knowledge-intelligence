"use client";

import { Brain, Building2, CalendarDays, Boxes, ScanSearch, Trash2 } from "lucide-react";

import { PropertyGrid } from "@/components/common/data/PropertyGrid";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { RelativeDate } from "@/components/common/RelativeDate";
import { formatDay } from "@/lib/dates";
import type { AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

interface TicketDetailsProps {
  ticket: Ticket;
  conversation?: SupportConversation;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onDelete: () => void;
  analysisStatus?: AnalysisStatus;
}

export function TicketDetails({
  ticket,
  conversation,
  isAnalyzing,
  onAnalyze,
  onDelete,
  analysisStatus,
}: TicketDetailsProps) {
  const messages = conversation?.messages ?? [];

  return (
    <div className="space-y-7">
      <PageSection
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={isAnalyzing || analysisStatus === "in_review"} onClick={onAnalyze}>
              <Brain className="mr-2 h-4 w-4" />
              {isAnalyzing
                ? "Analisando..."
                : analysisStatus === "completed"
                  ? "Executar nova análise"
                  : "Analisar com IA"}
            </Button>

            <Button variant="ghost" size="icon" aria-label="Excluir atendimento" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScanSearch className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Atendimento #{ticket.id}
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{ticket.title}</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {analysisStatus === "in_review"
                ? "A análise está em revisão humana. Valide as evidências e decida sobre cada oportunidade."
                : "Leia o atendimento antes de pedir a análise. Ele veio do suporte e não se edita aqui."}
            </p>
          </div>
        </div>

        <PropertyGrid
          className="mt-7"
          columns={3}
          items={[
            {
              label: "Empresa",
              value: (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{ticket.company || "Não informada"}</span>
                </div>
              ),
            },
            {
              label: "Solução",
              value: (
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <span>{ticket.solution || "Não informada"}</span>
                </div>
              ),
            },
            {
              label: "Data",
              value: (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{ticket.date ? formatDay(ticket.date) : "Não informada"}</span>
                </div>
              ),
            },
          ]}
        />
      </PageSection>

      <PageSection
        title="Evidências do atendimento"
        description="Registro que sustenta a revisão técnica e é enviado à IA junto com o atendimento."
      >
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            Este atendimento veio sem a conversa, e sem ela a análise fica limitada ao título e à
            solução. Quem entra pela caixa do suporte traz o fio junto; o que veio por arquivo, não.
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              /*
                O papel é contrato; adivinhar pelo nome errava com agente chamado
                de outra coisa, que é a maioria deles.
              */
              const isSupport = message.role === "suporte";

              return (
                <div key={message.id} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}>
                  <article
                    className={`max-w-[85%] rounded-2xl border px-5 py-4 ${
                      isSupport ? "border-primary/15 bg-primary/5" : "border-border/70 bg-muted/20"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-6">
                      <span className="text-sm font-semibold">{message.author}</span>
                      <span className="text-xs text-muted-foreground">
                        <RelativeDate value={message.createdAt} />
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>
    </div>
  );
}
