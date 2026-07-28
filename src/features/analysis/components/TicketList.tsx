import {
  Building2,
  CheckCircle2,
  Search,
  Ticket,
} from "lucide-react";

import { tickets as TicketType } from "../mock/tickets";

import { PageHeader } from "@/components/common/page/PageHeader";
import { StatusBadge } from "@/components/common/status/StatusBadge";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Ticket = (typeof TicketType)[number];

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (id: string) => void;
}

export function TicketList({
  tickets,
  selectedTicketId,
  onSelectTicket,
}: TicketListProps) {
  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <header className="border-b border-border/70 p-4">
        <PageHeader
          title="Atendimentos"
          description={`${tickets.length} ticket(s) disponíveis`}
          actions={
            <Badge variant="secondary">
              {tickets.length}
            </Badge>
          }
        />

        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
          className="h-9 rounded-lg bg-muted/40 pl-9"
            placeholder="Pesquisar atendimento..."
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {tickets.map((ticket) => {
          const selected =
            ticket.id === selectedTicketId;

          return (
            <button
              key={ticket.id}
              onClick={() =>
                onSelectTicket(ticket.id)
              }
              className={`w-full border-b border-border/60 px-4 py-4 text-left transition-colors ${
                selected
                  ? "bg-primary/8 shadow-[inset_2px_0_0_var(--primary)]"
                  : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3
                    className={`line-clamp-2 text-sm leading-6 ${
                      selected
                        ? "font-semibold"
                        : "font-medium"
                    }`}
                  >
                    {ticket.title}
                  </h3>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {ticket.company}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {ticket.solution}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <Badge
                    variant={
                      selected
                        ? "default"
                        : "outline"
                    }
                  >
                    #{ticket.id}
                  </Badge>

                  <StatusBadge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Pronto
                  </StatusBadge>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
