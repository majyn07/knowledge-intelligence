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
  /** Título do artigo, quando é um só. */
  itemTitle: string;
  /** Quantos vão junto. Ausente ou 1 é a exclusão de um registro. */
  count?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmação da exclusão, para um registro ou para muitos.
 *
 * O texto muda de número porque um diálogo que diz "3 artigo(s) vai para a
 * lixeira e pode ser restaurado" foi escrito para um caso e usado noutro, e
 * quem lê rápido uma frase que não concorda desconfia da tela inteira, não só
 * da frase.
 *
 * Em lote a confirmação também diz que há desfazer. É a existência dele que
 * permitiu a ação existir, e saber disso antes muda a decisão.
 */
export function LibraryDeleteDialog({
  open,
  itemTitle,
  count = 1,
  onCancel,
  onConfirm,
}: LibraryDeleteDialogProps) {
  const muitos = count > 1;

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
          <DialogTitle>{muitos ? `Excluir ${count} artigos` : "Excluir conteúdo"}</DialogTitle>

          <DialogDescription>
            {muitos ? (
              <>
                Os <strong>{count} artigos selecionados</strong> vão para a lixeira, em
                Configurações, e podem ser restaurados de lá. Enquanto estiverem lá, a análise
                deixa de considerá-los como cobertura documental. O aviso que aparece depois
                oferece desfazer os {count} de uma vez.
              </>
            ) : (
              <>
                <strong>{itemTitle}</strong> vai para a lixeira, em Configurações, e pode ser
                restaurado de lá. Enquanto estiver na lixeira, a análise deixa de considerá-lo
                como cobertura documental.
              </>
            )}
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
