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

interface ProjectDeleteDialogProps {
  open: boolean;
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ProjectDeleteDialog({
  open,
  projectName,
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
            Tem certeza que deseja excluir o projeto{" "}
            <strong>{projectName}</strong>?
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