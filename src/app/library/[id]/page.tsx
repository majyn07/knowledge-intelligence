"use client";

import { use } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ArticleWorkspace } from "@/features/library/ArticleWorkspace";

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AppShell>
      <ArticleWorkspace articleId={id} />
    </AppShell>
  );
}
