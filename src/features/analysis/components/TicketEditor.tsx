"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Ticket } from "@/models/Ticket";

interface TicketEditorProps {
  ticket: Ticket;
  onSave: (ticket: Ticket) => void;
  onCancel: () => void;
}

export function TicketEditor({
  ticket,
  onSave,
  onCancel,
}: TicketEditorProps) {
  const [form, setForm] = useState(ticket);

  function updateField<K extends keyof Ticket>(
    field: K,
    value: Ticket[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ticket-title">Título</Label>
        <Input
          id="ticket-title"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ticket-solution">Solução</Label>
          <Input
            id="ticket-solution"
            value={form.solution}
            onChange={(event) =>
              updateField("solution", event.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticket-company">Empresa</Label>
          <Input
            id="ticket-company"
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
