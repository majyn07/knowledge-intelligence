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

export function TicketDetails({
  ticket,
  isAnalyzing,
  onAnalyze,
  onSave,
  onDelete,
}: TicketDetailsProps) {
  const [isEditing, setIsEditing] =
    useState(false);

  const conversation =
    conversations[ticket.id] ?? [];

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
    <main className="flex-1 rounded-xl border bg-card">
      <div className="flex items-start justify-between border-b p-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {ticket.title}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
            <div>
              <strong>Solução:</strong>{" "}
              {ticket.solution}
            </div>

            <div>
              <strong>Ticket:</strong> #
              {ticket.id}
            </div>

            <div>
              <strong>Empresa:</strong>{" "}
              {ticket.company}
            </div>

            <div>
              <strong>Data:</strong>{" "}
              {ticket.date}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
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

          <Button
            disabled={isAnalyzing}
            onClick={onAnalyze}
          >
            {isAnalyzing
              ? "Analisando..."
              : "Analisar Atendimento"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-lg font-semibold">
          Conversa
        </h2>

        <div className="mt-4 space-y-4">
          {conversation.map(
            (message, index) => (
              <div
                key={index}
                className="rounded-lg border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium">
                    {message.author}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {message.date}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.message}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}