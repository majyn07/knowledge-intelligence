import { nextLibraryStatus, type Library } from "@/models/Library";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

import { library } from "@/features/library/mock/library";

export const LibraryService = {
  getAll(): Library[] {
    return library;
  },

  getById(id: string): Library | undefined {
    return library.find(
      (item) => item.id === id
    );
  },

  create(data: LibraryFormData): Library {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      description: data.description.trim(),
      content: data.content.trim(),

      projectId: data.projectId,

      type: data.type,
      status: "draft",

      category: data.category.trim(),
      tags: data.tags,

      createdAt: now,
      updatedAt: now,
    };
  },

  update(
    item: Library,
    data: LibraryFormData
  ): Library {
    return {
      ...item,
      title: data.title.trim(),
      description: data.description.trim(),
      content: data.content.trim(),

      projectId: data.projectId,

      type: data.type,
      status: data.status,

      category: data.category.trim(),
      tags: data.tags,

      updatedAt: new Date(),
    };
  },

  createFromPlan(plan: PlanWorkspaceItem): Library {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      title: plan.title,
      description: plan.document.executiveSummary,
      content: plan.document.proposal,
      projectId: plan.projectId,
      type: "article",
      status: "draft",
      category: "A definir",
      tags: [],
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

  canTransitionStatus(current: Library["status"], next: Library["status"]) {
    return current === next || nextLibraryStatus[current] === next;
  },

  delete(): void {
    throw new Error("Not implemented");
  },
};
