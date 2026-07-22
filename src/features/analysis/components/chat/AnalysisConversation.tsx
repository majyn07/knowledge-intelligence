"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { sendAnalysisMessage } from "../../hooks/useAnalysisConversation";

import type { AIContext } from "@/models/AIContext";
import type { AnalysisMessage } from "@/models/AnalysisMessage";

interface AnalysisConversationProps {
  context: AIContext;
  messages: AnalysisMessage[];
  setMessages: Dispatch<SetStateAction<AnalysisMessage[]>>;
}

export function AnalysisConversation({
  context,
  messages,
  setMessages,
}: AnalysisConversationProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const prompt = message;

      const userMessage: AnalysisMessage = {
        id: Date.now().toString(),
        author: "user",
        message: prompt,
        createdAt: new Date().toLocaleString(),
      };

      const updatedMessages = [...messages, userMessage];

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
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h3 className="font-semibold">
          Conversa com a IA
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Continue a conversa sobre esta análise.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg p-4 ${
              item.author === "assistant"
                ? "bg-muted"
                : "border"
            }`}
          >
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              {item.author === "assistant"
                ? "IA"
                : "Você"}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-6">
              {item.message}
            </p>

            <p className="mt-3 text-xs text-muted-foreground">
              {item.createdAt}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
          placeholder="Pergunte algo sobre esta análise..."
          className="min-h-28 w-full resize-none rounded-lg border bg-background p-3 text-sm outline-none disabled:opacity-60"
        />

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}