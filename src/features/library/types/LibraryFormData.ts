import type {
  LibraryStatus,
  LibraryType,
} from "@/models/Library";

export interface LibraryFormData {
  title: string;
  description: string;

  projectId: string;

  type: LibraryType;
  status: LibraryStatus;

  category: string;
  tags: string[];
}