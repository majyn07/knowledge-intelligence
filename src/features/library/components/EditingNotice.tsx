"use client";

import { Users } from "lucide-react";

import type { Editor } from "../useEditingPresence";

/**
 * Aviso de que outra pessoa está com este artigo aberto.
 *
 * Aviso e não bloqueio: travar o registro transformaria uma aba esquecida
 * aberta na sexta num artigo inacessível até segunda, sem ninguém para
 * destravar, não há papéis no produto. O caso real é duas pessoas escrevendo
 * sem perceber, e saber já resolve.
 */
export function EditingNotice({ editors }: { editors: Editor[] }) {
  if (editors.length === 0) return null;

  const nomes = editors.map((editor) => editor.name);

  const quem =
    nomes.length === 1
      ? nomes[0]
      : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-[var(--ring)] bg-accent p-3 text-xs"
    >
      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

      <span>
        <strong>{quem}</strong> {nomes.length === 1 ? "está" : "estão"} com este artigo aberto
        agora. Nada trava, mas se as duas gravarem, a última gravação é a que fica.
      </span>
    </p>
  );
}
