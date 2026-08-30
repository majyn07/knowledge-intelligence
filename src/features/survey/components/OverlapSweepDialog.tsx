"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { montarPedidoDeComparacao } from "@/features/library/compare/mergeRequest";
import type { OverlapPair } from "@/features/survey/overlap";
import { contar } from "@/lib/plural";
import type { MergeAdvice, Relacao } from "@/services/ai/library/mergeAdvice";

/**
 * Avaliar as sobreposições em lote.
 *
 * O Levantamento aponta 137 pares no acervo real, e a tela de comparação lê um
 * par por vez. Percorrer 137 à mão é o trabalho manual que este produto existe
 * para deixar de ser manual — é a mesma lição da sugestão de seção, que saiu de
 * "abra e classifique" para "aqui está a lista".
 *
 * **Um pedido por par, e não há como agrupar.** Cada par leva os dois textos
 * inteiros: dois pares num pedido só seriam quatro artigos, e a resposta viria
 * cortada sem ninguém saber que veio. Então a varredura é em série, com o preço
 * na tela e um teto que quem roda escolhe.
 *
 * **É o mesmo pedido da tela de comparação**, de propósito. Um pedido menor aqui
 * responderia mais rápido e diria outra coisa, e quem abrisse o par depois de
 * ver "complementares" na lista encontraria "mesmo assunto" na tela. Duas
 * respostas do mesmo vocabulário divergem, e a divergência é a que ninguém sabe
 * qual acreditar.
 */

interface Avaliado {
  par: OverlapPair;
  advice: MergeAdvice;
}

/** Quantos pares por padrão. Os mais parecidos primeiro: a lista já vem ordenada. */
const TETO_PADRAO = 20;

/**
 * Pausa entre um par e o seguinte.
 *
 * Não é educação com o servidor, como na varredura do portal: aqui é
 * necessidade. Cada par leva os dois artigos inteiros, e dois pedidos desse
 * tamanho em sequência estouram o limite de taxa do provedor — medido contra a
 * conta real, a varredura parou no **segundo** par com 429.
 */
const PAUSA_MS = 6_000;

/**
 * Quanto esperar antes da segunda chance, quando o servidor diz que ela vale.
 *
 * Uma vez só. Limite estourado e provedor sobrecarregado são transitórios por
 * natureza, e derrubar a varredura inteira num soluço desperdiça tudo que já foi
 * lido; insistir para sempre transformaria um provedor fora do ar numa varredura
 * que nunca termina.
 */
const ESPERA_DO_LIMITE_MS = 45_000;

/** Quanto um par costuma levar, medido: leitura de dois artigos mais a pausa. */
const SEGUNDOS_POR_PAR = 32;

const esperar = (ms: number) => new Promise((resolva) => setTimeout(resolva, ms));

const APARENCIA: Record<Relacao, { rotulo: string; classe: string }> = {
  "mesmo-assunto": { rotulo: "Mesma dúvida", classe: "border-amber-500/40 bg-amber-500/10" },
  complementares: { rotulo: "Complementares", classe: "border-primary/40 bg-primary/5" },
  "assuntos-diferentes": { rotulo: "Assuntos diferentes", classe: "border-border/70" },
};

