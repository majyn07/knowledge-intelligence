"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TicketDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function TicketDeleteDialog({
  open,
  ticketTitle,
  hasAnalysis,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  ticketTitle: string;
  hasAnalysis: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir atendimento</DialogTitle>

          <DialogDescription>
            Tem certeza que deseja excluir <strong>{ticketTitle}</strong>? O registro da conversa
            será excluído junto.
            {hasAnalysis && (
              <>
                <br />
                <br />
                Este atendimento já foi analisado. A análise e o que dela derivou continuam
                existindo, mas passam a apontar para um atendimento que não existe mais.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>

          <Button variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
