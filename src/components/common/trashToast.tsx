"use client";

import { toast } from "sonner";

/**
 * O aviso de exclusão, com desfazer.
 *
 * A lixeira é a rede durável; isto é a rede imediata. São necessidades
 * diferentes: quem clicou errado percebe no mesmo segundo e não deveria
 * precisar abrir outra tela para consertar — e quem só descobre semanas depois
 * precisa que o registro ainda exista.
 *
 * O texto diz onde a coisa foi parar. "Excluído" sozinho faz a pessoa supor
 * que acabou, e ela não procura o que ainda está lá.
 */
export function trashToast(input: {
  label: string;
  subject: string;
  onUndo: () => void;
}) {
  toast.success(`${input.label} movido para a lixeira.`, {
    description: input.subject,
    action: {
      label: "Desfazer",
      onClick: input.onUndo,
    },
  });
}
