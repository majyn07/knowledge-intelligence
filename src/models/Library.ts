export type LibraryStatus =
  | "draft"
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

  projectId: string;

  type: LibraryType;
  status: LibraryStatus;

  category: string;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}
