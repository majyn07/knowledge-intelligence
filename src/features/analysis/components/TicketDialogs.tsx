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
import { OrphanWarning } from "@/components/common/OrphanWarning";
import type { Orphans } from "@/models/Trash";

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
  orphans,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  ticketTitle: string;
  /** O que passaria a apontar para o vazio. */
  orphans: Orphans;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir atendimento</DialogTitle>

          <DialogDescription>
            <strong>{ticketTitle}</strong> vai para a lixeira, em Configurações, com o registro da
            conversa. Pode ser restaurado de lá.
          </DialogDescription>
        </DialogHeader>

        <OrphanWarning orphans={orphans} />

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
