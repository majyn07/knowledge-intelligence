import {
  canTransitionArticle,
  type KnowledgeArticle,
} from "@/models/KnowledgeArticle";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { knowledgeArticles } from "@/features/library/mock/articles";

function normalize(data: LibraryFormData) {
  return {
    title: data.title.trim(),
    summary: data.summary.trim(),
    content: data.content.trim(),
    projectId: data.projectId,
    type: data.type,
    product: data.product.trim(),
    module: data.module.trim(),
    category: data.category.trim(),
    tags: data.tags,
    keywords: data.keywords,
    url: data.url.trim() || undefined,
  };
}

export const articleService = {
  /** Base canônica usada no render inicial, antes da hidratação. */
  getSeed(): KnowledgeArticle[] {
    return knowledgeArticles;
  },

  create(data: LibraryFormData): KnowledgeArticle {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      ...normalize(data),
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  },

  update(article: KnowledgeArticle, data: LibraryFormData): KnowledgeArticle {
    return {
      ...article,
      ...normalize(data),
      status: data.status,
      updatedAt: new Date(),
    };
  },

  changeStatus(
    article: KnowledgeArticle,
    status: KnowledgeArticle["status"]
  ): KnowledgeArticle {
    return { ...article, status, updatedAt: new Date() };
  },

  createFromPlan(plan: PlanWorkspaceItem): KnowledgeArticle {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      title: plan.title,
      summary: plan.document.executiveSummary,
      content: plan.document.proposal,
      projectId: plan.projectId,
      type: "article",
      status: "draft",
      product: "",
      module: "",
      category: "A definir",
      tags: [],
      keywords: [],
      source: {
        projectId: plan.source.projectId,
        ticketId: plan.source.ticketId,
        analysisId: plan.source.analysisId,
        opportunityId: plan.source.opportunityId,
        planId: plan.id,
      },
      createdAt: now,
      updatedAt: now,
    };
  },

  canTransitionStatus: canTransitionArticle,

  toFormData(article: KnowledgeArticle): LibraryFormData {
    return {
      title: article.title,
      summary: article.summary,
      content: article.content,
      projectId: article.projectId,
      type: article.type,
      status: article.status,
      product: article.product,
      module: article.module,
      category: article.category,
      tags: article.tags,
      keywords: article.keywords,
      url: article.url ?? "",
    };
  },
};
