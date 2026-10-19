"use client";

import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";

import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { contar } from "@/lib/plural";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { useCitacoes } from "../hooks/useCitacoes";

/** Quantos atendimentos aparecem por nome. Acima disso, a contagem basta. */
const LISTADOS = 5;

/**
 * Em quantos atendimentos o suporte respondeu com este artigo.
 *
 * É medição, não estimativa: o link está na resposta que o cliente recebeu. E
 * vale nos dois sentidos — o artigo que resolve trinta atendimentos merece
 * cuidado antes de qualquer mudança, e o publicado que ninguém cita é candidato
 * a revisão (não a exclusão: pode ser lido no portal sem passar pelo suporte).
 */
export function ArticleCitations({ article }: { article: KnowledgeArticle }) {
  const citacoes = useCitacoes();
  const { tickets } = useTickets();

  if (!citacoes || article.status !== "published") return null;

  const ids = citacoes.porArtigo.get(article.id) ?? [];
  const porId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const listados = ids.map((id) => porId.get(id)).filter((t) => t !== undefined).slice(0, LISTADOS);

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">
            {ids.length === 0
              ? "Nenhuma resposta do suporte cita este artigo"
              : `O suporte respondeu ${contar(ids.length, "atendimento")} com este artigo`}
          </p>

          <p className="text-xs leading-5 text-muted-foreground">
            {ids.length === 0
              ? "Contado nos links que o suporte manda nas respostas, fora da assinatura. Não citar não quer dizer que ninguém lê: o portal é aberto."
              : "Contado nos links que o suporte manda nas respostas, fora da assinatura. É o artigo resolvendo caso de verdade."}
          </p>

          {listados.length > 0 && (
            <ul className="space-y-1 text-sm">
              {listados.map((ticket) => (
                <li key={ticket.id} className="truncate">
                  <Link href={`/analysis?ticket=${ticket.id}`} className="text-primary hover:underline">
                    {ticket.title}
                  </Link>
                </li>
              ))}

              {ids.length > listados.length && (
                <li className="text-xs text-muted-foreground">
                  e mais {contar(ids.length - listados.length, "atendimento")}.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
