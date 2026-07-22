import type { ImprovementPlan } from "@/models/ImprovementPlan";
import type { Recommendation } from "@/models/Recommendation";

export const plansService = {
  approveRecommendation(
    plan: ImprovementPlan,
    recommendation: Recommendation
  ): ImprovementPlan {
    const alreadyExists = plan.recommendations.some(
      (item) => item.id === recommendation.id
    );

    if (alreadyExists) {
      return plan;
    }

    return {
      ...plan,
      recommendations: [
        ...plan.recommendations,
        recommendation,
      ],
    };
  },

  removeRecommendation(
    plan: ImprovementPlan,
    recommendationId: string
  ): ImprovementPlan {
    return {
      ...plan,
      recommendations: plan.recommendations.filter(
        (item) => item.id !== recommendationId
      ),
    };
  },
};