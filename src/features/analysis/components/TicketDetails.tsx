import { Button } from "@/components/ui/button";

import { conversations } from "../mock/conversations";

type Ticket = {
  id: string;
  title: string;
  solution: string;
  company: string;
  date: string;
};

interface TicketDetailsProps {
  ticket: Ticket;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function TicketDetails({
  ticket,
  isAnalyzing,
  onAnalyze,
}: TicketDetailsProps) {

  const conversation = conversations[ticket.id] ?? [];

  return (
    <main className="flex-1 rounded-xl border bg-card">

      <div className="flex items-start justify-between border-b p-6">

        <div>

          <h1 className="text-2xl font-semibold">
            {ticket.title}
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-3 text-sm">

            <div>
              <strong>Solução:</strong> {ticket.solution}
            </div>

            <div>
              <strong>Ticket:</strong> #{ticket.id}
            </div>

            <div>
              <strong>Empresa:</strong> {ticket.company}
            </div>

            <div>
              <strong>Data:</strong> {ticket.date}
            </div>

          </div>

        </div>

        <Button
          disabled={isAnalyzing}
          onClick={onAnalyze}
        >
          {isAnalyzing
            ? "Analisando..."
            : "Analisar Atendimento"}
        </Button>

      </div>

      <div className="flex-1 overflow-auto p-6">

        <h2 className="text-lg font-semibold">
          Conversa
        </h2>

        <div className="mt-4 space-y-4">

          {conversation.map((message, index) => (

            <div
              key={index}
              className="rounded-lg border p-4"
            >

              <div className="mb-3 flex items-center justify-between">

                <span className="font-medium">
                  {message.author}
                </span>

                <span className="text-xs text-muted-foreground">
                  {message.date}
                </span>

              </div>

              <p className="text-sm leading-6 whitespace-pre-wrap">
                {message.message}
              </p>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}