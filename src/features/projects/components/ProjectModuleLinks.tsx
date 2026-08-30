import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpen, FileSearch, Sparkles } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";
import { concordar, contar } from "@/lib/plural";

interface ProjectModuleLinksProps {
  metrics: ProjectMetrics;
  onNavigate: (href: string) => void;
}

export function ProjectModuleLinks({ metrics, onNavigate }: ProjectModuleLinksProps) {
  const modules = [
    {
      icon: Sparkles,
      title: "Análises",
      href: "/analysis",
      summary: metrics.analysis.total > 0
        ? `${contar(metrics.analysis.total, "análise")} ${concordar(metrics.analysis.total, "registrada")}`
        : "Este projeto ainda não possui análises.",
    },
    {
      icon: FileSearch,
      title: "Planos de melhoria",
      href: "/improvement-plan",
      summary: metrics.plan.total > 0
        ? `${contar(metrics.plan.total, "plano")}, ${contar(metrics.plan.active, "ativo")}`
        : "Este projeto ainda não possui planos de melhoria.",
    },
    {
      icon: BookOpen,
      title: "Biblioteca",
      href: "/library",
      summary: metrics.article.total > 0
        ? `${contar(metrics.article.total, "conteúdo")} neste projeto`
        : "Este projeto ainda não possui conteúdo na Biblioteca.",
    },
    {
      icon: BarChart3,
      title: "Indicadores",
      href: "/indicators",
      summary: metrics.isEmpty
        ? "Sem dados suficientes para indicadores."
        : "Acompanhe a evolução do ciclo.",
    },
  ];

  return (
    <PageSection
      title="Módulos do projeto"
      description="Abrir qualquer módulo torna este o projeto ativo do workspace."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(({ icon: Icon, title, href, summary }) => (
          <Link
            key={title}
            href={href}
            onClick={() => onNavigate(href)}
            className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35 hover:bg-muted/25"
          >
            <span className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>

              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </span>

            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{summary}</span>
            </span>
          </Link>
        ))}
      </div>
    </PageSection>
  );
}
