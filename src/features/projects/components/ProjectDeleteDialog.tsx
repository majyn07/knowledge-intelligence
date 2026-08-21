"use client";

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

interface ProjectDeleteDialogProps {
  open: boolean;
  projectName: string;
  /** O que passaria a apontar para o vazio. */
  orphans: Orphans;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ProjectDeleteDialog({
  open,
  projectName,
  orphans,
  onCancel,
  onConfirm,
}: ProjectDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Excluir projeto
          </DialogTitle>

          <DialogDescription>
            <strong>{projectName}</strong> vai para a lixeira, em Configurações,
            e pode ser restaurado de lá.
          </DialogDescription>
        </DialogHeader>

        <OrphanWarning orphans={orphans} />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>

          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}