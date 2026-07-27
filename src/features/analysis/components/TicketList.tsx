import {
  Search,
  Ticket,
  Building2,
  CheckCircle2,
} from "lucide-react";

import { tickets as TicketType } from "../mock/tickets";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <aside className="flex w-96 flex-col rounded-xl border bg-card shadow-sm">
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Atendimentos
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {tickets.length} atendimento(s) disponível(is)
            </p>
          </div>

          <Badge>
            Ativos
          </Badge>
        </div>
      </div>

      <div className="border-b p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Pesquisar atendimento..."
          />
        </div>
      </div>

      <Accordion
        defaultValue={["status", "produto"]}
      >
        <AccordionItem value="status">
          <AccordionTrigger className="px-5">
            Status
          </AccordionTrigger>

          <AccordionContent>
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              <Badge variant="secondary">
                Pendentes
              </Badge>

              <Badge variant="secondary">
                Revisados
              </Badge>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="produto">
          <AccordionTrigger className="px-5">
            Produto
          </AccordionTrigger>

          <AccordionContent>
            <div className="flex flex-wrap gap-2 px-5 pb-4">
              <Badge variant="secondary">
                Workflow
              </Badge>

              <Badge variant="secondary">
                Collab
              </Badge>

              <Badge variant="secondary">
                Planning
              </Badge>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex-1 overflow-auto">
        {tickets.map((ticket) => {
          const selected =
            ticket.id === selectedTicketId;

          return (
            <button
              key={ticket.id}
              onClick={() =>
                onSelectTicket(ticket.id)
              }
              className={`w-full border-b px-5 py-4 text-left transition-all ${
                selected
                  ? "border-l-4 border-l-primary bg-primary/5"
                  : "hover:bg-muted/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="font-semibold leading-snug">
                  {ticket.title}
                </p>

                <Badge
                  variant={
                    selected
                      ? "default"
                      : "secondary"
                  }
                >
                  #{ticket.id}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{ticket.company}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Ticket className="h-3.5 w-3.5" />
                  <span>{ticket.solution}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Pronto para análise
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}