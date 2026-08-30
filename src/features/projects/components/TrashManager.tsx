"use client";

import { useMemo, useState } from "react";
import { BookOpen, FolderKanban, MessageSquare, RotateCcw, Trash2 } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { RelativeDate } from "@/components/common/RelativeDate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/features/auth/providers/PermissionsProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useProject } from "@/providers/ProjectProvider";

interface Item {
  kind: "project" | "ticket" | "article";
  id: string;
  label: string;
  deletedAt: string;
  restore: () => void;
  purge: () => void;
}

const kindLabel: Record<Item["kind"], string> = {
  project: "Projeto",
  ticket: "Atendimento",
  article: "Artigo",
};

/**
 * O que foi excluído, e ainda existe.
 *
 * Sem prazo de expurgo automático, de propósito: apagar trabalho sozinho, num
 * horário que ninguém escolheu, é o mesmo problema que a exclusão direta tem.
 * Esvaziar é ato de alguém, e a tela diz o que vai levar antes.
 */
export function TrashManager() {
  const { deletedProjects, restoreProject, purgeProject } = useProject();
  const { pode } = usePermissions();
  const { deletedTickets, restoreTicket, purgeTicket } = useTickets();
  const { deletedItems, restoreItem, purgeItem } = useLibrary();

  const [confirming, setConfirming] = useState<Item | null>(null);
  const [isEmptying, setEmptying] = useState(false);

  const items = useMemo<Item[]>(() => {
    const todos: Item[] = [
      ...deletedProjects.map((project) => ({
        kind: "project" as const,
        id: project.id,
        label: project.name,
        deletedAt: project.deletedAt ?? "",
        restore: () => restoreProject(project.id),
        purge: () => purgeProject(project.id),
      })),
      ...deletedTickets.map((ticket) => ({
        kind: "ticket" as const,
        id: ticket.id,
        label: ticket.title,
        deletedAt: ticket.deletedAt ?? "",
        restore: () => restoreTicket(ticket.id),
        purge: () => purgeTicket(ticket.id),
      })),
      ...deletedItems.map((article) => ({
        kind: "article" as const,
        id: article.id,
        label: article.title,
        deletedAt: article.deletedAt ?? "",
        restore: () => restoreItem(article.id),
        purge: () => purgeItem(article.id),
      })),
    ];

    // Mais recente primeiro: quem abre a lixeira quase sempre quer desfazer o
    // que acabou de fazer.
    return todos.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }, [
    deletedItems,
    deletedProjects,
    deletedTickets,
    purgeItem,
    purgeProject,
    purgeTicket,
    restoreItem,
    restoreProject,
    restoreTicket,
  ]);

  const emptyAll = () => {
    for (const item of items) item.purge();
    setEmptying(false);
  };

  return (
    <PageSection
      title="Lixeira"
      description="O que foi excluído continua aqui até alguém esvaziar. Não há prazo automático: apagar trabalho sozinho é o mesmo problema que excluir sem rede."
      actions={
        items.length > 0 &&
        /*
          Esconder é não oferecer o que vai ser recusado, e não é a trava: a
          escrita continua indo pela política do banco, que é a mesma para toda
          a equipe. Quem quer saber por que o botão sumiu encontra a regra em
          Configurações, escrita.
        */
        pode("esvaziarLixeira") && (
          <Button size="sm" variant="outline" onClick={() => setEmptying(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Esvaziar lixeira
          </Button>
        )
      }
    >
      {items.length === 0 ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          A lixeira está vazia.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {item.kind === "project" ? (
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : item.kind === "ticket" ? (
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}

                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {item.label || "Sem título"}
                  </span>

                  <span className="block truncate text-xs text-muted-foreground">
                    {kindLabel[item.kind]} · excluído <RelativeDate value={item.deletedAt} />
                  </span>
                </span>
              </span>

              <span className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="outline" onClick={item.restore}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Restaurar
                </Button>

                <Button size="sm" variant="ghost" onClick={() => setConfirming(item)}>
                  Excluir de vez
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/*
        A exclusão definitiva é a única do produto sem volta, e por isso é a
        única que exige confirmação nomeando o registro.
      */}
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir de vez?</DialogTitle>

            <DialogDescription>
              <strong>{confirming?.label || "Este registro"}</strong> sai do banco e não volta. É a
              única ação do produto sem desfazer.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                confirming?.purge();
                setConfirming(null);
              }}
            >
              Excluir de vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmptying} onOpenChange={setEmptying}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esvaziar a lixeira?</DialogTitle>

            <DialogDescription>
              {items.length} registro(s) saem do banco e não voltam.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptying(false)}>
              Cancelar
            </Button>

            <Button variant="destructive" onClick={emptyAll}>
              Esvaziar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageSection>
  );
}
