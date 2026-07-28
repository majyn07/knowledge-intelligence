import type { Library } from "@/models/Library";
import type { LibraryFormData } from "@/features/library/types/LibraryFormData";

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

      projectId: data.projectId,

      type: data.type,
      status: data.status,

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

      projectId: data.projectId,

      type: data.type,
      status: data.status,

      category: data.category.trim(),
      tags: data.tags,

      updatedAt: new Date(),
    };
  },

  delete(): void {
    throw new Error("Not implemented");
  },
};