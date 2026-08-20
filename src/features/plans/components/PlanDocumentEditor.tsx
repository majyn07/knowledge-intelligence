"use client";

import { useEffect, useState } from "react";

import { MarkdownField } from "@/components/common/markdown/MarkdownField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { PlanDocument } from "../types/PlanWorkspace";

/** Seções escritas por quem conduz. Evidências, decisões e referências ficam
 *  de fora: são o registro do que a revisão humana decidiu, não texto livre. */
const EDITABLE_SECTIONS = [
  { key: "executiveSummary", label: "Resumo executivo", rows: 4, hint: "O que muda e por que vale a pena." },
  { key: "context", label: "Contexto", rows: 4, hint: "O que levou a esta melhoria." },
  { key: "problem", label: "Problema", rows: 4, hint: "O que quebra hoje, do ponto de vista de quem procura ajuda." },
  { key: "diagnosis", label: "Diagnóstico", rows: 4, hint: "A leitura técnica da causa." },
  { key: "proposal", label: "Proposta", rows: 8, hint: "Como o conteúdo deve ficar." },
  { key: "notes", label: "Observações", rows: 4, hint: "Ressalvas, dependências, combinados." },
] as const;

type EditableKey = (typeof EDITABLE_SECTIONS)[number]["key"];

interface PlanDocumentEditorProps {
  open: boolean;
  document: PlanDocument;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: Partial<PlanDocument>) => void;
}

export function PlanDocumentEditor({ open, document, onOpenChange, onSave }: PlanDocumentEditorProps) {
  const [draft, setDraft] = useState<Record<EditableKey, string>>({
    executiveSummary: "",
    context: "",
    problem: "",
    diagnosis: "",
    proposal: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;

    setDraft({
      executiveSummary: document.executiveSummary,
      context: document.context,
      problem: document.problem,
      diagnosis: document.diagnosis,
      proposal: document.proposal,
      notes: document.notes,
    });
  }, [document, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>
            As seções escritas por quem conduz o plano. Evidências e decisões vêm da revisão humana
            e não são editadas aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {EDITABLE_SECTIONS.map((section) => (
            <MarkdownField
              key={section.key}
              id={`plan-${section.key}`}
              label={section.label}
              hint={section.hint}
              rows={section.rows}
              value={draft[section.key]}
              onChange={(value) => setDraft((current) => ({ ...current, [section.key]: value }))}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Salvar documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
