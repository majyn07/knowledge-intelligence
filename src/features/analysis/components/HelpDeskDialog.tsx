"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Loader2, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProject } from "@/providers/ProjectProvider";
import { planejarVarredura, type PlanoDeVarredura } from "@/services/hubspot/helpDeskSchedule";
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
import { renovarTranca, soltarTranca, tomarTranca } from "../autoSyncRepository";
import {
  buscarClientes,
  caixasDoSuporte,
  lerConversas,
  lerPorCliente,
  lerPorNumeros,
  listarConversas,
  type ContatoEncontrado,
} from "../helpDeskScan";
import { concordar, contar } from "@/lib/plural";

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
  /*
    Por que as conversas lidas não viraram atendimento.

    A tela dizia "0 viraram atendimento" e mais nada. Numa varredura de cem
    conversas do suporte, sem uma falha sequer, isso é indistinguível de
    defeito: não dá para saber se o filtro está certo ou quebrado. Número sem
    motivo é o que ensina alguém a desconfiar da tela.
  */
  descartados: { semChamado: number; semResposta: number; semAssunto: number };
}

const VAZIO: Progresso = {
  conversas: 0,
  lidos: 0,
  trazidos: 0,
  falhas: 0,
  descartados: { semChamado: 0, semResposta: 0, semAssunto: 0 },
};


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
  const { currentPerson } = usePeople();
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

  /*
    Dois modos, ditos na tela: por período, que varre a caixa numa janela, e por
    número do chamado, que traz só aqueles. Alguém com cinco casos de três meses
    atrás precisa do segundo — pela janela seriam dezenas de milhares de
    requisições para achar cinco.
  */
  const [modo, setModo] = useState<"periodo" | "numero" | "cliente">("periodo");

  /*
    Por cliente: busca, lista quem casou, a pessoa escolhe, e só então as
    conversas são lidas. A escolha é a confirmação de conta que faltava — trazer
    pelo primeiro que casasse importaria o cliente errado sem ninguém ver.
  */
  const [termoCliente, setTermoCliente] = useState("");
  const [clientes, setClientes] = useState<ContatoEncontrado[] | null>(null);
  const [clienteEscolhido, setClienteEscolhido] = useState<ContatoEncontrado | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [conversasDoCliente, setConversasDoCliente] = useState<number | null>(null);

  async function procurarCliente() {
    if (termoCliente.trim().length < 3) return;

    setBuscandoCliente(true);
    setErro(null);
    setClienteEscolhido(null);

    try {
      setClientes(await buscarClientes(termoCliente));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível buscar o cliente.");
    } finally {
      setBuscandoCliente(false);
    }
  }

  async function trazerDoCliente() {
    if (!clienteEscolhido) return;

    setErro(null);
    setConversasDoCliente(null);
    setEtapa("lendo");
    setProgresso({ ...VAZIO, conversas: 1 });

    try {
      const { trazidos, falhas, conversas } = await lerPorCliente({
        contactId: clienteEscolhido.id,
        projectId: activeProjectId ?? "",
      });

      importFromHelpDesk(
        trazidos,
        `do cliente ${clienteEscolhido.nome || clienteEscolhido.email || clienteEscolhido.id}`
      );
      setConversasDoCliente(conversas);
      setProgresso({
        conversas,
        lidos: conversas,
        trazidos: trazidos.length,
        falhas,
        descartados: { semChamado: 0, semResposta: 0, semAssunto: 0 },
      });
      setEtapa("fim");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A leitura foi interrompida.");
      setEtapa("fim");
    }
  }
  const [numeros, setNumeros] = useState("");
  const [semConversa, setSemConversa] = useState<string[]>([]);

  /* Aceita "46671834008" e "#46671834008", separados por vírgula, espaço ou linha. */
  const numerosLidos = numeros
    .split(/[\s,;]+/)
    .map((n) => n.replace(/\D/g, ""))
    .filter((n) => n !== "");

  async function trazerPorNumero() {
    if (numerosLidos.length === 0) return;

    setErro(null);
    setSemConversa([]);
    setEtapa("lendo");
    setProgresso({ ...VAZIO, conversas: numerosLidos.length });

    try {
      const { trazidos, falhas, semConversa: faltando } = await lerPorNumeros({
        numeros: numerosLidos,
        projectId: activeProjectId ?? "",
      });

      importFromHelpDesk(trazidos, `pelo número: ${numerosLidos.join(", ")}`);
      setSemConversa(faltando);
      setProgresso({
        conversas: numerosLidos.length,
        lidos: numerosLidos.length,
        trazidos: trazidos.length,
        falhas,
        descartados: { semChamado: 0, semResposta: 0, semAssunto: 0 },
      });
      setEtapa("fim");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A leitura foi interrompida.");
      setEtapa("fim");
    }
  }
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


  /** Primeira passada: lista o que existe nas caixas e monta o plano. */
  async function listar() {
    parar.current = false;
    setErro(null);
    setEtapa("listando");
    setProgresso(VAZIO);

    try {
      const caixas = await caixasDoSuporte();

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

      const conversas = await listarConversas({
        caixas,
        desde,
        aoProgredir: (quantas) => setProgresso((atual) => ({ ...atual, conversas: quantas })),
        parou: () => parar.current,
      });

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

    /*
      Uma varredura por vez, e a tranca é do banco e não desta aba.

      Sem ela, dois administradores com a tela aberta disparam duas varreduras
      contra a mesma caixa, e o servidor do suporte sente as duas somadas. É o
      caso que a pergunta "como impeço que alguém sobrecarregue" quer evitar.
    */
    const tranca = await tomarTranca(currentPerson);

    if (!tranca.tomada) {
      setErro(
        tranca.por === ""
          ? "Já há uma varredura em curso. Espere ela terminar."
          : `${tranca.por} já está com uma varredura em curso. Espere ela terminar.`
      );
      return;
    }

    parar.current = false;
    setErro(null);
    setEtapa("lendo");

    try {
      const aLer = teto === null ? plano.visitar : plano.visitar.slice(0, teto);

      const { trazidos } = await lerConversas({
        visitar: aLer,
        projectId: activeProjectId ?? "",
        /*
          Sinal de vida a cada lote. A tranca sem renovação é dada como
          abandonada, que é o que a devolve quando alguém fecha a aba no meio de
          uma varredura de duas horas.
        */
        aoLote: () => void renovarTranca(currentPerson),
        aoProgredir: (parcial) =>
          setProgresso({
            conversas: aLer.length,
            lidos: parcial.lidos,
            trazidos: parcial.trazidos.length,
            falhas: parcial.falhas,
            descartados: parcial.descartados,
          }),
        parou: () => parar.current,
      });

      /*
        Uma escrita só, no fim. Gravar lote a lote deixaria o acervo pela metade
        se um falhasse, e encheria o histórico de linhas iguais.
      */
      importFromHelpDesk(trazidos, rotuloDaJanela(janela));
      await soltarTranca(true);
      setEtapa("fim");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "A leitura foi interrompida.");

      /*
        Solta a tranca de qualquer jeito, senão uma falha de rede deixaria a
        equipe trancada até o carimbo envelhecer. O que já entrou não se perde:
        `lerConversas` devolve o parcial junto com o erro só quando ela mesma
        para, e quando estoura antes disso não há o que gravar.
      */
      await soltarTranca(false);
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
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={modo === "periodo" ? "default" : "outline"}
                onClick={() => setModo("periodo")}
              >
                Por período
              </Button>
              <Button
                size="sm"
                variant={modo === "numero" ? "default" : "outline"}
                onClick={() => setModo("numero")}
              >
                Por número do chamado
              </Button>
              <Button
                size="sm"
                variant={modo === "cliente" ? "default" : "outline"}
                onClick={() => setModo("cliente")}
              >
                Por cliente
              </Button>
            </div>

            {modo === "cliente" && (
              <div className="space-y-3">
                <p className="text-sm">E-mail, nome, empresa, CPF ou CNPJ do cliente</p>

                <div className="flex gap-2">
                  <input
                    value={termoCliente}
                    onChange={(evento) => setTermoCliente(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter") {
                        evento.preventDefault();
                        void procurarCliente();
                      }
                    }}
                    placeholder="maria@empresa.com.br"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={procurarCliente}
                    disabled={termoCliente.trim().length < 3 || buscandoCliente}
                  >
                    {buscandoCliente ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>

                {clientes && clientes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum contato casou com isso.</p>
                )}

                {clientes && clientes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      Confirme a conta antes de trazer:
                    </p>
                    {clientes.map((c) => (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                          clienteEscolhido?.id === c.id
                            ? "border-primary bg-primary/8"
                            : "border-border/70 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cliente"
                          checked={clienteEscolhido?.id === c.id}
                          onChange={() => setClienteEscolhido(c)}
                          className="mt-1 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{c.nome || "(sem nome)"}</span>
                          {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                          {c.empresa && (
                            <span className="block text-xs text-muted-foreground">{c.empresa}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Acha bem o que veio por chat. No e-mail a conversa raramente fica ligada ao
                  contato — se faltar algo, use o número do chamado.
                </p>
              </div>
            )}

            {modo === "numero" && (
              <div className="space-y-2">
                <p className="text-sm">Números dos chamados, um por linha ou separados por vírgula</p>

                <Textarea
                  value={numeros}
                  onChange={(evento) => setNumeros(evento.target.value)}
                  rows={4}
                  placeholder={"46671834008\n#46671834008"}
                  className="font-mono text-sm"
                />

                <p className="text-xs text-muted-foreground">
                  {numerosLidos.length === 0
                    ? "Aceita com ou sem #. Traz só esses, sem varrer a caixa: uma listagem por número mais a leitura de cada conversa."
                    : `${contar(numerosLidos.length, "chamado")} para trazer. Sem varrer a caixa.`}
                </p>
              </div>
            )}

            {modo === "periodo" && (
            <>
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

            </>
            )}

            {modo === "periodo" ? (
              <Button onClick={listar} className="w-full">
                Ver o que há nas caixas
              </Button>
            ) : modo === "cliente" ? (
              <Button onClick={trazerDoCliente} disabled={!clienteEscolhido} className="w-full">
                <Download className="mr-1.5 h-4 w-4" />
                {clienteEscolhido
                  ? `Trazer as conversas de ${clienteEscolhido.nome || clienteEscolhido.email}`
                  : "Escolha o cliente"}
              </Button>
            ) : (
              <Button
                onClick={trazerPorNumero}
                disabled={numerosLidos.length === 0}
                className="w-full"
              >
                <Download className="mr-1.5 h-4 w-4" />
                Trazer {contar(numerosLidos.length, "chamado")}
              </Button>
            )}
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
                  {concordar(
                    Math.min(teto ?? plano.visitar.length, plano.visitar.length),
                    "atendimento"
                  )}
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

            <MotivoDoDescarte descartados={progresso.descartados} />

            <Button variant="outline" className="w-full" onClick={() => (parar.current = true)}>
              <Square className="mr-1.5 h-3.5 w-3.5" />
              Parar depois deste lote
            </Button>
          </div>
        )}

        {etapa === "fim" && (
          <div className="space-y-3">
            {conversasDoCliente === 0 && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Este contato não tem conversa ligada a ele na HubSpot. Se o atendimento foi por
                e-mail, tente pelo número do chamado.
              </p>
            )}
            {semConversa.length > 0 && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                {semConversa.length === 1
                  ? `O chamado ${semConversa[0]} não tem conversa associada na HubSpot, ou o número não existe.`
                  : `Estes números não têm conversa associada na HubSpot, ou não existem: ${semConversa.join(", ")}.`}
              </p>
            )}
            <p className="text-sm">
              {progresso.trazidos.toLocaleString("pt-BR")}{" "}
              {concordar(progresso.trazidos, "atendimento")}{" "}
              {concordar(progresso.trazidos, "trazido")}, com a conversa junto.
            </p>

            <MotivoDoDescarte descartados={progresso.descartados} />

            {progresso.falhas > 0 && (
              <p className="text-xs text-muted-foreground">
                {contar(progresso.falhas, "conversa")} {concordar(progresso.falhas, "falhou", "falharam")} e
                {" "}
                {concordar(progresso.falhas, "ficou", "ficaram")} para trás. Rodar de novo tenta só
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

/**
 * Por que as conversas lidas não viraram atendimento.
 *
 * Cada motivo pede uma resposta diferente de quem lê, e por isso são três
 * números e não um: **sem chamado** é fluxo que o CRM não tratou como
 * atendimento; **sem resposta do suporte** é o consentimento do WhatsApp, que
 * gera ticket e ninguém respondeu; **sem assunto** é conversa que não dá nem
 * para nomear.
 *
 * Nenhum deles é defeito. Todos são a porta funcionando, e dizê-los é o que
 * separa "a busca não trouxe nada porque não havia nada" de "a busca está
 * quebrada".
 */
function MotivoDoDescarte({
  descartados,
}: {
  descartados: { semChamado: number; semResposta: number; semAssunto: number };
}) {
  const total = descartados.semChamado + descartados.semResposta + descartados.semAssunto;

  if (total === 0) return null;

  const partes = [
    descartados.semResposta > 0 ? `${descartados.semResposta} sem resposta do suporte` : "",
    descartados.semChamado > 0 ? `${descartados.semChamado} sem chamado na HubSpot` : "",
    descartados.semAssunto > 0 ? `${descartados.semAssunto} sem assunto` : "",
  ].filter(Boolean);

  return (
    <p className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-xs leading-5 text-muted-foreground">
      {contar(total, "conversa")} {concordar(total, "ficou", "ficaram")} de fora: {partes.join(", ")}. Não é falha: atendimento entra com
      número de chamado e resposta de gente, senão o fluxo de robô afogaria os que têm.
    </p>
  );
}
