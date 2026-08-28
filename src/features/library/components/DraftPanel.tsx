"use client";

import { FileEdit } from "lucide-react";

import { RelativeDate } from "@/components/common/RelativeDate";
import { AssigneeName } from "@/features/people/components/AssigneeName";
import { Button } from "@/components/ui/button";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { draftChanges, draftFieldLabel } from "../draft";

/**
 * A versão em preparo, ao lado da que está no ar.
 *
 * Existe para responder a pergunta que a pessoa faz ao abrir um artigo com
 * rascunho: o que mudou, e vale republicar? Por isso mostra **o que foi
 * tocado**. Comparação campo a campo, e não linha a linha. Diferença palavra
 * a palavra é outra ferramenta, e entra quando alguém precisar dela.
 */
export function DraftPanel({
  article,
  onPublish,
  onDiscard,
  onEdit,
}: {
  article: KnowledgeArticle;
  onPublish: () => void;
  onDiscard: () => void;
  onEdit: () => void;
}) {
  if (!article.draft) return null;

  const mudou = draftChanges(article);

  return (
    <section className="rounded-xl border border-[var(--ring)] bg-accent p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <FileEdit className="h-4 w-4" aria-hidden />
        Versão em preparo
      </h2>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        A versão publicada continua no ar e continua contando como cobertura documental. Esta é a
        próxima, e ninguém a vê fora daqui.
      </p>

      <p className="mt-3 text-xs">
        {mudou.length === 0 ? (
          /*
            Rascunho idêntico ao publicado acontece: alguém abriu, mexeu e
            desfez. Dizer isso evita republicar por engano achando que há
            mudança.
          */
          <span className="text-muted-foreground">
            Nada difere da versão publicada ainda.
          </span>
        ) : (
          <>
            Alterado: <strong>{mudou.map((campo) => draftFieldLabel[campo]).join(", ")}</strong>
          </>
        )}

        <span className="text-muted-foreground">
          {" · por "}
          <AssigneeName value={article.draft.author} fallback="alguém" />
          {" · "}
          <RelativeDate value={article.draft.updatedAt} />
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onPublish} disabled={mudou.length === 0}>
          Publicar esta versão
        </Button>

        <Button size="sm" variant="outline" onClick={onEdit}>
          Continuar editando
        </Button>

        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Descartar rascunho
        </Button>
      </div>
    </section>
  );
}
