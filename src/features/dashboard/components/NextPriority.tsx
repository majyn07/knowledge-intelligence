import Link from "next/link";
import { ArrowRight, ClipboardCheck, Sparkles } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { analysisStatusLabel } from "@/models/KnowledgeLifecycle";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface NextPriorityProps {
  analyses: AnalysisRecord[];
}

function getPriority(analysis: AnalysisRecord) {
  const documentationStatus = analysis.result.classification.documentationStatus;

  if (documentationStatus === "missing" || documentationStatus === "outdated") {
    return { label: "Alta prioridade", variant: "danger" as const };
  }

  if (documentationStatus === "partial") {
    return { label: "Prioridade média", variant: "warning" as const };
  }

  return { label: "Prioridade normal", variant: "info" as const };
}

export function NextPriority({ analyses }: NextPriorityProps) {
  const pendingAnalysis = analyses.find((analysis) => analysis.status !== "completed");

  return (
    <PageSection
      title="Próxima prioridade"
      description="O item que precisa da sua atenção para manter o ciclo de conhecimento em movimento."
      contentClassName="pt-5"
    >
      {pendingAnalysis ? (
        <Card className="border-primary/25 bg-primary/[0.035] shadow-sm">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Atendimento #{pendingAnalysis.ticketId}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {pendingAnalysis.result.identification.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Revise as oportunidades identificadas pela IA e decida quais devem seguir para a fila de melhorias.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <StatusBadge variant="info">
                      {analysisStatusLabel[pendingAnalysis.status]}
                    </StatusBadge>
                    <StatusBadge variant={getPriority(pendingAnalysis).variant}>
                      {getPriority(pendingAnalysis).label}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <Button className="shrink-0" render={<Link href="/analysis" />} nativeButton={false}>
                Continuar revisão
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center sm:px-8">
          <BrandEmptyState
            title="Nenhuma análise pendente"
            description="A equipe concluiu as revisões em andamento. Inicie uma nova análise para identificar a próxima oportunidade de evolução."
          />
          <Button className="mt-6" render={<Link href="/analysis" />} nativeButton={false}>
            <Sparkles className="mr-2 h-4 w-4" />
            Iniciar nova análise
          </Button>
        </div>
      )}
    </PageSection>
  );
}
