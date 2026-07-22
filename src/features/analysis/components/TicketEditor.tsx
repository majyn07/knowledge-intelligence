"use client";

import { useState } from "react";

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
    <div className="rounded-xl border bg-card p-6">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Título
          </label>

          <input
            value={form.title}
            onChange={(e) =>
              updateField("title", e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Solução
            </label>

            <input
              value={form.solution}
              onChange={(e) =>
                updateField(
                  "solution",
                  e.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Empresa
            </label>

            <input
              value={form.company}
              onChange={(e) =>
                updateField(
                  "company",
                  e.target.value
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>

          <button
            onClick={() => onSave(form)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}