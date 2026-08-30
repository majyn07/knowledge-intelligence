"use client";

import { Boxes, Building2, CalendarDays } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { formatDay } from "@/lib/dates";
import type { AnalysisStatus } from "@/models/KnowledgeLifecycle";
import type { SupportConversation } from "@/models/SupportConversation";
import { produtosDoTicket } from "../ticketTableView";
import type { Ticket } from "@/models/Ticket";

interface TicketDetailsProps {
  ticket: Ticket;
  conversation?: SupportConversation;
  analysisStatus?: AnalysisStatus;
}

/**
 * O contexto do atendimento, ao lado da conversa.
 *
 * Aqui ficam os atributos, e só eles. A identidade (número, cliente, assunto)
 * subiu para o topo da conversa: numa coluna estreita o assunto quebrava em seis
 * linhas, e quem lê procura o assunto junto do que está lendo, não na lateral.
 *
 * A grade de três colunas saiu pelo mesmo motivo. O ponto de quebra do Tailwind
 * mede a janela, não a coluna: numa tela larga a lateral continuaria tentando
 * três células de dois centímetros cada.
 */
export function TicketDetails({ ticket, conversation, analysisStatus }: TicketDetailsProps) {
  const messages = conversation?.messages ?? [];

  /*
    "Solução" na AltoQi é o produto: Builder, Eberick, Visus. Não é a resposta
    que o suporte deu, e a tela mostrava um e-mail inteiro nesse campo.
  */
  /*
    Quem diz qual programa está usando é o cliente, e nem sempre no título: "não
    consigo abrir o projeto" no assunto e "estou no Eberick 2024" na terceira
    mensagem. Então o título e a fala do cliente entram juntos.

    A resposta do suporte fica de fora de propósito. Ela cita produto o tempo
    todo por educação ("aqui no Builder você faria assim"), e isso marcaria como
    Builder um atendimento que era sobre outra coisa.

    Recalcula quando o registro não traz gravado: atendimento que entrou antes
    deste campo existir não o tem, e reimportar tudo para preencher um campo
    derivado seria caro por nada.
  */
  const daConversa = messages
    .filter((mensagem) => mensagem.role === "cliente")
    .map((mensagem) => mensagem.body);

  const produtos = produtosDoTicket(ticket, daConversa.join(" "));

  return (
    <div className="space-y-5">
      <PageSection
        title="O atendimento"
        description={
          analysisStatus === "in_review"
            ? "A análise está em revisão. Valide as evidências e decida sobre cada oportunidade."
            : "Veio do suporte e não se edita aqui."
        }
      >
        <dl className="space-y-4">
          <Atributo rotulo="Solução" icone={<Boxes className="h-4 w-4 text-primary" />}>
            {produtos.length === 0 ? (
              <span className="text-muted-foreground">Não identificada</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {produtos.map((produto) => (
                  <span
                    key={produto}
                    className="rounded-md bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {produto}
                  </span>
                ))}
              </span>
            )}
          </Atributo>

          <Atributo rotulo="Empresa" icone={<Building2 className="h-4 w-4 text-primary" />}>
            {ticket.company || <span className="text-muted-foreground">Não informada</span>}
          </Atributo>

          <Atributo rotulo="Data" icone={<CalendarDays className="h-4 w-4 text-primary" />}>
            {ticket.date ? (
              formatDay(ticket.date)
            ) : (
              <span className="text-muted-foreground">Não informada</span>
            )}
          </Atributo>
        </dl>
      </PageSection>

      {ticket.solution.trim() !== "" && (
        <PageSection
          title="Última resposta do suporte"
          description="O que quem atendeu escreveu por último. É o mais próximo de uma resolução que a conversa oferece, e não um campo que alguém preencheu."
        >
          {/*
            Bloco próprio, e não célula de grade. A solução vinda do suporte é um
            e-mail inteiro, com centenas de caracteres e endereços longos sem
            espaço: numa célula estreita ela estoura a caixa.
          */}
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6">
            {ticket.solution}
          </p>
        </PageSection>
      )}
    </div>
  );
}

function Atributo({
  rotulo,
  icone,
  children,
}: {
  rotulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </dt>

      <dd className="flex items-start gap-2 text-sm leading-6 break-words">
        <span className="mt-0.5 shrink-0">{icone}</span>
        <span className="min-w-0">{children}</span>
      </dd>
    </div>
  );
}
