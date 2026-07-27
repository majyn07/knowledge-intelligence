import type { LibraryStatus } from "@/models/Library";

export interface LibraryFilters {
  search: string;
  status: LibraryStatus | "all";
}