import { CheckCircle2, Circle, ListTodo } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageSection } from "@/components/common/page/PageSection";
import type { PlanWorkspaceItem } from "../types/PlanWorkspace";

interface PlanDocumentProps {
  plan: PlanWorkspaceItem;
  onToggleTask: (taskId: string) => void;
}

export function PlanDocument({ plan, onToggleTask }: PlanDocumentProps) {
  const completedTasks = plan.tasks.filter((task) => task.completed).length;
  const sections = [
    ["Resumo executivo", plan.document.executiveSummary],
    ["Contexto", plan.document.context],
    ["Problema", plan.document.problem],
    ["Diagnóstico", plan.document.diagnosis],
    ["Proposta", plan.document.proposal],
    ["Observações", plan.document.notes],
  ];

  return <article className="min-w-0 rounded-xl border border-border/70 bg-card p-5 sm:p-8"><header className="border-b border-border/70 pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Documento de execução</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{plan.title}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Este documento reúne o diagnóstico, as decisões humanas e o trabalho necessário para transformar a oportunidade em conteúdo publicado.</p></header><div className="space-y-8 py-7"><Accordion defaultValue={["Resumo executivo", "Contexto", "Proposta"]}><div className="space-y-1">{sections.map(([title, content]) => <AccordionItem key={title} value={title}><AccordionTrigger className="py-4 text-base font-semibold no-underline hover:no-underline">{title}</AccordionTrigger><AccordionContent className="pb-4 text-sm leading-7 text-muted-foreground">{content}</AccordionContent></AccordionItem>)}</div></Accordion><PageSection title="Evidências" description="Sinais que justificam a decisão e orientam a execução."><ul className="space-y-3">{plan.document.evidence.map((item) => <li key={item} className="rounded-lg border-l-2 border-primary/35 bg-muted/20 px-4 py-3 text-sm leading-6">{item}</li>)}</ul></PageSection><PageSection title="Decisões tomadas" description="Registros da revisão humana que delimitaram esta melhoria."><ol className="space-y-3">{plan.document.decisions.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-6"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>{item}</li>)}</ol></PageSection><PageSection title="Plano de execução" description={`${completedTasks} de ${plan.tasks.length} atividades concluídas.`} actions={<ListTodo className="h-5 w-5 text-primary" />}><div className="space-y-2">{plan.tasks.map((task) => <button key={task.id} onClick={() => onToggleTask(task.id)} className="flex w-full items-start gap-3 rounded-lg border border-border/70 px-4 py-3 text-left transition-colors hover:bg-muted/35">{task.completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}<span className="min-w-0 flex-1"><span className={`block text-sm ${task.completed ? "text-muted-foreground line-through" : "font-medium"}`}>{task.label}</span><span className="mt-1 block text-xs text-muted-foreground">Responsável: {task.owner}</span></span></button>)}</div></PageSection><PageSection title="Critérios de aceite"><ul className="space-y-2">{plan.document.acceptanceCriteria.map((item) => <li key={item} className="flex gap-2 text-sm leading-6"><CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />{item}</li>)}</ul></PageSection><PageSection title="Referências"><div className="flex flex-wrap gap-2">{plan.document.references.map((reference) => <span key={reference} className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{reference}</span>)}</div></PageSection></div></article>;
}
