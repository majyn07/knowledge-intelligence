"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Loader2, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject } from "@/providers/ProjectProvider";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";
import {
  janelaDeMeses,
  MESES_PADRAO,
  planejarVarredura,
  type FioListado,
  type PlanoDeVarredura,
} from "@/services/hubspot/helpDeskSchedule";

import { useTickets } from "../providers/TicketsProvider";

/**
 * Buscar os atendimentos na caixa do suporte.
 *
 * Exportar do CRM para importar aqui não faz sentido quando a API responde, e
 * ela responde: o objeto de ticket está bloqueado, mas a conversa que o gerou
 * não, e é ela que traz o assunto, o diálogo inteiro e as datas.
 *
 * A varredura é em duas passadas porque as duas custam coisas diferentes. A
 * listagem é barata, cem fios por requisição, e diz o que existe; a leitura é
 * cara, uma requisição por fio, e só visita o que a janela alcança e o que
 * mudou desde a última vez.
 */

type Etapa = "inicio" | "listando" | "planejado" | "lendo" | "fim";

interface Progresso {
  fios: number;
  lidos: number;
  trazidos: number;
  falhas: number;
}

const VAZIO: Progresso = { fios: 0, lidos: 0, trazidos: 0, falhas: 0 };

/** Quantos fios por lote de leitura. O servidor recusa acima disso. */
const POR_LOTE = 20;

/**
 * Quantos atendimentos uma busca traz.
 *
 * O padrão é pequeno de propósito, e a carga grande continua disponível. Três
 * meses da caixa do suporte são quase onze mil, e cada um custa três idas ao
 * CRM de produção: começar por trinta faz a escolha do tamanho ser deliberada,
 * e não consequência de abrir a tela e clicar.
 *
 * Sem trava, porque um dia a carga inteira vai ser o que se quer, e limite
 * escrito no código vira obstáculo justamente nesse dia.
 */
const TETOS = [10, 30, 100, 500];
const TETO_PADRAO = 30;

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <p className="text-lg font-semibold tabular-nums">{valor.toLocaleString("pt-BR")}</p>
      <p className="text-[11px] leading-4 text-muted-foreground">{rotulo}</p>
    </div>
  );
}

