import { Search } from "lucide-react";

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
    <aside className="flex w-80 flex-col rounded-xl border bg-card">

      <div className="border-b p-5">

        <h2 className="text-lg font-semibold">
          Base de Atendimentos
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise e selecione um atendimento para análise.
        </p>

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
        type="multiple"
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

          const selected = ticket.id === selectedTicketId;

          return (

            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={`w-full border-b p-4 text-left transition-colors ${
                selected
                  ? "bg-muted"
                  : "hover:bg-muted/40"
              }`}
            >

              <p className="text-sm font-semibold">
                {ticket.title}
              </p>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">

                <p>
                  <strong>Solução:</strong> {ticket.solution}
                </p>

                <p>
                  <strong>Empresa:</strong> {ticket.company}
                </p>

                <p>
                  <strong>Ticket:</strong> #{ticket.id}
                </p>

              </div>

            </button>

          );

        })}

      </div>

    </aside>
  );
}