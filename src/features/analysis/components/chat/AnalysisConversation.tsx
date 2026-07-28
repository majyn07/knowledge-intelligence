"use client";

import { useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import {
  Bot,
  Send,
  Sparkles,
  User,
} from "lucide-react";

import { sendAnalysisMessage } from "../../hooks/useAnalysisConversation";

import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";

interface AnalysisConversationProps {
  context: AIContext;
  messages: AnalysisMessage[];
  setMessages: Dispatch<
    SetStateAction<AnalysisMessage[]>
  >;
}

export function AnalysisConversation({
  context,
  messages,
  setMessages,
}: AnalysisConversationProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!message.trim() || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const prompt = message;

      const userMessage: AnalysisMessage = {
        id: Date.now().toString(),
        author: "user",
        message: prompt,
        createdAt: new Date().toLocaleString(),
      };

      const updatedMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(updatedMessages);

      setMessage("");

      const assistantMessage =
        await sendAnalysisMessage(
          context,
          updatedMessages,
          prompt
        );

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch {
      toast.error("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !isLoading
    ) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <PageSection
      title="Conversa com a IA"
      description="Faça perguntas, solicite explicações ou peça novas análises sobre este atendimento."
    >
      <div className="space-y-5">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>

            <h3 className="text-base font-semibold">
              A conversa ainda não começou
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
              Pergunte sobre a classificação do atendimento,
              solicite melhorias para a Base de Conhecimento ou
              peça que a IA explique como chegou às conclusões.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {messages.map((item) => {
            const assistant =
              item.author === "assistant";

            return (
              <div
                key={item.id}
                className={`flex ${
                  assistant
                    ? "justify-start"
                    : "justify-end"
                }`}
              >
                <div
                  className={`flex max-w-[85%] gap-4 ${
                    assistant
                      ? ""
                      : "flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      assistant
                        ? "bg-primary/10 text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {assistant ? (
                      <Bot className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>

                  <article
                    className={`rounded-2xl border px-5 py-4 shadow-sm ${
                      assistant
                        ? "border-primary/10 bg-primary/5"
                        : "bg-card"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-6">
                      <span className="text-sm font-semibold">
                        {assistant
                          ? "Assistente IA"
                          : "Você"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {item.createdAt}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-7">
                      {item.message}
                    </p>
                  </article>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
          <Textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Pergunte algo sobre esta análise..."
            className="min-h-28 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Enter para enviar · Shift + Enter para nova linha
            </span>

            <Button
              onClick={handleSend}
              disabled={
                isLoading || !message.trim()
              }
            >
              <Send className="mr-2 h-4 w-4" />

              {isLoading
                ? "Enviando..."
                : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
