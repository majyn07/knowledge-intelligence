"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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

function loadPlans(): PlanWorkspaceItem[] {
  if (typeof window === "undefined") return planWorkspaceMock;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as PlanWorkspaceItem[] : planWorkspaceMock;
  } catch {
    return planWorkspaceMock;
  }
}

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<PlanWorkspaceItem[]>(loadPlans);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(() => loadPlans()[0]?.id);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  const createPlanFromApprovedOpportunity = useCallback((input: CreatePlanFromOpportunityInput) => {
    const existing = plans.find((plan) =>
      plan.source.analysisId === input.analysis.id && plan.source.opportunityId === input.opportunity.id
    );
    if (existing) return { plan: existing, created: false };

    const plan = planService.createFromApprovedOpportunity(input);
    setPlans((current) => [plan, ...current]);
    setSelectedPlanId(plan.id);
    return { plan, created: true };
  }, [plans]);

  const linkPlanToArticle = useCallback((planId: string, articleId: string) => {
    setPlans((current) => current.map((plan) => plan.id !== planId ? plan : {
      ...plan,
      source: { ...plan.source, articleId },
      updatedAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
    }));
  }, []);

  const value = useMemo(() => ({
    plans,
    selectedPlan,
    search,
    status,
    setSearch,
    setStatus,
    selectPlan: setSelectedPlanId,
    toggleTask: (planId: string, taskId: string) => setPlans((current) => current.map((plan) => plan.id !== planId ? plan : { ...plan, tasks: plan.tasks.map((task) => task.id !== taskId ? task : { ...task, completed: !task.completed }) })),
    createPlanFromApprovedOpportunity,
    linkPlanToArticle,
  }), [createPlanFromApprovedOpportunity, linkPlanToArticle, plans, search, selectedPlan, status]);

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) throw new Error("usePlans must be used within PlansProvider.");
  return context;
}
