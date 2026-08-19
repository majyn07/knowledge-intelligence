import { useMemo, useState } from "react";
import { Building2, PanelLeftClose, PanelLeftOpen, Search, Ticket as TicketIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Ticket } from "@/models/Ticket";

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TicketList({
  tickets,
  selectedTicketId,
  onSelectTicket,
  isCollapsed = false,
  onToggleCollapse,
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

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center rounded-xl border border-border/70 bg-card py-4 shadow-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  aria-label="Expandir painel de atendimentos"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent side="right">
              Expandir atendimentos ({tickets.length})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="my-4 h-px w-8 bg-border/70" />

        <div className="flex flex-col items-center gap-2 overflow-y-auto max-h-[500px] px-2">
          {tickets.map((ticket) => {
            const selected = ticket.id === selectedTicketId;
            return (
              <TooltipProvider key={ticket.id}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => onSelectTicket(ticket.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        #{ticket.id}
                      </button>
                    }
                  />
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-semibold">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">{ticket.company}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </aside>
    );
  }

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

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filteredTickets.length}</Badge>
            {onToggleCollapse && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onToggleCollapse}
                        aria-label="Recolher painel de atendimentos"
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom">Recolher painel</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
                selected ? "bg-primary/8" : "hover:bg-muted/45"
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
                      <TicketIcon className="h-3.5 w-3.5" />
                      <span className="truncate">{ticket.solution}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={selected ? "default" : "outline"}>
                    #{ticket.id}
                  </Badge>
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
