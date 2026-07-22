import { useMemo } from "react";

import type { AIContext } from "@/models/AIContext";
import type { Ticket } from "@/models/Ticket";

export function useAnalysisContext(
  ticket?: Ticket
): AIContext {
  return useMemo(
    () => ({
      ticket,
    }),
    [ticket]
  );
}