import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Search, Ticket } from "lucide-react";

import { tickets as TicketType } from "../mock/tickets";

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
  const [search, setSearch] = useState("");

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    if (!query) {
      return tickets;
    }

    return tickets.filter((ticket) =>
      [ticket.id, ticket.title, ticket.company, ticket.solution].some(
        (value) => value.toLocaleLowerCase("pt-BR").includes(query)
      )
    );
  }, [search, tickets]);

  return (
    <aside className="flex min-h-96 flex-col overflow-hidden rounded-xl border border-border/70 bg-card xl:h-full">
      <header className="border-b border-border/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Atendimentos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredTickets.length} de {tickets.length} ticket(s)
            </p>
          </div>

          <Badge variant="secondary">{filteredTickets.length}</Badge>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 rounded-lg bg-muted/45 pl-8 text-xs"
            placeholder="Pesquisar atendimento..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredTickets.map((ticket) => {
          const selected = ticket.id === selectedTicketId;

          return (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={`w-full border-b border-border/60 px-4 py-4 text-left transition-colors last:border-b-0 ${
                selected
                  ? "bg-primary/8"
                  : "hover:bg-muted/45"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={`line-clamp-2 text-sm leading-5 ${
                      selected ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {ticket.title}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="truncate">{ticket.company}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="truncate">{ticket.solution}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={selected ? "default" : "outline"}>
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

        {filteredTickets.length === 0 && (
          <div className="px-4 py-10 text-center text-xs leading-5 text-muted-foreground">
            Nenhum atendimento corresponde à busca.
          </div>
        )}
      </div>
    </aside>
  );
}
