"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { toast } from "sonner";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { fromPlan, toPlan } from "@/lib/supabase/domainRows";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";

import { planWorkspaceMock } from "../mock/planWorkspace";
import { parsePlans } from "../normalizePlan";
import { planService, type CreatePlanFromOpportunityInput } from "../services/planService";
import {
  canTransitionPlan,
  planStatusLabel,
  type PlanDocument,
  type PlanPriority,
  type PlanStatus,
  type PlanWorkspaceItem,
} from "../types/PlanWorkspace";
import { STORAGE_KEYS } from "@/lib/storage";

const STORAGE_KEY = STORAGE_KEYS.plans;

/** O carimbo de alteração, em ISO. Quem formata é a tela. */
function nowIso() {
  return new Date().toISOString();
}

interface PlansContextValue {
  plans: PlanWorkspaceItem[];
  /** Falso até o conteúdo guardado ser lido, após a montagem. */
  isHydrated: boolean;
  selectedPlan: PlanWorkspaceItem | undefined;
  search: string;
  status: PlanStatus | "all";
  setSearch: (value: string) => void;
  setStatus: (value: PlanStatus | "all") => void;
  selectPlan: (id: string) => void;
  changeStatus: (planId: string, status: PlanStatus) => void;
  assignPlan: (planId: string, owner: string) => void;
  setPriority: (planId: string, priority: PlanPriority) => void;
  setDueDate: (planId: string, dueDate: string) => void;
  addTask: (planId: string, label: string, owner: string) => void;
  toggleTask: (planId: string, taskId: string) => void;
  removeTask: (planId: string, taskId: string) => void;
  addComment: (planId: string, author: string, message: string) => void;
  updateDocument: (planId: string, changes: Partial<PlanDocument>) => void;
  createPlanFromApprovedOpportunity: (input: CreatePlanFromOpportunityInput) => { plan: PlanWorkspaceItem; created: boolean };
  linkPlanToArticle: (planId: string, articleId: string) => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { currentPerson } = usePeople();
  const [plans, setPlans, isHydrated] = useSharedCollection<PlanWorkspaceItem>({
    key: STORAGE_KEY,
    table: "plans",
    fallback: planWorkspaceMock,
    parseLocal: parsePlans,
    fromRows: (rows) => rows.map(toPlan),
    toRow: fromPlan,
    identify: (plan) => plan.id,
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  /** Toda alteração carimba a data: o plano é um documento vivo. */
  const patchPlan = useCallback(
    (planId: string, patch: (plan: PlanWorkspaceItem) => PlanWorkspaceItem) => {
      setPlans((current) =>
        current.map((plan) => (plan.id === planId ? { ...patch(plan), updatedAt: nowIso() } : plan))
      );
    },
    [setPlans]
  );

  const createPlanFromApprovedOpportunity = useCallback((input: CreatePlanFromOpportunityInput) => {
    const existing = plans.find((plan) =>
      plan.source.analysisId === input.analysis.id && plan.source.opportunityId === input.opportunity.id
    );
    if (existing) return { plan: existing, created: false };

    const plan = planService.createFromApprovedOpportunity(input);
    setPlans((current) => [plan, ...current]);
    setSelectedPlanId(plan.id);
    record({
      type: "plan_created",
      projectId: plan.projectId,
      /*
        Quem fez, e não quem responde.

        Era `currentPerson || plan.owner`, e o responsável guarda identificador
        — inclusive de equipe. A auditoria mostrou o efeito no acervo real:
        "team-suporte-estruturas" listado como pessoa que realizou eventos.

        São duas perguntas. Sem sessão, a resposta certa é vazia, e a tela diz
        "não registrado": afirmar que alguém fez algo que não fez é pior que
        não saber.
      */
      actor: currentPerson,
      subject: { kind: "plan", id: plan.id, label: plan.title },
      detail: "Plano criado a partir de oportunidade aprovada na revisão humana.",
    });
    return { plan, created: true };
  }, [currentPerson, plans, record, setPlans]);

  const changeStatus = useCallback((planId: string, next: PlanStatus) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;

    if (!canTransitionPlan(plan.status, next)) {
      toast.error(
        `Não é possível ir de "${planStatusLabel[plan.status]}" para "${planStatusLabel[next]}".`
      );
      return;
    }

    // Publicar o plano encerra o ciclo: exige o conteúdo já publicado na Biblioteca.
    if (next === "published" && !plan.source.articleId) {
      toast.error("Crie o conteúdo na Biblioteca antes de publicar o plano.");
      return;
    }

    patchPlan(planId, (current) => ({ ...current, status: next }));
    record({
      type: "plan_status_changed",
      projectId: plan.projectId,
      actor: currentPerson,
      subject: { kind: "plan", id: plan.id, label: plan.title },
      detail: `${planStatusLabel[plan.status]} → ${planStatusLabel[next]}`,
      transition: { from: plan.status, to: next },
    });
    toast.success(`Plano movido para "${planStatusLabel[next]}".`);
  }, [currentPerson, patchPlan, plans, record]);

  const assignPlan = useCallback((planId: string, owner: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan || plan.owner === owner) return;

    patchPlan(planId, (current) => ({ ...current, owner }));
    record({
      type: "plan_updated",
      projectId: plan.projectId,
      actor: currentPerson,
      subject: { kind: "plan", id: plan.id, label: plan.title },
      detail: owner ? `Responsável definido: ${owner}.` : "Responsável removido.",
    });
  }, [currentPerson, patchPlan, plans, record]);

