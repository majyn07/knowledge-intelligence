"use client";

import { Bot, Brain, Building2, CalendarDays, Headset, ScanSearch, Trash2, User } from "lucide-react";

import { PropertyGrid } from "@/components/common/data/PropertyGrid";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { RelativeDate } from "@/components/common/RelativeDate";
import { formatDay } from "@/lib/dates";
import type { AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type {
  SupportConversation,
  SupportConversationMessage,
} from "@/models/SupportConversation";
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

  /*
    Os dois vindos do registro cru. O modelo não tem campo para nenhum deles: o
    número do chamado é da HubSpot e o nome de quem abriu é dado do cliente, e
    guardar campo nosso para o que é espelho criaria duas respostas para a mesma
    pergunta.
  */
  const chamado =
    typeof ticket.raw?.hubspotTicketId === "string" ? ticket.raw.hubspotTicketId : "";

  const cliente =
    typeof ticket.raw?.contato === "object" && ticket.raw.contato !== null
      ? String((ticket.raw.contato as { nome?: unknown }).nome ?? "")
      : "";

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
            {/*
              O número da HubSpot vem primeiro, e o nosso identificador some.
              `hs-6952014856` é o id do fio de conversa e não acha nada na busca
              do CRM: quem lê esta tela vai procurar lá, e precisa do número que
              funciona lá.
            */}
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {chamado ? (
                <>
                  <span className="rounded-md bg-primary/12 px-2 py-1 font-mono text-[11px] tracking-normal text-primary">
                    #{chamado}
                  </span>
                  <span className="tracking-[0.18em]">na HubSpot</span>
                </>
              ) : (
                <span>Atendimento sem número na HubSpot</span>
              )}

              {cliente && (
                <span className="flex items-center gap-1 tracking-normal normal-case">
                  <User className="h-3.5 w-3.5" />
                  {cliente}
                </span>
              )}
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

      {ticket.solution.trim() !== "" && (
        <PageSection
          title="Solução registrada"
          description="A última resposta de quem atendeu. É o que mais se aproxima de uma solução: a conversa não tem campo para ela."
        >
          {/*
            Bloco próprio, e não célula de grade. A solução vinda do suporte é um
            e-mail inteiro, com centenas de caracteres e endereços longos sem
            espaço: numa célula de três colunas ela estoura a caixa.
          */}
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border/70 bg-muted/20 px-5 py-4 text-sm leading-7">
            {ticket.solution}
          </p>
        </PageSection>
      )}

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
          <div className="space-y-3">
            {messages.map((message) => (
              <Fala key={message.id} message={message} />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}

/**
 * Uma fala do fio.
 *
 * São três vozes e não duas, e essa era a confusão: o robô de triagem caía do
 * mesmo lado do cliente, com a mesma cara, e quem lia o fio não distinguia
 * quem tinha respondido o quê. O cliente e o suporte ficam em lados opostos,
 * com cor própria; automação e sistema ficam no meio, apagados e estreitos,
 * porque são contexto e não conversa.
 */
function Fala({ message }: { message: SupportConversationMessage }) {
  const rotuloDoPapel: Record<SupportConversationMessage["role"], string> = {
    cliente: "Cliente",
    suporte: "Suporte",
    automacao: "Automação",
    sistema: "Sistema",
  };

  if (message.role === "automacao" || message.role === "sistema") {
    return (
      <div className="flex justify-center">
        <article className="max-w-[70%] rounded-xl border border-dashed border-border/60 bg-muted/25 px-4 py-2.5">
          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Bot className="h-3 w-3" />
            {rotuloDoPapel[message.role]}
            <span className="normal-case tracking-normal">
              · <RelativeDate value={message.createdAt} />
            </span>
          </div>

          <p className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
            {message.body}
          </p>
        </article>
      </div>
    );
  }

  const doSuporte = message.role === "suporte";

  return (
    <div className={`flex ${doSuporte ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[82%] min-w-0 rounded-2xl border px-5 py-4 ${
          doSuporte
            ? "border-primary/35 bg-primary/12"
            : "border-border bg-card shadow-sm"
        }`}
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {doSuporte ? <Headset className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
            {message.author}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                doSuporte ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {rotuloDoPapel[message.role]}
            </span>
          </span>

          <span className="text-xs text-muted-foreground">
            {message.channel && <>{message.channel} · </>}
            <RelativeDate value={message.createdAt} />
          </span>
        </div>

        {/*
          `break-words` porque a mensagem vinda de e-mail traz endereço e link
          sem espaço nenhum, e sem isso a caixa estoura para fora da coluna.
        */}
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
      </article>
    </div>
  );
}
