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

interface LibraryDeleteDialogProps {
  open: boolean;
  itemTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LibraryDeleteDialog({
  open,
  itemTitle,
  onCancel,
  onConfirm,
}: LibraryDeleteDialogProps) {
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
            Excluir conteúdo
          </DialogTitle>

          <DialogDescription>
            <strong>{itemTitle}</strong> vai para a lixeira, em Configurações, e pode ser
            restaurado de lá. Enquanto estiver na lixeira, a análise deixa de considerá-lo
            como cobertura documental.
          </DialogDescription>
        </DialogHeader>

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