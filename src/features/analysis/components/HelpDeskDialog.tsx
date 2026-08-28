"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  planejarVarredura,
  type ConversaListada,
  type PlanoDeVarredura,
} from "@/services/hubspot/helpDeskSchedule";
import {
  ATALHOS,
  ATALHO_PADRAO,
  janelaInvalida,
  resolverJanela,
  rotuloDaJanela,
  type Janela,
} from "@/services/hubspot/searchWindow";

import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { RelativeDate } from "@/components/common/RelativeDate";

import { useTickets } from "../providers/TicketsProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { gravarEstado, lerEstado } from "../autoSyncRepository";

/**
 * Buscar os atendimentos na caixa do suporte.
 *
 * Exportar do CRM para importar aqui não faz sentido quando a API responde, e
 * ela responde: o objeto de ticket está bloqueado, mas a conversa que o gerou
 * não, e é ela que traz o assunto, o diálogo inteiro e as datas.
 *
 * A varredura é em duas passadas porque as duas custam coisas diferentes. A
 * listagem é barata, cem conversas por requisição, e diz o que existe; a leitura é
 * cara, uma requisição por conversa, e só visita o que a janela alcança e o que
 * mudou desde a última vez.
 */

type Etapa = "inicio" | "listando" | "planejado" | "lendo" | "fim";

interface Progresso {
  conversas: number;
  lidos: number;
  trazidos: number;
  falhas: number;
}

const VAZIO: Progresso = { conversas: 0, lidos: 0, trazidos: 0, falhas: 0 };

