"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { Recommendation } from "@/models/Recommendation";

type PlansContextType = {
  approvedRecommendations: Recommendation[];
  approveRecommendation: (recommendation: Recommendation) => void;
};

const PlansContext = createContext<PlansContextType | null>(null);

export function PlansProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [approvedRecommendations, setApprovedRecommendations] =
    useState<Recommendation[]>([]);

  function approveRecommendation(
    recommendation: Recommendation
  ) {
    setApprovedRecommendations((current) => {
      const exists = current.some(
        (item) => item.id === recommendation.id
      );

      if (exists) {
        return current;
      }

      return [...current, recommendation];
    });
  }

  return (
    <PlansContext.Provider
      value={{
        approvedRecommendations,
        approveRecommendation,
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
      "usePlans deve ser utilizado dentro de PlansProvider."
    );
  }

  return context;
}