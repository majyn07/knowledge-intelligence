"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { improvementPlan as improvementPlanMock } from "../mock/improvementPlan";

import type { ImprovementPlan } from "@/models/ImprovementPlan";

interface PlansContextValue {
  improvementPlan: ImprovementPlan;
  setImprovementPlan: Dispatch<
    SetStateAction<ImprovementPlan>
  >;
}

const PlansContext = createContext<
  PlansContextValue | undefined
>(undefined);

interface PlansProviderProps {
  children: ReactNode;
}

export function PlansProvider({
  children,
}: PlansProviderProps) {
  const [improvementPlan, setImprovementPlan] =
    useState<ImprovementPlan>(improvementPlanMock);

  return (
    <PlansContext.Provider
      value={{
        improvementPlan,
        setImprovementPlan,
      }}
    >
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlansContext);

  if (!context) {
    throw new Error(
      "usePlans must be used within PlansProvider."
    );
  }

  return context;
}