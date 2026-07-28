import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSearch,
  FolderKanban,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";

const priorities = [
  {
    title: "Atualizar o guia de autenticação",
    detail: "O procedimento aplicado pelo suporte ainda não está documentado.",
    status: "Alta prioridade",
    variant: "danger" as const,
  },
  {
    title: "Revisar permissões do Workflow",
    detail: "3 atendimentos recentes indicam uma lacuna de cobertura.",
    status: "Em revisão",
    variant: "warning" as const,
  },
  {
    title: "Publicar FAQ de instalação",
    detail: "A recomendação já foi aprovada e está pronta para curadoria.",
    status: "Pronto para ação",
    variant: "info" as const,
  },
];

const activity = [
  ["Análise concluída", "Workflow · Atendimento #45812", "há 12 min"],
  ["Recomendação aprovada", "Novo FAQ de permissões", "há 1 h"],
  ["Base atualizada", "Visus Collab · versão 2.4", "ontem"],
];

export function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        overline="Centro de Inteligência"
        title="A Base pede atenção em 3 pontos"
        description="A IA consolidou os sinais mais relevantes dos atendimentos recentes para orientar a próxima decisão."
        actions={
          <Button size="lg" render={<Link href="/analysis" />}>
            <Sparkles className="mr-2 h-4 w-4" />
            Iniciar análise
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <div className="rounded-2xl bg-foreground px-6 py-7 text-background shadow-sm sm:px-8 sm:py-8">
          <div className="flex items-center gap-2 text-sm font-medium text-background/70">
            <Brain className="h-4 w-4 text-primary" />
            Leitura da IA · últimas 24 horas
          </div>

          <h2 className="mt-5 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
            A cobertura está estável, mas decisões recentes do suporte precisam virar conhecimento reutilizável.
          </h2>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="secondary" render={<Link href="/improvement-plan" />}>
              Revisar prioridades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="text-background hover:bg-background/10 hover:text-background"
              render={<Link href="/library" />}
            >
              Abrir Biblioteca
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <CircleAlert className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-medium text-muted-foreground">Próxima melhor ação</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Validar a recomendação de autenticação</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Maior impacto estimado entre as oportunidades abertas.</p>
          </div>
          <Link href="/analysis" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Abrir análise
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cobertura da base" value="97%" description="+2,4% neste ciclo" />
        <MetricCard label="Oportunidades abertas" value="17" description="3 exigem atenção" />
        <MetricCard label="Análises concluídas" value="128" description="43 nos últimos 30 dias" />
        <MetricCard label="Prontas para publicação" value="12" description="Aguardando curadoria" />
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <PageSection
          title="O que precisa de atenção"
          description="Prioridades ordenadas por impacto na cobertura e recorrência dos atendimentos."
          actions={<Link href="/improvement-plan" className="text-sm font-medium text-primary hover:underline">Ver backlog</Link>}
          contentClassName="pt-2"
        >
          <div className="divide-y divide-border/70">
            {priorities.map((item, index) => (
              <div key={item.title} className="flex gap-4 py-5 first:pt-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  0{index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium tracking-tight">{item.title}</h3>
                    <StatusBadge variant={item.variant}>{item.status}</StatusBadge>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          title="Continue de onde parou"
          description="Uma análise em andamento no projeto atual."
        >
          <div className="rounded-xl bg-muted/55 p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              Última atividade · ontem
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">Workflow KB — Atendimento #45812</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">A análise identificou cobertura parcial e duas recomendações para revisão.</p>
            <Button className="mt-5" variant="outline" render={<Link href="/analysis" />}>
              Retomar análise
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </PageSection>
      </div>

      <div className="grid gap-10 xl:grid-cols-2">
        <PageSection title="Atividade recente" contentClassName="pt-2">
          <div className="divide-y divide-border/70">
            {activity.map(([title, detail, time]) => (
              <div key={title} className="flex items-start gap-3 py-4 first:pt-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection title="Fluxo de conhecimento" description="O caminho da evidência até a publicação.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [FileSearch, "Atendimentos", "128"],
              [Brain, "Analisados", "43"],
              [CheckCircle2, "Em curadoria", "17"],
              [BookOpen, "Publicados", "12"],
            ].map(([Icon, label, value]) => {
              const StepIcon = Icon as typeof FileSearch;
              return (
                <div key={label as string} className="rounded-xl bg-muted/55 p-4">
                  <StepIcon className="h-4 w-4 text-primary" />
                  <p className="mt-5 text-2xl font-semibold tracking-tight">{value as string}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label as string}</p>
                </div>
              );
            })}
          </div>
        </PageSection>
      </div>

      <div className="flex items-center gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground">
        <FolderKanban className="h-4 w-4" />
        Os insights exibidos estão vinculados ao projeto atual.
      </div>
    </div>
  );
}
