"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { planWorkspaceMock } from "../mock/planWorkspace";
import type { PlanStatus, PlanWorkspaceItem } from "../types/PlanWorkspace";

interface PlansContextValue {
  plans: PlanWorkspaceItem[];
  selectedPlan: PlanWorkspaceItem;
  search: string;
  status: PlanStatus | "all";
  setSearch: (value: string) => void;
  setStatus: (value: PlanStatus | "all") => void;
  selectPlan: (id: string) => void;
  toggleTask: (planId: string, taskId: string) => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState(planWorkspaceMock);
  const [selectedPlanId, setSelectedPlanId] = useState(planWorkspaceMock[0].id);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlanStatus | "all">("all");
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  const value = useMemo(() => ({
    plans,
    selectedPlan,
    search,
    status,
    setSearch,
    setStatus,
    selectPlan: setSelectedPlanId,
    toggleTask: (planId: string, taskId: string) => setPlans((current) => current.map((plan) => plan.id !== planId ? plan : { ...plan, tasks: plan.tasks.map((task) => task.id !== taskId ? task : { ...task, completed: !task.completed }) })),
  }), [plans, search, selectedPlan, status]);

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
}

export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) throw new Error("usePlans must be used within PlansProvider.");
  return context;
}
