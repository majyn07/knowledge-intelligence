"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";

import { RelativeDate } from "@/components/common/RelativeDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { MergeAdvice, Relacao } from "@/services/ai/library/mergeAdvice";

import { montarPedidoDeComparacao } from "../compare/mergeRequest";
import { chaveDoPar, impressaoDoPedido } from "../compare/savedVerdict";
import { useSavedVerdicts } from "../compare/useSavedVerdicts";

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
 *
 * **O veredito é o mesmo da varredura do Levantamento, e fica guardado.** Quem
 * abre um par que a varredura já leu vê a resposta sem pagar outro pedido; e o
 * que se avalia aqui entra na varredura como já lido.
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
  const [naoGuardou, setNaoGuardou] = useState<string | null>(null);
  const { vereditos, guardar } = useSavedVerdicts("sobreposicao");
  const { currentPerson } = usePeople();

  const pedido = useMemo(() => montarPedidoDeComparacao(a, b), [a, b]);
  const salvo = vereditos.get(chaveDoPar(a.id, b.id)) ?? null;
  const salvoVale = salvo !== null && salvo.fingerprint === impressaoDoPedido(pedido);

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
    setNaoGuardou(null);
  }, [a.id, b.id]);

  async function avaliar() {
    setLendo(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/library/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      const dados: { advice?: MergeAdvice; message?: string } = await resposta.json();

      if (!resposta.ok || !dados.advice) {
        setErro(dados.message ?? "A IA não conseguiu avaliar os dois artigos.");
        return;
      }

      setAdvice(dados.advice);

      setNaoGuardou(
        await guardar({
          kind: "sobreposicao",
          subject: chaveDoPar(a.id, b.id),
          fingerprint: impressaoDoPedido(pedido),
          advice: dados.advice,
          actorId: "",
          actorLabel: currentPerson,
          at: new Date().toISOString(),
        })
      );
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setLendo(false);
    }
  }

  /*
    O guardado aparece mesmo sem provedor configurado: ler o que a equipe já
    avaliou não custa pedido nenhum. Só avaliar de novo depende do provedor.
  */
  const exibido = advice ?? (salvoVale ? salvo.advice : null);
  const deQuem = advice ? null : salvoVale ? salvo : null;

  if (disponivel !== true && !exibido) return null;

  const cortado = pedido.a.truncated || pedido.b.truncated;

  const mantido = exibido?.manter === a.id ? a : exibido?.manter === b.id ? b : null;
  const outro = mantido === a ? b : mantido === b ? a : null;

  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">A IA lê os dois e diz o que fazer</p>
      </div>

      <div className="space-y-4 p-5">
        {!exibido && !lendo && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O que está acima é <strong>contagem de palavras</strong>. Aqui ela lê os dois textos
              e responde se cobrem a mesma dúvida, qual deveria ficar e o que precisa ser levado
              junto.
              {cortado && " Um dos artigos é longo e vai cortado, e ela avisa quando isso pesar."}
            </p>

            {/*
              Vencido é dito, e não escondido: "já foi avaliado, mas o texto
              mudou" é informação, e esconder faria parecer que ninguém olhou.
            */}
            {salvo && !salvoVale && (
              <p className="text-xs text-muted-foreground">
                Este par já foi avaliado
                {salvo.actorLabel ? ` por ${salvo.actorLabel}` : ""}, mas o texto de um dos dois
                mudou desde então, e aquele veredito não vale mais.
              </p>
            )}

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

        {naoGuardou && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {naoGuardou} A resposta abaixo foi lida, mas a equipe não vai encontrá-la guardada.
          </p>
        )}

        {exibido && (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${APARENCIA[exibido.relacao].classe}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {APARENCIA[exibido.relacao].rotulo}
                </Badge>
                {/*
                  A procedência vai no achado, como em todo lugar: isto é
                  proposta de modelo, e não medição do produto. Guardado, diz
                  também quem pediu e quando.
                */}
                <span className="text-xs text-muted-foreground">
                  Proposta da IA
                  {deQuem && (
                    <>
                      {deQuem.actorLabel ? `, pedida por ${deQuem.actorLabel}` : ""}
                      {deQuem.at && (
                        <>
                          {" "}
                          <RelativeDate value={deQuem.at} />
                        </>
                      )}
                    </>
                  )}
                </span>

                {deQuem && disponivel === true && !lendo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 text-xs"
                    onClick={avaliar}
                  >
                    Avaliar de novo
                  </Button>
                )}
              </div>

              <p className="mt-2 text-sm leading-6">{exibido.motivo}</p>
            </div>

            {mantido && outro && (
              <div className="rounded-lg border border-border/70 p-4">
                <p className="text-xs font-medium text-muted-foreground">Se forem unidos</p>

                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{mantido.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">fica</span>
                </p>

                {exibido.levarJunto.length > 0 && (
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
                      {exibido.levarJunto.map((item) => (
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
              <strong>Recomendação:</strong> {exibido.recomendacao}
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