  const setPriority = useCallback((planId: string, priority: PlanPriority) => {
    patchPlan(planId, (current) => ({ ...current, priority }));
  }, [patchPlan]);

  /*
    Prazo entra no histórico, ao contrário da prioridade. Mudar o prazo é uma
    decisão que afeta quem espera o trabalho, e "por que isso mudou de data"
    precisa ter resposta depois.
  */
  const setDueDate = useCallback((planId: string, dueDate: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!plan || (plan.dueDate ?? "") === dueDate) return;

    patchPlan(planId, (current) => {
      if (dueDate) return { ...current, dueDate };

      // Sem prazo é ausência do campo, e não string vazia: a leitura trata os
      // dois igual, mas gravar "" deixaria lixo no registro.
      const semPrazo = { ...current };
      delete semPrazo.dueDate;
      return semPrazo;
    });

    record({
      type: "plan_updated",
      projectId: plan.projectId,
      actor: currentPerson,
      subject: { kind: "plan", id: plan.id, label: plan.title },
      detail: dueDate
        ? `Prazo definido para ${new Date(dueDate).toLocaleDateString("pt-BR")}.`
        : "Prazo removido.",
    });
  }, [currentPerson, patchPlan, plans, record]);

  const addTask = useCallback((planId: string, label: string, owner: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    patchPlan(planId, (current) => ({
      ...current,
      tasks: [...current.tasks, { id: crypto.randomUUID(), label: trimmed, completed: false, owner }],
    }));
  }, [patchPlan]);

  const toggleTask = useCallback((planId: string, taskId: string) => {
    patchPlan(planId, (current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id !== taskId ? task : { ...task, completed: !task.completed }),
    }));
  }, [patchPlan]);

  const removeTask = useCallback((planId: string, taskId: string) => {
    patchPlan(planId, (current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  }, [patchPlan]);

  const addComment = useCallback((planId: string, author: string, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    patchPlan(planId, (current) => ({
      ...current,
      comments: [
        /*
          ISO, e não texto de exibição. O comentário gravado como "20 de ago.
          de 2026, 18:23" não se ordena nem se compara, e a tela já mostrava
          duas formas na mesma lista: o texto dos novos e o ISO cru da
          semente. Quem formata é `RelativeDate`, na leitura.
        */
        { id: crypto.randomUUID(), author: author || "Sem autor", message: trimmed, date: new Date().toISOString() },
        ...current.comments,
      ],
    }));
  }, [patchPlan]);

  const updateDocument = useCallback((planId: string, changes: Partial<PlanDocument>) => {
    patchPlan(planId, (current) => ({ ...current, document: { ...current.document, ...changes } }));
  }, [patchPlan]);

  const linkPlanToArticle = useCallback((planId: string, articleId: string) => {
    patchPlan(planId, (current) => ({ ...current, source: { ...current.source, articleId } }));
  }, [patchPlan]);

  const value = useMemo(() => ({
    plans,
    isHydrated,
    selectedPlan,
    search,
    status,
    setSearch,
    setStatus,
    selectPlan: setSelectedPlanId,
    changeStatus,
    assignPlan,
    setPriority,
    setDueDate,
    addTask,
    toggleTask,
    removeTask,
    addComment,
    updateDocument,
    createPlanFromApprovedOpportunity,
    linkPlanToArticle,
  }), [addComment, addTask, assignPlan, changeStatus, createPlanFromApprovedOpportunity, isHydrated, linkPlanToArticle, plans, removeTask, search, selectedPlan, setDueDate, setPriority, status, toggleTask, updateDocument]);

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) throw new Error("usePlans must be used within PlansProvider.");
  return context;
}
