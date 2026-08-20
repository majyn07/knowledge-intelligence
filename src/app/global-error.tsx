"use client";

import { ErrorRecovery } from "@/components/common/ErrorRecovery";

import "./globals.css";

/**
 * Última barreira: só entra em cena quando o próprio layout falha, por isso
 * precisa trazer html e body consigo.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ErrorRecovery error={error} reset={reset} />
      </body>
    </html>
  );
}
