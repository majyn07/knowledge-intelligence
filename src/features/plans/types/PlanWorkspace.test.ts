import { describe, expect, it } from "vitest";

import { allowedPlanTransitions, canTransitionPlan, type PlanStatus } from "./PlanWorkspace";

describe("canTransitionPlan", () => {
  it("avança um estágio por vez", () => {
    expect(canTransitionPlan("analysis", "development")).toBe(true);
    expect(canTransitionPlan("development", "review")).toBe(true);
    expect(canTransitionPlan("review", "approved")).toBe(true);
    expect(canTransitionPlan("approved", "published")).toBe(true);
  });

  it("permite devolver o trabalho quando a revisão reprova", () => {
    expect(canTransitionPlan("development", "analysis")).toBe(true);
    expect(canTransitionPlan("review", "development")).toBe(true);
    expect(canTransitionPlan("approved", "review")).toBe(true);
    expect(canTransitionPlan("published", "approved")).toBe(true);
  });

  it("bloqueia saltos de estágio", () => {
    expect(canTransitionPlan("analysis", "published")).toBe(false);
    expect(canTransitionPlan("analysis", "review")).toBe(false);
    expect(canTransitionPlan("development", "approved")).toBe(false);
    expect(canTransitionPlan("published", "analysis")).toBe(false);
  });

  it("aceita permanecer no mesmo estágio", () => {
    const stages: PlanStatus[] = ["analysis", "development", "review", "approved", "published"];

    for (const stage of stages) {
      expect(canTransitionPlan(stage, stage)).toBe(true);
    }
  });

  it("nenhum estágio é um beco sem saída", () => {
    for (const transitions of Object.values(allowedPlanTransitions)) {
      expect(transitions.length).toBeGreaterThan(0);
    }
  });
});
