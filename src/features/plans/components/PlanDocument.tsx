"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { PageSection } from "@/components/common/page/PageSection";
import { PersonSelect } from "@/features/people/components/PersonSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { usePlans } from "../providers/PlansProvider";
import { PlanDocumentEditor } from "./PlanDocumentEditor";
import { AssigneeName } from "@/features/people/components/AssigneeName";
import type { PlanWorkspaceItem } from "../types/PlanWorkspace";

interface PlanDocumentProps {
  plan: PlanWorkspaceItem;
  onCreateKnowledgeContent: () => void;
}

export function PlanDocument({ plan, onCreateKnowledgeContent }: PlanDocumentProps) {
  const { addTask, toggleTask, removeTask, updateDocument } = usePlans();
  const [taskLabel, setTaskLabel] = useState("");
  const [taskOwner, setTaskOwner] = useState(plan.owner);
  const [criterion, setCriterion] = useState("");
  const [isEditingDocument, setIsEditingDocument] = useState(false);

  const completedTasks = plan.tasks.filter((task) => task.completed).length;
  const sections: [string, string][] = [
    ["Resumo executivo", plan.document.executiveSummary],
    ["Contexto", plan.document.context],
    ["Problema", plan.document.problem],
    ["Diagnóstico", plan.document.diagnosis],
    ["Proposta", plan.document.proposal],
    ["Observações", plan.document.notes],
  ];

  function submitTask() {
    if (!taskLabel.trim()) return;
    addTask(plan.id, taskLabel, taskOwner);
    setTaskLabel("");
  }

  function submitCriterion() {
    if (!criterion.trim()) return;
    updateDocument(plan.id, {
      acceptanceCriteria: [...plan.document.acceptanceCriteria, criterion.trim()],
    });
    setCriterion("");
  }

  function removeCriterion(index: number) {
    updateDocument(plan.id, {
      acceptanceCriteria: plan.document.acceptanceCriteria.filter((_, position) => position !== index),
    });
  }

  return (
    <article className="min-w-0 rounded-xl border border-border/70 bg-card p-5 sm:p-8">
      <header className="border-b border-border/70 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Documento de execução
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{plan.title}</h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Reúne o diagnóstico, as decisões humanas e o trabalho necessário para transformar a
          oportunidade em conteúdo publicado.
        </p>

        <div className="mt-4">
          <Button size="sm" variant="outline" className="mr-2" onClick={() => setIsEditingDocument(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar documento
          </Button>

          <Button
            size="sm"
            variant={plan.source.articleId ? "outline" : "default"}
            onClick={onCreateKnowledgeContent}
            disabled={Boolean(plan.source.articleId)}
          >
            {plan.source.articleId ? "Conteúdo vinculado" : "Criar rascunho na Biblioteca"}
          </Button>
        </div>
      </header>

      <div className="space-y-8 py-7">
        <Accordion defaultValue={["Resumo executivo", "Contexto", "Proposta"]}>
          <div className="space-y-1">
            {sections.map(([title, content]) => (
              <AccordionItem key={title} value={title}>
                <AccordionTrigger className="py-4 text-base font-semibold no-underline hover:no-underline">
                  {title}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-7 text-muted-foreground">
                  {content ? <MarkdownContent content={content} /> : "Não preenchido."}
                </AccordionContent>
              </AccordionItem>
            ))}
          </div>
        </Accordion>

        <PageSection title="Evidências" description="Sinais que justificam a decisão e orientam a execução.">
          {plan.document.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma evidência registrada.</p>
          ) : (
            <ul className="space-y-3">
              {plan.document.evidence.map((item) => (
                <li key={item} className="rounded-lg border-l-2 border-primary/35 bg-muted/20 px-4 py-3 text-sm leading-6">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <PageSection title="Decisões tomadas" description="Registros da revisão humana que delimitaram esta melhoria.">
          <ol className="space-y-3">
            {plan.document.decisions.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </PageSection>

        <PageSection
          title="Plano de execução"
          description={`${completedTasks} de ${plan.tasks.length} atividade(s) concluída(s).`}
          actions={<ListTodo className="h-5 w-5 text-primary" />}
        >
          <div className="space-y-2">
            {plan.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-lg border border-border/70 px-4 py-3"
              >
                <button
                  type="button"
                  aria-label={task.completed ? `Reabrir ${task.label}` : `Concluir ${task.label}`}
                  onClick={() => toggleTask(plan.id, task.id)}
                  className="mt-0.5 shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${task.completed ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {task.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {task.owner ? (
                      <>Responsável: <AssigneeName value={task.owner} /></>
                    ) : (
                      "Sem responsável"
                    )}
                  </span>
                </span>

                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remover ${task.label}`}
                  onClick={() => removeTask(plan.id, task.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {plan.tasks.length === 0 && (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma atividade definida. Comece pelo que precisa acontecer para publicar.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
            <div className="space-y-2">
              <label htmlFor="task-label" className="text-xs font-medium text-muted-foreground">
                Nova atividade
              </label>
              <Input
                id="task-label"
                value={taskLabel}
                placeholder="Ex.: Validar o passo a passo com o Suporte"
                onChange={(event) => setTaskLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitTask();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="task-owner" className="text-xs font-medium text-muted-foreground">
                Responsável
              </label>
              <PersonSelect id="task-owner" value={taskOwner} onChange={setTaskOwner} placeholder="Sem responsável" />
            </div>

            <Button onClick={submitTask} disabled={!taskLabel.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </PageSection>

        <PageSection title="Critérios de aceite" description="O que precisa ser verdade para este plano ser considerado concluído.">
          <ul className="space-y-2">
            {plan.document.acceptanceCriteria.map((item, index) => (
              <li key={item} className="flex items-start gap-2 rounded-lg border border-border/70 px-4 py-3 text-sm leading-6">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">{item}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remover critério ${index + 1}`}
                  onClick={() => removeCriterion(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}

            {plan.document.acceptanceCriteria.length === 0 && (
              <li className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum critério definido. Sem eles, não há como afirmar que o plano terminou.
              </li>
            )}
          </ul>

          <div className="mt-4 flex gap-2">
            <Input
              value={criterion}
              placeholder="Ex.: O fluxo é reproduzível por quem não participou do atendimento"
              onChange={(event) => setCriterion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCriterion();
                }
              }}
            />
            <Button variant="outline" onClick={submitCriterion} disabled={!criterion.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </PageSection>

        <PageSection title="Referências">
          <div className="flex flex-wrap gap-2">
            {plan.document.references.map((reference) => (
              <span key={reference} className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                {reference}
              </span>
            ))}
          </div>
        </PageSection>
      </div>

      <PlanDocumentEditor
        open={isEditingDocument}
        document={plan.document}
        onOpenChange={setIsEditingDocument}
        onSave={(changes) => updateDocument(plan.id, changes)}
      />
    </article>
  );
}