/** Quantos conversas por lote de leitura. O servidor recusa acima disso. */
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
  const { events } = useActivity();

  /**
   * A última busca, de quem quer que tenha feito.
   *
   * A leitura é compartilhada: ela grava no banco de todos, e quem rodar depois
   * vê "já estão aqui e em dia" e não relê nada. Mas a **listagem** repete: são
   * ~110 páginas para varrer três meses, toda vez que alguém clica, mesmo que
   * não haja nada novo. Com catorze pessoas curiosas isso vira mil e quinhentas
   * requisições ao CRM para descobrir que não há o que fazer.
   *
   * Então a tela diz quando foi a última e quem fez, antes de qualquer clique.
   * Não bloqueia: quem quiser conferir de novo confere.
   */
  const ultimaBusca = useMemo(
    () =>
      events.find(
        (evento) => evento.subject.kind === "ticket" && evento.subject.id === "help-desk"
      ),
    [events]
  );

  const [etapa, setEtapa] = useState<Etapa>("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanoDeVarredura | null>(null);
  const [progresso, setProgresso] = useState<Progresso>(VAZIO);
  /*
    A janela era uma lista de meses, de 1 a 12, e o mês é grande demais para a
    pergunta mais comum: quem acabou de atender quer o dia, e quem volta de
    segunda quer a semana. Puxar um mês para achar o que caiu ontem custa cento
    e dez páginas de listagem contra o servidor do suporte.
  */
  const [janela, setJanela] = useState<Janela>({ tipo: "atalho", id: ATALHO_PADRAO });
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  /*
    Um teto de quantos ler, e não só de qual período.
    
    Três meses da caixa do suporte são quase onze mil conversas, e ler todos custa
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
        suporte tem mais de setenta mil conversas e a lista sai do mais antigo:
        alcançar o mês corrente sem filtrar custaria mais de mil requisições.
        Com a janela, três meses são 110 páginas.
      */
      const periodo = resolverJanela(
        janela.tipo === "intervalo" ? { tipo: "intervalo", de, ate } : janela,
        new Date()
      );

      if (janelaInvalida(periodo)) {
        setErro(periodo.erro);
        setEtapa("inicio");
        return;
      }

      const { desde, ate: fim } = periodo;
      const conversas: ConversaListada[] = [];

      for (const caixa of caixas) {
        let cursor: string | undefined;

        do {
          if (parar.current) break;

          const query = new URLSearchParams({ caixa, desde });
          if (cursor) query.set("apos", cursor);

          const pagina = await pedir(`/api/hubspot/help-desk?${query}`);

          conversas.push(...((pagina.conversas as ConversaListada[]) ?? []));
          cursor = (pagina.proxima as string | null) ?? undefined;

          setProgresso((atual) => ({ ...atual, conversas: conversas.length }));
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

      setPlano(planejarVarredura(conversas, conhecidos, desde, fim));
      setEtapa("planejado");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível listar.");
      setEtapa("inicio");
    }
  }

  /** Segunda passada: lê as conversas do plano, em lotes, e grava de uma vez. */
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
        const resposta = await pedir("/api/hubspot/help-desk", { conversas: lote });

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

        setProgresso({ conversas: aLer.length, lidos, trazidos: trazidos.length, falhas });
      }

      /*
        Uma escrita só, no fim. Gravar lote a lote deixaria o acervo pela metade
        se um falhasse, e encheria o histórico de linhas iguais.
      */
      importFromHelpDesk(trazidos, rotuloDaJanela(janela));
      await marcarBusca();
      setEtapa("fim");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A leitura foi interrompida.");

      /* O que já veio não se perde: quem esperou minutos não recomeça do zero. */
      if (trazidos.length > 0) importFromHelpDesk(trazidos, rotuloDaJanela(janela));

      /*
        Marca mesmo tendo sido interrompida, e de propósito. O que já entrou
        entrou, e não marcar faria a próxima busca automática recuar até a
        execução anterior, relendo tudo que esta já trouxe.
      */
      await marcarBusca();
      setEtapa("fim");
    }
  }

  /**
   * Registra que houve busca agora.
   *
   * É daqui que a busca automática sabe até onde já foi. Sem o carimbo ela não
   * tem de onde partir, e a regra é não escolher uma janela por conta própria:
   * disparar contra o servidor do suporte um tamanho que ninguém pediu é o que
   * este produto evita em todo lugar.
   *
   * Falhar aqui não derruba a busca que acabou de dar certo. A política recusa
   * quem não administra, e quem não administra nem chegou até aqui; se recusar
   * por outro motivo, o pior caso é a próxima automática recuar demais, e o
   * plano de varredura já pula o que não mudou.
   */
  async function marcarBusca() {
    const atual = (await lerEstado()) ?? { ligado: false, ultimaEm: "" };

    await gravarEstado({ ...atual, ultimaEm: new Date().toISOString() });
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
            <div className="space-y-2">
              <p className="text-sm">Trazer os últimos</p>

              <div className="flex flex-wrap gap-1.5">
                {ATALHOS.map((atalho) => (
                  <Button
                    key={atalho.id}
                    size="sm"
                    variant={
                      janela.tipo === "atalho" && janela.id === atalho.id ? "default" : "outline"
                    }
                    onClick={() => setJanela({ tipo: "atalho", id: atalho.id })}
                  >
                    {atalho.label}
                  </Button>
                ))}

                {/*
                  O intervalo livre existe para o que os atalhos não alcançam:
                  "só agosto de 2025" não é uma janela contada para trás a
                  partir de hoje, e forçá-la num atalho traria dez meses para
                  achar um.
                */}
                <Button
                  size="sm"
                  variant={janela.tipo === "intervalo" ? "default" : "outline"}
                  onClick={() => setJanela({ tipo: "intervalo", de, ate })}
                >
                  Escolher datas
                </Button>
              </div>

              {janela.tipo === "intervalo" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="date"
                    aria-label="Data inicial"
                    className="h-8 rounded-lg border border-border/70 bg-muted/40 px-2 text-sm"
                    value={de}
                    onChange={(evento) => setDe(evento.target.value)}
                  />

                  <span className="text-sm text-muted-foreground">até</span>

                  <input
                    type="date"
                    aria-label="Data final"
                    className="h-8 rounded-lg border border-border/70 bg-muted/40 px-2 text-sm"
                    value={ate}
                    onChange={(evento) => setAte(evento.target.value)}
                  />
                </div>
              )}
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              A listagem sai sempre do mais antigo, então descobrir o que existe leva alguns
              minutos mesmo para uma janela curta. Depois disso, só as conversas da janela são lidos,
              e reexecutar pula o que não mudou.
            </p>

            {ultimaBusca && (
              <p className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-xs leading-5 text-muted-foreground">
                Última busca <RelativeDate value={ultimaBusca.at} />
                {ultimaBusca.actor ? `, por ${ultimaBusca.actor}` : ""}: {ultimaBusca.detail}.
                <br />
                O que ela trouxe já está aqui para todo mundo. Buscar de novo só vale se algo
                mudou desde então.
              </p>
            )}

            <Button onClick={listar} className="w-full">
              Ver o que há nas caixas
            </Button>
          </div>
        )}

        {etapa === "listando" && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Listando as caixas… {progresso.conversas.toLocaleString("pt-BR")} conversas até agora
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
              {progresso.conversas.toLocaleString("pt-BR")} lidos
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
                {progresso.falhas} conversa(s) falharam e ficaram para trás. Rodar de novo tenta só
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

/**
 * O botão, que só aparece para quem administra.
 *
 * A porta de verdade é a rota, que confere no servidor: esconder um botão não
 * controla nada, quem sabe o endereço chama direto. Aqui é sobre não oferecer o
 * que vai ser recusado — botão que às vezes leva a um erro é pior que botão que
 * não está lá, e é a mesma regra do entrar com a conta Google.
 *
 * Some em vez de ficar desabilitado porque não há nada a fazer para habilitá-lo:
 * quem não administra não vira administrador clicando.
 */
export function HelpDeskButton({ onClick }: { onClick: () => void }) {
  const { souAdministrador } = usePeople();

  if (!souAdministrador) return null;

  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="mr-1.5 h-4 w-4" />
      Buscar na HubSpot
    </Button>
  );
}
