export type LibraryStatus =
  | "draft"
  | "review"
  | "published"
  | "archived";

export type LibraryType =
  | "article"
  | "faq"
  | "workflow"
  | "document"
  | "template";

export interface Library {
  id: string;

  title: string;
  description: string;
  content: string;

  projectId: string;

  type: LibraryType;
  status: LibraryStatus;

  category: string;
  tags: string[];
  source?: KnowledgeContentSource;

  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeContentSource {
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  planId: string;
}

export const nextLibraryStatus: Partial<Record<LibraryStatus, LibraryStatus>> = {
  draft: "review",
  review: "published",
  published: "archived",
};
