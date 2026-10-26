"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";

import { RelativeDate } from "@/components/common/RelativeDate";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { contar } from "@/lib/plural";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

const LISTADOS = 5;

/**
 * De quais atendimentos este artigo nasceu.
 *
 * Aparece só quando há: artigo importado do portal não nasceu de atendimento
 * nosso, e dizer "nenhuma origem" em mil e oitocentos deles seria ruído. É o
 * "antes" que permite, um dia, medir se o assunto parou de chegar.
 */
export function ArticleOrigin({ article }: { article: KnowledgeArticle }) {
  const { tickets } = useTickets();
  const origem = article.origemAtendimentos;

  if (!origem) return null;

  const porId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const listados = origem.ticketIds
    .map((id) => porId.get(id))
    .filter((t) => t !== undefined)
    .slice(0, LISTADOS);

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">
            Escrito a partir de {contar(origem.ticketIds.length, "atendimento")}
            {origem.em && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · <RelativeDate value={origem.em} />
              </span>
            )}
          </p>

          {origem.termos.length > 0 && (
            <p className="text-xs leading-5 text-muted-foreground">
              Assunto quando nasceu: {origem.termos.slice(0, 8).join(", ")}.
            </p>
          )}

          {listados.length > 0 && (
            <ul className="space-y-1 text-sm">
              {listados.map((ticket) => (
                <li key={ticket.id} className="truncate">
                  <Link href={`/analysis?ticket=${ticket.id}`} className="text-primary hover:underline">
                    {ticket.title}
                  </Link>
                </li>
              ))}

              {origem.ticketIds.length > listados.length && (
                <li className="text-xs text-muted-foreground">
                  e mais {contar(origem.ticketIds.length - listados.length, "atendimento")}.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
