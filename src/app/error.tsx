"use client";

import { ErrorRecovery } from "@/components/common/ErrorRecovery";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorRecovery error={error} reset={reset} />;
}