export function HelpDeskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tickets, importFromHelpDesk } = useTickets();
  const { activeProjectId } = useProject();

  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanoDeVarredura | null>(null);
  const [progresso, setProgresso] = useState<Progresso>(VAZIO);
  const [meses, setMeses] = useState(MESES_PADRAO);

  /*
    Um teto de quantos ler, e não só de qual período.
    
    Três meses da caixa do suporte são quase onze mil fios, e ler todos custa
    horas contra o CRM de produção. Quem quer ver como fica, ou mostrar para a
    equipe, precisa de uma amostra: sem teto a única opção é começar tudo e
    parar no meio, o que dá no mesmo e assusta mais.

    A fila já sai do mais recente, então o teto corta o passado, não o presente.
  */
  const [teto, setTeto] = useState<number | null>(TETO_PADRAO);

  /*
    A parada é um `ref` e não estado: o laço lê o valor a cada volta, e estado
    ficaria congelado no fechamento em que o laço começou.
  */
  const parar = useRef(false);

  const fechar = useCallback(
    (aberto: boolean) => {
      if (!aberto) {
        parar.current = true;
        setEtapa("inicio");
        setPlano(null);
        setProgresso(VAZIO);
        setErro(null);
      }

      onOpenChange(aberto);
    },
    [onOpenChange]
  );

  async function pedir(caminho: string, corpo?: unknown) {
    const resposta = await fetch(caminho, {
      method: corpo ? "POST" : "GET",
      ...(corpo ? { headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) } : {}),
    });

    const dados: unknown = await resposta.json();

    if (!resposta.ok) {
      const mensagem =
        typeof dados === "object" && dados !== null && "message" in dados
          ? String((dados as { message: unknown }).message)
          : "Não foi possível falar com a HubSpot.";

      throw new Error(mensagem);
    }

    return dados as Record<string, unknown>;
  }

  /** Primeira passada: lista o que existe nas caixas e monta o plano. */
  async function listar() {
    parar.current = false;
    setErro(null);
    setEtapa("listando");
    setProgresso(VAZIO);

    try {
      const inicio = await pedir("/api/hubspot/help-desk");
      const caixas = (inicio.caixas as string[]) ?? [];

      /*
        A janela vai para o servidor, e é o que torna isto viável. A caixa do
        suporte tem mais de setenta mil fios e a lista sai do mais antigo:
        alcançar o mês corrente sem filtrar custaria mais de mil requisições.
        Com a janela, três meses são 110 páginas.
      */
      const desde = janelaDeMeses(new Date(), meses);
      const fios: FioListado[] = [];

      for (const caixa of caixas) {
        let cursor: string | undefined;

        do {
          if (parar.current) break;

          const query = new URLSearchParams({ caixa, desde });
          if (cursor) query.set("apos", cursor);

          const pagina = await pedir(`/api/hubspot/help-desk?${query}`);

          fios.push(...((pagina.fios as FioListado[]) ?? []));
          cursor = (pagina.proxima as string | null) ?? undefined;

          setProgresso((atual) => ({ ...atual, fios: fios.length }));
        } while (cursor);
      }

      /*
        O que já está aqui, com o carimbo da última varredura. É por ele que a
        próxima passada pula o que não mudou, e é o que faz reexecutar ser
        barato o bastante para virar hábito.
      */
      const conhecidos = tickets
        .filter((ticket) => ticket.source?.provider === "hubspot")
        .map((ticket) => ({
          externalId: ticket.source?.externalId ?? "",
          ultimaMensagemEm: String(ticket.raw?.ultimaMensagemEm ?? ""),
        }));

      setPlano(planejarVarredura(fios, conhecidos, desde));
      setEtapa("planejado");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível listar.");
      setEtapa("inicio");
    }
  }

  /** Segunda passada: lê os fios do plano, em lotes, e grava de uma vez. */
  async function ler() {
    if (!plano) return;

    parar.current = false;
    setErro(null);
    setEtapa("lendo");

    const trazidos: { ticket: Ticket; conversation: SupportConversation }[] = [];
    let lidos = 0;
    let falhas = 0;

    try {
      const aLer = teto === null ? plano.visitar : plano.visitar.slice(0, teto);

      for (let inicio = 0; inicio < aLer.length; inicio += POR_LOTE) {
        if (parar.current) break;

        const lote = aLer.slice(inicio, inicio + POR_LOTE);
        const resposta = await pedir("/api/hubspot/help-desk", { fios: lote });

        const atendimentos = (resposta.atendimentos as Record<string, never>[]) ?? [];
        falhas += Number(resposta.falhas ?? 0);
        lidos += lote.length;

        for (const bruto of atendimentos) {
          const dados = bruto as unknown as {
            ticket: { externalId: string; title: string; solution: string; date: string };
            messages: SupportConversation["messages"];
            contato?: { nome: string; empresa: string };
            raw: Record<string, unknown>;
          };

          const id = `hs-${dados.ticket.externalId}`;

          trazidos.push({
            ticket: {
              id,
              projectId: activeProjectId ?? "",
              title: dados.ticket.title,
              solution: dados.ticket.solution,
              /*
                A empresa vem do contato associado. É dado pessoal, e entrou por
                pedido explícito de quem conduz o projeto: sem ela não dá para
                reencontrar o atendimento na HubSpot, que é o que a equipe faz.
              */
              company: dados.contato?.empresa ?? "",
              date: dados.ticket.date,
              source: {
                provider: "hubspot",
                externalId: dados.ticket.externalId,
                importedAt: new Date().toISOString(),
              },
              raw: dados.raw,
            },
            conversation: {
              id: `conv-${dados.ticket.externalId}`,
              ticketId: id,
              messages: dados.messages,
              source: {
                provider: "hubspot",
                externalId: dados.ticket.externalId,
                importedAt: new Date().toISOString(),
              },
            },
          });
        }

        setProgresso({ fios: aLer.length, lidos, trazidos: trazidos.length, falhas });
      }

      /*
        Uma escrita só, no fim. Gravar lote a lote deixaria o acervo pela metade
        se um falhasse, e encheria o histórico de linhas iguais.
      */
      importFromHelpDesk(trazidos);
      setEtapa("fim");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A leitura foi interrompida.");

      /* O que já veio não se perde: quem esperou minutos não recomeça do zero. */
      if (trazidos.length > 0) importFromHelpDesk(trazidos);
      setEtapa("fim");
    }
  }

  const lendo = etapa === "listando" || etapa === "lendo";

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar atendimentos na HubSpot</DialogTitle>
          <DialogDescription>
            Lê as caixas do suporte, só leitura. O atendimento entra como veio e não se edita
            aqui.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        )}

        {etapa === "inicio" && (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Trazer os últimos</span>
              <select
                className="h-8 rounded-lg border border-border/70 bg-muted/40 px-2 text-sm"
                value={meses}
                onChange={(evento) => setMeses(Number(evento.target.value))}
              >
                {[1, 3, 6, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "mês" : "meses"}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs leading-5 text-muted-foreground">
              A listagem sai sempre do mais antigo, então descobrir o que existe leva alguns
              minutos mesmo para uma janela curta. Depois disso, só os fios da janela são lidos,
              e reexecutar pula o que não mudou.
            </p>

            <Button onClick={listar} className="w-full">
              Ver o que há nas caixas
            </Button>
          </div>
        )}

        {etapa === "listando" && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Listando as caixas… {progresso.fios.toLocaleString("pt-BR")} fios até agora
            </p>

            <Button variant="outline" className="w-full" onClick={() => (parar.current = true)}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Parar
            </Button>
          </div>
        )}

        {etapa === "planejado" && plano && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Numero valor={plano.novos} rotulo="novos" />
              <Numero valor={plano.mudaram} rotulo="mudaram desde a última vez" />
              <Numero valor={plano.emDia} rotulo="já estão aqui e em dia" />
              <Numero valor={plano.foraDaJanela} rotulo="fora da janela" />
            </div>

            {plano.visitar.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada a trazer: tudo que está na janela já está aqui e em dia.
              </p>
            ) : (
              <>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Ler no máximo</span>
                  <select
                    className="h-8 rounded-lg border border-border/70 bg-muted/40 px-2 text-sm"
                    value={teto === null ? "tudo" : String(teto)}
                    onChange={(evento) =>
                      setTeto(evento.target.value === "tudo" ? null : Number(evento.target.value))
                    }
                  >
                    {TETOS.map((n) => (
                      <option key={n} value={n}>
                        {n} mais recentes
                      </option>
                    ))}
                    <option value="tudo">
                      todos os {plano.visitar.length.toLocaleString("pt-BR")}
                    </option>
                  </select>
                </label>

                <p className="text-xs leading-5 text-muted-foreground">
                  Do mais recente para o mais antigo, então o teto corta o passado. Cada
                  atendimento custa três idas à HubSpot, e dá para parar no meio: o que já
                  veio fica.
                </p>

                <Button onClick={ler} className="w-full">
                  <Download className="mr-1.5 h-4 w-4" />
                  Ler{" "}
                  {Math.min(teto ?? plano.visitar.length, plano.visitar.length).toLocaleString(
                    "pt-BR"
                  )}{" "}
                  atendimento(s)
                </Button>
              </>
            )}
          </div>
        )}

        {etapa === "lendo" && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progresso.lidos.toLocaleString("pt-BR")} de{" "}
              {progresso.fios.toLocaleString("pt-BR")} lidos
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Numero valor={progresso.trazidos} rotulo="viraram atendimento" />
              <Numero valor={progresso.falhas} rotulo="falharam" />
            </div>

            <Button variant="outline" className="w-full" onClick={() => (parar.current = true)}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Parar depois deste lote
            </Button>
          </div>
        )}

        {etapa === "fim" && (
          <div className="space-y-3">
            <p className="text-sm">
              {progresso.trazidos.toLocaleString("pt-BR")} atendimento(s) trazidos, com a conversa
              junto.
            </p>

            {progresso.falhas > 0 && (
              <p className="text-xs text-muted-foreground">
                {progresso.falhas} fio(s) falharam e ficaram para trás. Rodar de novo tenta só
                eles.
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={() => fechar(false)}>
              Fechar
            </Button>
          </div>
        )}

        {lendo && (
          <p className="text-[11px] leading-4 text-muted-foreground">
            Não feche esta aba: o que já veio fica, mas a parte não visitada precisa ser refeita.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function HelpDeskButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="mr-1.5 h-4 w-4" />
      Buscar na HubSpot
    </Button>
  );
}
