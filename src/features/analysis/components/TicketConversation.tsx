"use client";

import { Bot, Headset, User } from "lucide-react";

import { RelativeDate } from "@/components/common/RelativeDate";
import type { SupportConversation, SupportConversationMessage } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { TicketAttachments } from "./TicketAttachments";
import { contar } from "@/lib/plural";

/**
 * A conversa do atendimento, que é o centro da tela.
 *
 * Ela ocupa a coluna do meio porque é o que se lê: quem abre um atendimento
 * quer saber o que o cliente disse e o que o suporte respondeu. Os atributos
 * ficam ao lado, e a análise embaixo, com a largura que ela precisa.
 *
 * Antes disso a conversa vinha depois dos atributos, empilhada, e um diálogo de
 * noventa e quatro mensagens empurrava todo o resto para fora da tela.
 */
export function TicketConversation({
  conversation,
  ticket,
}: {
  conversation?: SupportConversation;
  /* Opcional porque nem toda tela que mostra conversa tem o atendimento em mãos. */
  ticket?: Ticket;
}) {
  const messages = conversation?.messages ?? [];

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card">
      <header className="border-b border-border/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold tracking-tight">A conversa</h2>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {messages.length === 0
            ? "Sem registro"
            : `${contar(messages.length, "mensagem", "mensagens")}, do começo ao fim`}
        </p>
      </header>

      {messages.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm leading-6 text-muted-foreground">
          Este atendimento veio sem a conversa, e sem ela a análise fica limitada ao título e à
          solução. Quem entra pela caixa do suporte traz a conversa junto; o que veio por arquivo,
          não.
        </p>
      ) : (
        /*
          A conversa rola dentro da própria caixa, e não empurra a página.
          Noventa e quatro mensagens numa página que rola inteira fazem os
          atributos e a análise sumirem lá embaixo, onde ninguém volta.
        */
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((message) => (
            <Fala key={message.id} message={message} />
          ))}
        </div>
      )}

      {/*
        Depois da conversa e fora da caixa que rola: o anexo é do atendimento
        inteiro, não de uma fala. Ficar dentro da rolagem o esconderia no fim de
        noventa e quatro mensagens.
      */}
      {ticket && <TicketAttachments ticket={ticket} />}
    </section>
  );
}

/**
 * Uma fala da conversa.
 *
 * São três vozes e não duas, e essa era a confusão: o robô de triagem caía do
 * mesmo lado do cliente, com a mesma cara, e quem lia a conversa não distinguia
 * quem tinha respondido o quê. O cliente e o suporte ficam em lados opostos,
 * com cor própria; automação e sistema ficam no meio, apagados e estreitos,
 * porque são contexto e não conversa.
 */
function Fala({ message }: { message: SupportConversationMessage }) {
  const rotuloDoPapel: Record<SupportConversationMessage["role"], string> = {
    cliente: "Cliente",
    suporte: "Suporte",
    automacao: "Automação",
    sistema: "Sistema",
  };

  if (message.role === "automacao" || message.role === "sistema") {
    return (
      <div className="flex justify-center">
        <article className="max-w-[80%] rounded-xl border border-dashed border-border/60 bg-muted/25 px-4 py-2.5">
          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <Bot className="h-3 w-3" />
            {rotuloDoPapel[message.role]}
            <span className="normal-case tracking-normal">
              · <RelativeDate value={message.createdAt} />
            </span>
          </div>

          <p className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
            {message.body}
          </p>
        </article>
      </div>
    );
  }

  const doSuporte = message.role === "suporte";

  return (
    <div className={`flex ${doSuporte ? "justify-end" : "justify-start"}`}>
      <article
        className={`min-w-0 max-w-[88%] rounded-2xl border px-4 py-3 ${
          doSuporte ? "border-primary/35 bg-primary/12" : "border-border bg-card shadow-sm"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {doSuporte ? (
              <Headset className="h-3.5 w-3.5 text-primary" />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
            {message.author}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                doSuporte ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {rotuloDoPapel[message.role]}
            </span>
          </span>

          <span className="text-xs text-muted-foreground">
            {message.channel && <>{message.channel} · </>}
            <RelativeDate value={message.createdAt} />
          </span>
        </div>

        {/*
          `break-words` porque a mensagem vinda de e-mail traz endereço e link
          sem espaço nenhum, e sem isso a caixa estoura para fora da coluna.
        */}
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
      </article>
    </div>
  );
}
