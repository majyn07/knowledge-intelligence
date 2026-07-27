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
            Tem certeza que deseja excluir o conteúdo{" "}
            <strong>{itemTitle}</strong>?
            <br />
            <br />
            Esta ação não poderá ser desfeita.
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