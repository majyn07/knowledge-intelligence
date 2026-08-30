"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { MergeAdvice, Relacao } from "@/services/ai/library/mergeAdvice";

import { montarPedidoDeComparacao } from "../compare/mergeRequest";

/**
 * "Estes dois deveriam ser um só?"
 *
 * A tela já dizia o vocabulário em comum, e dizia também que aquilo **não é
 * veredito**. Para saber se dizem a mesma coisa ela mandava abrir um deles e
 * perguntar à IA de lá — o que é mandar alguém para outra tela no meio da
 * decisão, e é o que faz ninguém perguntar.
 *
 * **Ela não funde nada.** Unir, arquivar ou deixar como está continua sendo
 * decisão de quem revisa, e a tela não oferece botão para o contrário: um
 * artigo apagado por engano não volta do jeito que veio.
 */

const APARENCIA: Record<Relacao, { rotulo: string; classe: string }> = {
  "mesmo-assunto": {
    rotulo: "Respondem à mesma dúvida",
    classe: "border-amber-500/40 bg-amber-500/10",
  },
  complementares: {
    rotulo: "Complementares",
    classe: "border-primary/40 bg-primary/5",
  },
  "assuntos-diferentes": {
    rotulo: "Assuntos diferentes",
    classe: "border-border/70 bg-muted/20",
  },
};

export function MergeAdvicePanel({ a, b }: { a: KnowledgeArticle; b: KnowledgeArticle }) {
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [advice, setAdvice] = useState<MergeAdvice | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /*
    A tela pergunta se há provedor antes de oferecer o botão. Mesma regra do
    botão de entrar com a conta Google. A resposta entra depois da montagem: no
    primeiro render o servidor não sabe, e supor divergiria na hidratação.
  */
  useEffect(() => {
    let vivo = true;

    fetch("/api/library/compare")
      .then((resposta) => (resposta.ok ? resposta.json() : { configured: false }))
      .then((dados: { configured?: boolean }) => {
        if (vivo) setDisponivel(Boolean(dados.configured));
      })
      .catch(() => {
        if (vivo) setDisponivel(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  /* Trocar o par descarta o veredito do par anterior, que não vale para este. */
  useEffect(() => {
    setAdvice(null);
    setErro(null);
  }, [a.id, b.id]);

  async function avaliar() {
    setLendo(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/library/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarPedidoDeComparacao(a, b)),
      });

      const dados: { advice?: MergeAdvice; message?: string } = await resposta.json();

      if (!resposta.ok || !dados.advice) {
        setErro(dados.message ?? "A IA não conseguiu avaliar os dois artigos.");
        return;
      }

      setAdvice(dados.advice);
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setLendo(false);
    }
  }

  if (disponivel !== true) return null;

  const pedido = montarPedidoDeComparacao(a, b);
  const cortado = pedido.a.truncated || pedido.b.truncated;

  const mantido = advice?.manter === a.id ? a : advice?.manter === b.id ? b : null;
  const outro = mantido === a ? b : mantido === b ? a : null;

  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">A IA lê os dois e diz o que fazer</p>
      </div>

      <div className="space-y-4 p-5">
        {!advice && !lendo && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O que está acima é <strong>contagem de palavras</strong>. Aqui ela lê os dois textos
              e responde se cobrem a mesma dúvida, qual deveria ficar e o que precisa ser levado
              junto.
              {cortado && " Um dos artigos é longo e vai cortado, e ela avisa quando isso pesar."}
            </p>

            <Button type="button" size="sm" onClick={avaliar}>
              <Sparkles className="mr-2 h-4 w-4" />
              Avaliar os dois
            </Button>
          </div>
        )}

        {lendo && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Lendo os dois artigos...
          </p>
        )}

        {erro && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {erro}
          </p>
        )}

        {advice && (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${APARENCIA[advice.relacao].classe}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {APARENCIA[advice.relacao].rotulo}
                </Badge>
                {/*
                  A procedência vai no achado, como em todo lugar: isto é
                  proposta de modelo, e não medição do produto.
                */}
                <span className="text-xs text-muted-foreground">Proposta da IA</span>
              </div>

              <p className="mt-2 text-sm leading-6">{advice.motivo}</p>
            </div>

            {mantido && outro && (
              <div className="rounded-lg border border-border/70 p-4">
                <p className="text-xs font-medium text-muted-foreground">Se forem unidos</p>

                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{mantido.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">fica</span>
                </p>

                {advice.levarJunto.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      O que precisa ser levado de &ldquo;{outro.title}&rdquo;
                    </p>

                    {/*
                      A parte mais útil da resposta: é o que se perderia unindo
                      sem cuidado, e é justamente o que ninguém vê comparando
                      dois textos longos de relance.
                    */}
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {advice.levarJunto.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-muted-foreground">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <p className="text-sm">
              <strong>Recomendação:</strong> {advice.recomendacao}
            </p>

            <p className="text-xs text-muted-foreground">
              A IA não altera nada. Unir, arquivar ou deixar como está continua sendo decisão sua.
              {cortado && " Um dos artigos foi enviado em parte, por ser longo."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
