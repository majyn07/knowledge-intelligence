"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

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
  const [isEditing, setIsEditing] =
    useState(false);

  const conversation: ConversationMessage[] =
    conversations[
      ticket.id as keyof typeof conversations
    ] ?? [];

  if (isEditing) {
    return (
      <main className="flex-1 rounded-xl border bg-card p-6">
        <TicketEditor
          ticket={ticket}
          onSave={(ticket) => {
            onSave(ticket);
            setIsEditing(false);
          }}
          onCancel={() =>
            setIsEditing(false)
          }
        />
      </main>
    );
  }

  return (
    <main className="flex-1 rounded-xl border bg-card overflow-hidden">
      <div className="border-b p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-5 flex-1">
            <h1 className="text-2xl font-semibold">
              {ticket.title}
            </h1>

            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
              <div>
                <span className="font-semibold">
                  Solução:
                </span>{" "}
                {ticket.solution}
              </div>

              <div>
                <span className="font-semibold">
                  Ticket:
                </span>{" "}
                #{ticket.id}
              </div>

              <div>
                <span className="font-semibold">
                  Empresa:
                </span>{" "}
                {ticket.company}
              </div>

              <div>
                <span className="font-semibold">
                  Data:
                </span>{" "}
                {ticket.date}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              disabled={isAnalyzing}
              onClick={onAnalyze}
            >
              {isAnalyzing
                ? "Analisando..."
                : "Analisar atendimento"}
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                setIsEditing(true)
              }
            >
              Editar
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                onDelete(ticket.id)
              }
            >
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h2 className="mb-5 text-lg font-semibold">
          Conversa
        </h2>

        <div className="space-y-4">
          {conversation.map(
            (
              message: ConversationMessage,
              index: number
            ) => {
              const isSupport =
                message.author
                  .toLowerCase()
                  .includes("suporte");

              return (
                <div
                  key={index}
                  className={`max-w-[92%] rounded-xl border px-5 py-4 ${
                    isSupport
                      ? "ml-auto bg-muted"
                      : "bg-purple-50 dark:bg-purple-950/20"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <strong>
                      {message.author}
                    </strong>

                    <span className="text-xs text-muted-foreground">
                      {message.date}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {message.message}
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>
    </main>
  );
}