export function OverlapSweepDialog({
  pares,
  aberto,
  aoFechar,
}: {
  pares: OverlapPair[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [teto, setTeto] = useState(TETO_PADRAO);
  const [avaliados, setAvaliados] = useState<Avaliado[]>([]);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [esperando, setEsperando] = useState(false);

  /*
    Parar no meio precisa ser possível: são um pedido por par, e quem começou
    137 pode mudar de ideia no terceiro.
  */
  const parar = useRef(false);

  const aVarrer = useMemo(() => pares.slice(0, teto), [pares, teto]);

  /*
    Fechar para a varredura.

    Sem isso ela seguia em segundo plano, gastando um pedido por par contra o
    provedor depois de a pessoa ter saído da tela — e sem nada dizendo que ainda
    estava acontecendo. O que já foi avaliado continua guardado, e reabrir mostra.
  */
  function fechar() {
    parar.current = true;
    aoFechar();
  }

  /** Um par pelo servidor. O erro sobe para quem chamou decidir se continua. */
  async function avaliarPar(par: OverlapPair): Promise<MergeAdvice> {
    const resposta = await fetch("/api/library/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(montarPedidoDeComparacao(par.a, par.b)),
    });

    const dados: { advice?: MergeAdvice; message?: string; retriable?: boolean } =
      await resposta.json();

    if (!resposta.ok || !dados.advice) {
      const falha = new Error(dados.message ?? "Não foi possível avaliar o par.");
      /*
        Quem diz se vale tentar de novo é o **servidor**, num campo próprio.
        Deduzir do código não separa limite estourado de provedor mal
        configurado (os dois já responderam 503 aqui), e deduzir do texto
        amarraria o laço a uma frase escrita para quem lê a tela.
      */
      if (dados.retriable === true) falha.name = "PodeTentarDeNovo";
      throw falha;
    }

    return dados.advice;
  }

  /**
   * Um par, com uma segunda chance quando o servidor diz que ela vale.
   *
   * Não é laço: uma tentativa a mais. Prazo estourado e chave recusada não
   * melhoram esperando, e o servidor já os marca como não repetíveis.
   */
  async function avaliarComSegundaChance(par: OverlapPair): Promise<MergeAdvice> {
    try {
      return await avaliarPar(par);
    } catch (falha) {
      if (!(falha instanceof Error) || falha.name !== "PodeTentarDeNovo" || parar.current) {
        throw falha;
      }

      setEsperando(true);
      await esperar(ESPERA_DO_LIMITE_MS);
      setEsperando(false);

      /*
        Conferido de novo **depois** da espera. São quarenta e cinco segundos, e
        quem clicou em parar durante eles clicou justamente porque a varredura
        estava demorando: sair da espera e disparar mais um pedido é o botão de
        parar não parando.
      */
      if (parar.current) throw falha;

      return avaliarPar(par);
    }
  }

  async function varrer() {
    parar.current = false;
    setErro(null);
    setAvaliados([]);
    setProgresso({ feitos: 0, total: aVarrer.length });

    const acumulados: Avaliado[] = [];

    for (let i = 0; i < aVarrer.length; i += 1) {
      if (parar.current) break;

      /*
        A pausa vai **antes** do próximo, e não depois do último: esperar seis
        segundos para então dizer que terminou é seis segundos de nada.
      */
      if (i > 0) await esperar(PAUSA_MS);
      if (parar.current) break;

      try {
        acumulados.push({ par: aVarrer[i], advice: await avaliarComSegundaChance(aVarrer[i]) });
      } catch (falha) {
        /*
          O que já veio não se perde. Depois de trinta pares avaliados, perder
          tudo por causa do trigésimo primeiro seria jogar fora revisão pronta:
          a tela guarda e diz onde parou.
        */
        setErro(
          `${falha instanceof Error ? falha.message : "Falha ao avaliar"}, parou no par ${
            i + 1
          } de ${aVarrer.length}.${
            /*
              Nada avaliado não promete lista nenhuma: "os 0 pares já avaliados
              continuam abaixo" aponta para um vazio, e mandar alguém olhar o
              que não existe é o que faz desconfiar da tela.
            */
            acumulados.length === 0
              ? ""
              : acumulados.length === 1
                ? " O par já avaliado continua abaixo."
                : ` Os ${acumulados.length} pares já avaliados continuam abaixo.`
          }`
        );
        break;
      }

      setAvaliados([...acumulados]);
      setProgresso({ feitos: i + 1, total: aVarrer.length });
    }

    setProgresso(null);
    setEsperando(false);
  }

  const rodando = progresso !== null;

  /*
    Os que pedem decisão vêm primeiro. "Assuntos diferentes" é o resultado mais
    comum e o que menos rende olhar, e deixá-lo no topo faria alguém desistir da
    lista antes de chegar ao que importa.
  */
  const ordenados = useMemo(() => {
    const peso: Record<Relacao, number> = {
      "mesmo-assunto": 0,
      complementares: 1,
      "assuntos-diferentes": 2,
    };

    return [...avaliados].sort((x, y) => peso[x.advice.relacao] - peso[y.advice.relacao]);
  }, [avaliados]);

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && fechar()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar os artigos que se sobrepõem</DialogTitle>
          <DialogDescription>
            A IA lê cada par e diz se cobrem a mesma dúvida. Ela não une nada: unir, arquivar ou
            deixar como está continua sendo decisão de quem revisa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O Levantamento encontrou {contar(pares.length, "par", "pares")} por vocabulário em comum. Cada
            par custa <strong>um pedido</strong> ao provedor, porque leva os dois textos: não dá
            para agrupar. Os mais parecidos vêm primeiro.
          </p>

          {!rodando && avaliados.length === 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Avaliar os</span>

              {[10, 20, 50, pares.length].map((opcao) => (
                <Button
                  key={opcao}
                  type="button"
                  size="sm"
                  variant={teto === opcao ? "default" : "outline"}
                  onClick={() => setTeto(opcao)}
                  disabled={opcao > pares.length}
                >
                  {opcao >= pares.length ? `todos os ${pares.length}` : opcao}
                </Button>
              ))}

              <span className="text-sm">mais parecidos.</span>
            </div>
          )}

          {/*
            O preço vai antes do clique, como no diálogo de importação do
            portal. Um pedido por par mais a pausa entre eles: quem escolhe
            "todos os 137" precisa saber que são mais de uma hora.
          */}
          {!rodando && avaliados.length === 0 && aVarrer.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Leva cerca de{" "}
              <strong>
                {contar(Math.max(1, Math.round((aVarrer.length * SEGUNDOS_POR_PAR) / 60)), "minuto")}
              </strong>
              , em série. Dá para parar no meio, e o que já foi lido continua na tela.
            </p>
          )}

          {rodando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {/*
                A espera do limite é dita, e não escondida atrás do mesmo giro:
                quarenta e cinco segundos sem explicação leem como travado, e
                quem fecha a tela perde o que já foi lido.
              */}
              {esperando
                ? "O provedor pediu para esperar. Retomando em instantes..."
                : `Lendo o par ${progresso.feitos + 1} de ${progresso.total}`}
            </p>
          )}

          {erro && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {erro}
            </p>
          )}

          <div className="space-y-3">
            {ordenados.map(({ par, advice }) => (
              <div
                key={`${par.a.id}-${par.b.id}`}
                className={`rounded-lg border p-4 ${APARENCIA[advice.relacao].classe}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-medium">
                    {APARENCIA[advice.relacao].rotulo}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(par.score * 100)}% do vocabulário
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium">{par.a.title}</p>
                <p className="text-sm font-medium">{par.b.title}</p>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">{advice.motivo}</p>

                {advice.levarJunto.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {contar(advice.levarJunto.length, "item")} se perderia numa união descuidada.
                  </p>
                )}

                <Link
                  href={`/library/comparar?a=${par.a.id}&b=${par.b.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Comparar lado a lado
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          {rodando ? (
            <Button variant="outline" onClick={() => (parar.current = true)}>
              Parar após este par
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={fechar}>
                Fechar
              </Button>
              <Button onClick={varrer} disabled={aVarrer.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" />
                Avaliar {contar(aVarrer.length, "par", "pares")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
