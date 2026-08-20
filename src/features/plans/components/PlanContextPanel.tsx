"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Link2, MessageSquareText, Send } from "lucide-react";

import { ActivityTimeline } from "@/features/activities/components/ActivityTimeline";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { PersonSelect } from "@/features/people/components/PersonSelect";
import { Input } from "@/components/ui/input";
import { deadlineLabel } from "../deadlines";
import { PublishConfirmDialog } from "@/components/common/PublishConfirmDialog";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { usePlans } from "../providers/PlansProvider";
import { planPublishChecks } from "../publishChecks";
import {
  allowedPlanTransitions,
  planPriorityLabel,
  planStatusLabel,
  type PlanPriority,
  type PlanWorkspaceItem,
} from "../types/PlanWorkspace";

interface PlanContextPanelProps {
  plan: PlanWorkspaceItem;
}

const priorities: PlanPriority[] = ["high", "medium", "normal"];

const statusVariant: Record<PlanWorkspaceItem["status"], "info" | "warning" | "success" | "default"> = {
  analysis: "default",
  development: "info",
  review: "warning",
  approved: "success",
  published: "success",
};

export function PlanContextPanel({ plan }: PlanContextPanelProps) {
  const { changeStatus, assignPlan, setPriority, setDueDate, addComment } = usePlans();
  const { eventsFor } = useActivity();
  const { items: articles } = useLibrary();
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState(plan.owner);

  const completedTasks = plan.tasks.filter((task) => task.completed).length;
  const history = eventsFor("plan", plan.id);
  const transitions = allowedPlanTransitions[plan.status];

  function submitComment() {
    if (!message.trim()) return;
    addComment(plan.id, author, message);
    setMessage("");
  }

  return (
    <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <section className="rounded-xl border border-border/70 bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Estágio e condução
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge variant={statusVariant[plan.status]}>{planStatusLabel[plan.status]}</StatusBadge>
          <StatusBadge variant={plan.priority === "high" ? "danger" : "warning"}>
            {planPriorityLabel[plan.priority]}
          </StatusBadge>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {transitions.map((next) =>
            next === "published" ? (
              <Button key={next} size="sm" onClick={() => setIsPublishing(true)}>
                Publicar plano
              </Button>
            ) : (
              <Button key={next} size="sm" variant="outline" onClick={() => changeStatus(plan.id, next)}>
                Mover para {planStatusLabel[next].toLowerCase()}
              </Button>
            )
          )}
        </div>

        {plan.status === "approved" && !plan.source.articleId && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Para publicar o plano, o conteúdo precisa existir na Biblioteca.
          </p>
        )}

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-owner">Responsável</Label>
            <PersonSelect
              id="plan-owner"
              value={plan.owner}
              onChange={(name) => assignPlan(plan.id, name)}
              placeholder="Sem responsável"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-due">Prazo</Label>

            <Input
              id="plan-due"
              type="date"
              /*
                O campo de data devolve "YYYY-MM-DD", que é exatamente a forma
                que a leitura aceita. Nada de conversão no meio: é onde datas
                costumam se perder.
              */
              value={(plan.dueDate ?? "").slice(0, 10)}
              onChange={(event) => setDueDate(plan.id, event.target.value)}
            />

            {plan.dueDate && (
              <p className="text-xs text-muted-foreground">
                {deadlineLabel(plan.dueDate, new Date()) || "Data não interpretável"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-priority">Prioridade</Label>
            <Select
              value={plan.priority}
              onValueChange={(value) => setPriority(plan.id, (value ?? "normal") as PlanPriority)}
            >
              <SelectTrigger id="plan-priority">
                <SelectValue>{(priority: PlanPriority) => planPriorityLabel[priority]}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {planPriorityLabel[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Projeto</dt>
              <dd className="mt-1 font-medium">{plan.projectName}</dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">Atualizado</dt>
              <dd className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {plan.updatedAt}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-muted-foreground">Atividades</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {completedTasks} de {plan.tasks.length} concluída(s)
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Link2 className="h-4 w-4 text-primary" />
          Origem e relações
        </h3>

        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Atendimento</span>
            <br />#{plan.source.ticketId}
          </p>

          <p>
            <span className="text-muted-foreground">Oportunidade aprovada</span>
            <br />
            {plan.source.opportunityTitle}
          </p>

          {plan.source.articleId ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              render={<Link href={`/library/${plan.source.articleId}`} />} nativeButton={false}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Ver conteúdo na Biblioteca
            </Button>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              Nenhum conteúdo criado a partir deste plano ainda.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-5">
        <h3 className="font-semibold">Histórico</h3>

        <div className="mt-4">
          {history.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Nenhuma movimentação registrada neste plano ainda.
            </p>
          ) : (
            <ActivityTimeline events={history} hideSubject />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Comentários
        </h3>

        <div className="mt-4 space-y-3">
          <PersonSelect id="comment-author" value={author} onChange={setAuthor} placeholder="Quem comenta" />

          <Textarea
            rows={3}
            value={message}
            placeholder="Registre uma observação sobre a execução."
            onChange={(event) => setMessage(event.target.value)}
          />

          <Button size="sm" className="w-full" onClick={submitComment} disabled={!message.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Comentar
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          {plan.comments.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">Nenhum comentário ainda.</p>
          ) : (
            plan.comments.map((comment) => (
              <article key={comment.id}>
                <p className="text-xs font-medium">
                  {comment.author}
                  <span className="font-normal text-muted-foreground"> · {comment.date}</span>
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{comment.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
      <PublishConfirmDialog
        open={isPublishing}
        title="Publicar plano de melhoria"
        subject={plan.title}
        consequence="Publicar encerra a execução: o plano sai da fila de trabalho e o ciclo se fecha no conteúdo que ele gerou."
        checks={planPublishChecks(plan, articles.find((item) => item.id === plan.source.articleId))}
        confirmLabel="Publicar plano"
        onCancel={() => setIsPublishing(false)}
        onConfirm={() => {
          changeStatus(plan.id, "published");
          setIsPublishing(false);
        }}
      />
    </aside>
  );
}
