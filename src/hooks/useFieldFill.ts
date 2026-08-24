"use client";

import { useCallback, useState } from "react";

import type { AIAttachment } from "@/models/AIAttachment";
import type { FieldSpec } from "@/services/ai/fill/fieldFill";

/**
 * Pede à IA o preenchimento de um formulário.
 *
 * Sem domínio de propósito: quem chama diz o que é o formulário e quais campos
 * existem, e recebe proposta para eles. É o que permite a mesma peça servir o
 * projeto, o atendimento e o artigo — o formato "descreva e a IA propõe" é o
 * mesmo nos três, e um gancho por tela faria três divergirem.
 *
 * A importação de tipos é só de tipo: `fieldFill.ts` carrega `zod` e vive do
 * lado do servidor, e um `import` de valor traria a biblioteca inteira para o
 * navegador sem necessidade.
 */

export interface FillProposalDTO {
  name: string;
  value: string;
  reason: string;
}

export interface FillResult {
  fields: FillProposalDTO[];
  questions: string[];
}

export interface FillAsk {
  subject: string;
  fields: FieldSpec[];
  source: string;
  /**
   * O documento que o modelo precisa ver, quando houver.
   *
   * Vai e não fica: existe durante o pedido e é descartado com a resposta. O
   * produto guarda o que foi extraído e revisado, não o arquivo.
   */
  file?: AIAttachment;
}

export type FillState = "parado" | "pedindo" | "pronto" | "falhou";

export function useFieldFill() {
  const [state, setState] = useState<FillState>("parado");
  const [error, setError] = useState("");
  const [result, setResult] = useState<FillResult | null>(null);

  const limpar = useCallback(() => {
    setState("parado");
    setError("");
    setResult(null);
  }, []);

  const pedir = useCallback(async (ask: FillAsk) => {
    setState("pedindo");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/fill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ask),
      });

      const body: unknown = await response.json();

      if (!response.ok) {
        /*
          A mensagem do servidor vem inteira. Ela já distingue chave recusada
          de cota estourada de modelo sobrecarregado, e trocá-la por texto
          genérico aqui apagaria a única pista de quem administra — foi o que
          o `aiErrorResponse` existe para não deixar acontecer.
        */
        throw new Error(
          typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : "Não foi possível preencher."
        );
      }

      const bruto = (body ?? {}) as Partial<FillResult>;

      setResult({
        fields: Array.isArray(bruto.fields) ? bruto.fields : [],
        questions: Array.isArray(bruto.questions) ? bruto.questions : [],
      });

      setState("pronto");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível preencher.");
      setState("falhou");
    }
  }, []);

  return { state, error, result, pedir, limpar };
}
