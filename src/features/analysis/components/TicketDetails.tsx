"use client";

import { useState } from "react";
import { Brain, CalendarDays, Building2, Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";

import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { PropertyGrid } from "@/components/common/data/PropertyGrid";

import { conversations } from "../mock/conversations";
import { TicketEditor } from "./TicketEditor";

import type { Ticket } from "@/models/Ticket";

interface TicketDetailsProps {
  ticket: Ticket;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSave: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
}

type ConversationMessage =
  (typeof conversations)[keyof typeof conversations][number];

export function TicketDetails({
  ticket,
  isAnalyzing,
  onAnalyze,
  onSave,
  onDelete,
}: TicketDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const conversation: ConversationMessage[] =
    conversations[
      ticket.id as keyof typeof conversations
    ] ?? [];

  if (isEditing) {
    return (
      <PageSection>
        <TicketEditor
          ticket={ticket}
          onSave={(ticket) => {
            onSave(ticket);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </PageSection>
    );
  }

  return (
    <div className="space-y-7">
      <PageSection
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              size="default"
              disabled={isAnalyzing}
              onClick={onAnalyze}
            >
              <Brain className="mr-2 h-4 w-4" />
              {isAnalyzing
                ? "Analisando..."
                : "Analisar com IA"}
            </Button>

            <Button
              size="default"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>

            <Button
              size="default"
              variant="destructive"
              onClick={() => onDelete(ticket.id)}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <PageHeader
          icon={<Brain className="h-7 w-7" />}
          overline={`Ticket #${ticket.id}`}
          title={ticket.title}
          description="Revise o atendimento antes de iniciar a análise por Inteligência Artificial."
        />

        <PropertyGrid
          className="mt-7"
          columns={3}
          items={[
            {
              label: "Empresa",
              value: (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{ticket.company}</span>
                </div>
              ),
            },
            {
              label: "Solução",
              value: (
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <span>{ticket.solution}</span>
                </div>
              ),
            },
            {
              label: "Data",
              value: (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>{ticket.date}</span>
                </div>
              ),
            },
          ]}
        />
      </PageSection>

      <PageSection
        title="Conversa"
        description="Histórico completo do atendimento entre cliente e equipe de suporte."
      >
        <div className="space-y-4">
          {conversation.map((message, index) => {
            const isSupport =
              message.author
                .toLowerCase()
                .includes("suporte");

            return (
              <div
                key={index}
                className={`flex ${
                  isSupport
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <article
                  className={`max-w-[85%] rounded-2xl border px-6 py-5 shadow-sm transition-all ${
                    isSupport
                    ? "border-primary/15 bg-primary/5"
                    : "border-border/70 bg-muted/20"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-6">
                    <span className="text-sm font-semibold">
                      {message.author}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {message.date}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-[15px] leading-7">
                    {message.message}
                  </p>
                </article>
              </div>
            );
          })}
        </div>
      </PageSection>
    </div>
  );
}
