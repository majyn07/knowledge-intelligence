"use client";

import { AlertTriangle, Check, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface PublishCheck {
  label: string;
  /** Verdadeiro quando o item está pronto. */
  ok: boolean;
  /** Quando falso, explica o que falta — sem impedir a publicação. */
  hint?: string;
}

interface PublishConfirmDialogProps {
  open: boolean;
  title: string;
  subject: string;
  /** O que muda no produto depois de publicar. */
  consequence: string;
  checks: PublishCheck[];
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Publicar é o passo que torna o trabalho visível. A confirmação existe para
 * que seja um ato deliberado: mostra o que ainda está incompleto e o efeito da
 * publicação, mas não bloqueia — a equipe decide.
 */
export function PublishConfirmDialog({
  open,
  title,
  subject,
  consequence,
  checks,
  confirmLabel = "Publicar",
  onCancel,
  onConfirm,
}: PublishConfirmDialogProps) {
  const pending = checks.filter((check) => !check.ok);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <strong>{subject}</strong>
            <br />
            {consequence}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2.5 text-sm">
              {check.ok ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}

              <span className="min-w-0">
                <span className={check.ok ? "" : "font-medium"}>{check.label}</span>
                {!check.ok && check.hint && (
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {check.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {pending.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border-l-2 border-amber-500 bg-amber-500/5 px-3 py-2.5 text-xs leading-5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            {pending.length === 1
              ? "Um item continua incompleto. Você pode publicar mesmo assim."
              : `${pending.length} itens continuam incompletos. Você pode publicar mesmo assim.`}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Voltar e ajustar
          </Button>

          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
