"use client";

import { useState } from "react";

import type { Project } from "@/models/Project";

interface ProjectEditorProps {
  project: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
}

export function ProjectEditor({
  project,
  onSave,
  onCancel,
}: ProjectEditorProps) {
  const [form, setForm] = useState(project);

  function updateField<K extends keyof Project>(
    field: K,
    value: Project[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Nome
          </label>

          <input
            value={form.name}
            onChange={(e) =>
              updateField("name", e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Cliente
          </label>

          <input
            value={form.client}
            onChange={(e) =>
              updateField("client", e.target.value)
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Descrição
          </label>

          <textarea
            rows={4}
            value={form.description}
            onChange={(e) =>
              updateField(
                "description",
                e.target.value
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Status
          </label>

          <select
            value={form.status}
            onChange={(e) =>
              updateField(
                "status",
                e.target.value as Project["status"]
              )
            }
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="active">
              Em andamento
            </option>

            <option value="archived">
              Arquivado
            </option>
          </select>
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