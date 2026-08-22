"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Filter } from "lucide-react";

import { PageHeader } from "@/components/common/page/PageHeader";
import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { useNow } from "@/hooks/useNow";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import {
  buildSurvey,
  findingKindLabel,
  surveySummary,
  type Finding,
  type FindingKind,
  type FindingSeverity,
} from "./survey";

const severityBadge: Record<FindingSeverity, "danger" | "warning" | "default"> = {
  alta: "danger",
  media: "warning",
  baixa: "default",
};

const severityLabel: Record<FindingSeverity, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/**
 * O levantamento.
 *
 * É a tela que substitui o trabalho manual que originou este produto: alguém
 * percorrendo o acervo para descobrir o que criar, atualizar ou revisar. Cada
 * linha diz **o que fazer**, **por que**, e leva para onde se faz — sem isso
 * seria mais um painel, e painel não tira trabalho de ninguém.
 *
 * A procedência aparece em cada achado. O que o produto calculou sobre os dados
 * reais não é apresentado como saída de modelo, e o que um modelo propôs vem
 * marcado — para a revisão saber onde olhar com mais atenção.
 */
export function SurveyWorkspace() {
  const { items: articles, isHydrated } = useLibrary();
  const { tickets } = useTickets();
  const { taxonomy } = useTaxonomy();
  const now = useNow();

  const [kind, setKind] = useState<FindingKind | "todos">("todos");

  /*
    O relógio entra depois da montagem — servidor e cliente têm horas
    diferentes, e "parado há 45 dias" divergiria na hidratação. Sem ele o
    levantamento ainda não pode ser calculado, e a tela espera.
  */
  const findings = useMemo(
    () => (now ? buildSurvey({ articles, tickets, taxonomy, now }) : []),
    [articles, tickets, taxonomy, now]
  );

  const summary = surveySummary(findings);

  const tipos = useMemo(() => {
    const contagem = new Map<FindingKind, number>();
    for (const finding of findings) {
      contagem.set(finding.kind, (contagem.get(finding.kind) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  }, [findings]);

  const visiveis = kind === "todos" ? findings : findings.filter((item) => item.kind === kind);

  return (
    <div className="w-full space-y-8">
      <PageHeader
        overline="Hub"
        title="Levantamento"
        description="O que o acervo está pedindo — apurado sobre os dados de agora, e não sobre uma foto guardada. Cada linha diz o que fazer, por que, e leva para onde se faz."
      />

      {!isHydrated || !now ? (
        <ListSkeleton />
      ) : findings.length === 0 ? (
        /*
          Nada a fazer é uma resposta legítima, e precisa parecer resposta — não
          tela quebrada. Inventar tarefa para preencher a lista destruiria a
          confiança que a lista existe para ter.
        */
        <div className="rounded-xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-primary" aria-hidden />

          <p className="mt-3 font-medium">Nada pendente no acervo</p>

          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Nenhuma seção descoberta, nenhum artigo sem classificação, nada parado e nenhum
            atendimento resolvido sem virar conhecimento.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card px-5 py-4">
            <div>
              <p className="text-2xl font-semibold tracking-tight">{summary.total}</p>
              <p className="text-xs text-muted-foreground">achados</p>
            </div>

            <div>
              <p className="text-2xl font-semibold tracking-tight text-destructive">
                {summary.alta}
              </p>
              <p className="text-xs text-muted-foreground">de alta</p>
            </div>

            {/*
              A procedência é dita no cabeçalho, e não só em cada linha: quem
              chega precisa saber, antes de ler a lista, que ela não é palpite
              de modelo.
            */}
            <p className="ml-auto max-w-sm text-xs text-muted-foreground">
              {summary.propostos === 0
                ? "Todos apurados dos dados do hub — nenhum veio de modelo de IA."
                : `${summary.calculados} apurados dos dados, ${summary.propostos} propostos por IA.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />

            <button
              type="button"
              aria-pressed={kind === "todos"}
              onClick={() => setKind("todos")}
              className={pill(kind === "todos")}
            >
              Tudo ({findings.length})
            </button>

            {tipos.map(([tipo, total]) => (
              <button
                key={tipo}
                type="button"
                aria-pressed={kind === tipo}
                onClick={() => setKind(tipo)}
                className={pill(kind === tipo)}
              >
                {findingKindLabel[tipo]} ({total})
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-2">
            {visiveis.map((finding) => (
              <FindingRow key={finding.id} finding={finding} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function pill(active: boolean) {
  return `rounded-full border px-3 py-1 text-xs transition-colors ${
    active
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border/70 text-muted-foreground hover:border-primary/30"
  }`;
}

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li>
      <Link
        href={finding.href}
        className="group flex flex-wrap items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <StatusBadge variant={severityBadge[finding.severity]}>
          {severityLabel[finding.severity]}
        </StatusBadge>

        <div className="min-w-0 flex-1">
          <p className="font-medium">{finding.action}</p>

          <p className="mt-0.5 truncate text-sm text-muted-foreground">{finding.subject}</p>

          {/*
            O "por que" é a diferença entre uma lista de tarefas e um
            levantamento: sem a evidência, quem lê não tem como discordar do
            achado — e discordar é parte da revisão humana.
          */}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {finding.why}{" "}
            <span className="opacity-70">
              · {finding.origin === "calculado" ? "apurado dos dados" : "proposto por IA"}
            </span>
          </p>
        </div>

        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </Link>
    </li>
  );
}
