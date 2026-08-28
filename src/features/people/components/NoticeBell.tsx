"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RelativeDate } from "@/components/common/RelativeDate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useNotices } from "../hooks/useNotices";
import { noticeReasonLabel } from "../notices";

/**
 * A central de avisos.
 *
 * A menção existia e não chegava a lugar nenhum: quem era mencionado só
 * descobria abrindo a tela certa por acaso. Como não há e-mail, e não vai
 * haver enquanto o SMTP não existir,, o produto conta por si.
 *
 * O sino só ganha número quando há o que ler. Um contador que mostra zero
 * ocupa atenção para dizer que não há nada.
 *
 * Abrir marca como visto, e não cada item: a central existe para ser lida de
 * uma vez, e pedir um clique por aviso transformaria a leitura em faxina.
 */
export function NoticeBell() {
  const { notices, unread, markSeen } = useNotices();
  const [open, setOpen] = useState(false);

  function abrir(next: boolean) {
    setOpen(next);

    // Ao fechar, e não ao abrir: quem abre ainda não leu, e marcar antes
    // apagaria o destaque do que a pessoa está justamente olhando.
    if (!next && unread > 0) markSeen();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unread > 0 ? `Avisos, ${unread} não lido(s)` : "Avisos"}
        onClick={() => abrir(true)}
      >
        <Bell className="h-4 w-4" />

        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={abrir}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Avisos</DialogTitle>

            <DialogDescription>
              O que mudou no que você acompanha, no que está atribuído a você e onde você foi
              mencionado.
            </DialogDescription>
          </DialogHeader>

          {notices.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nada por aqui. Acompanhe um plano ou um artigo para saber quando ele se mover: o
              acompanhamento é sobre interesse, e não transfere responsabilidade para você.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto py-2">
              {notices.map((notice) => {
                const conteudo = (
                  <>
                    <span className="flex items-center gap-2">
                      {notice.unread && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                      )}

                      <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                        {noticeReasonLabel(notice.reason)}
                      </span>

                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        <RelativeDate value={notice.at} />
                      </span>
                    </span>

                    <span className="mt-1 block truncate text-sm font-medium">
                      {notice.subjectLabel}
                    </span>

                    {notice.text && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {notice.text}
                      </span>
                    )}
                  </>
                );

                return (
                  <li key={notice.id}>
                    {notice.href ? (
                      <Link
                        href={notice.href}
                        onClick={() => abrir(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-muted/60"
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      /*
                        Oportunidade e análise não têm endereço próprio. O aviso
                        continua valendo; levar para lugar nenhum é melhor que
                        levar para o lugar errado.
                      */
                      <div className="block rounded-lg px-3 py-2">{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
