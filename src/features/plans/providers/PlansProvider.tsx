"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { usePersistedState } from "@/hooks/usePersistedState";

import { planWorkspaceMock } from "../mock/planWorkspace";
import { planService, type CreatePlanFromOpportunityInput } from "../services/planService";
import type { PlanStatus, PlanWorkspaceItem } from "../types/PlanWorkspace";

const STORAGE_KEY = "visus-improvement-plans";

interface PlansContextValue {
  plans: PlanWorkspaceItem[];
  selectedPlan: PlanWorkspaceItem | undefined;
  search: string;
  status: PlanStatus | "all";
  setSearch: (value: string) => void;
  setStatus: (value: PlanStatus | "all") => void;
  selectPlan: (id: string) => void;
  toggleTask: (planId: string, taskId: string) => void;
  createPlanFromApprovedOpportunity: (input: CreatePlanFromOpportunityInput) => { plan: PlanWorkspaceItem; created: boolean };
  linkPlanToArticle: (planId: string, articleId: string) => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = usePersistedState<PlanWorkspaceItem[]>({
    key: STORAGE_KEY,
    fallback: planWorkspaceMock,
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  const createPlanFromApprovedOpportunity = useCallback((input: CreatePlanFromOpportunityInput) => {
    const existing = plans.find((plan) =>
      plan.source.analysisId === input.analysis.id && plan.source.opportunityId === input.opportunity.id
    );
    if (existing) return { plan: existing, created: false };

    const plan = planService.createFromApprovedOpportunity(input);
    setPlans((current) => [plan, ...current]);
    setSelectedPlanId(plan.id);
    return { plan, created: true };
  }, [plans, setPlans]);

  const linkPlanToArticle = useCallback((planId: string, articleId: string) => {
    setPlans((current) => current.map((plan) => plan.id !== planId ? plan : {
      ...plan,
      source: { ...plan.source, articleId },
      updatedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
    }));
  }, [setPlans]);

  const toggleTask = useCallback((planId: string, taskId: string) => {
    setPlans((current) => current.map((plan) => plan.id !== planId ? plan : { ...plan, tasks: plan.tasks.map((task) => task.id !== taskId ? task : { ...task, completed: !task.completed }) }));
  }, [setPlans]);

  const value = useMemo(() => ({
    plans,
    selectedPlan,
    search,
    status,
    setSearch,
    setStatus,
    selectPlan: setSelectedPlanId,
    toggleTask,
    createPlanFromApprovedOpportunity,
    linkPlanToArticle,
  }), [createPlanFromApprovedOpportunity, linkPlanToArticle, plans, search, selectedPlan, status, toggleTask]);

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) throw new Error("usePlans must be used within PlansProvider.");
  return context;
}
