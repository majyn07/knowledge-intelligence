"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

import { FillPanel } from "@/components/common/fill/FillPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { todayIso, toIsoDate } from "@/lib/dates";
import type { FieldSpec } from "@/services/ai/fill/fieldFill";

import type { TicketFormData, TicketMessageFormData } from "../types/TicketFormData";

interface TicketFormProps {
  projects: { id: string; name: string }[];
  initialData?: TicketFormData;
  submitLabel?: string;
  onSubmit: (data: TicketFormData) => void;
  onCancel?: () => void;
  /** Avisa o diálogo de que há alteração pendente. */
  onDirty?: () => void;
  /**
   * Preenche a data com hoje quando ela está vazia.
   *
   * Só quem abre o formulário sabe se é criação — editar um registro antigo
   * que chegou sem data **não** pode ganhar a data de hoje, porque seria
   * carimbar como ocorrido agora algo que aconteceu quando ninguém sabe.
   */
  isNew?: boolean;
}

/**
 * Formulário em branco.
 *
 * A data nasce vazia e é preenchida com hoje depois da montagem: ler o
 * relógio durante o render é impuro, e o valor que ele produz não é o mesmo
 * no servidor e no cliente.
 */
function emptyForm(projectId: string): TicketFormData {
  return {
    title: "",
    company: "",
    solution: "",
    date: "",
    projectId,
    externalId: "",
    messages: [],
  };
}

function Fieldset({ legend, hint, children }: { legend: string; hint: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-border/70 pt-5 first:border-t-0 first:pt-0">
      <legend className="sr-only">{legend}</legend>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{legend}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
      {children}
    </fieldset>
  );
}

export function TicketForm({
  projects,
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
  onDirty,
  isNew = false,
}: TicketFormProps) {
  // O estado nasce do prop e não é sincronizado depois: quem troca o registro
  // em edição remonta o formulário por chave, evitando que um novo objeto de
  // initialData a cada render apague o que está sendo digitado.
  const [formData, setFormData] = useState<TicketFormData>(
    initialData ?? emptyForm(projects[0]?.id ?? "")
  );

  /*
    Hoje entra depois da montagem: ler o relógio durante o render é impuro, e
    o valor que ele produz não é o mesmo no servidor e no cliente.
  */
  useEffect(() => {
    if (!isNew) return;

    setFormData((previous) =>
      previous.date === "" ? { ...previous, date: todayIso(new Date()) } : previous
    );
  }, [isNew]);

  function change<K extends keyof TicketFormData>(field: K, value: TicketFormData[K]) {
    onDirty?.();
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  /**
   * O que a IA pode propor a partir do documento do atendimento.
   *
   * **Projeto fica de fora**: é a iniciativa que o atendimento alimenta, e
   * decidir isso é escolher onde o trabalho entra — não é informação que o
   * documento do cliente carregue. **A conversa também**, e por razão mais
   * forte: ela é a evidência que a análise lê, e uma conversa proposta por
   * modelo faria a análise citar mensagem que ninguém trocou.
   *
   * A data pede ISO no `hint` porque o produto recusa o resto: `dd/mm/aaaa`
   * vindo do documento vira campo vazio na leitura, e a tela diria que falta
   * o que estava lá.
   */
  const fillFields: FieldSpec[] = useMemo(
    () => [
      { name: "title", label: "Título", kind: "texto", hint: "O assunto do atendimento." },
      { name: "company", label: "Empresa", kind: "texto" },
      {
        name: "solution",
        label: "Solução",
        kind: "texto",
        hint: "O que resolveu, como foi registrado.",
      },
      {
        name: "date",
        label: "Data",
        kind: "texto",
        hint: "Dia do atendimento, no formato aaaa-mm-dd.",
      },
      /*
        O identificador de origem entra, e isso não contraria a regra de que
        identificador fica fora do preenchimento por IA.

        Aquela regra é sobre identificador **nosso** — responsável, seção,
        gênero —, onde o modelo devolveria um nome e nós precisaríamos casar
        com um id do catálogo. Este é de fora: chega escrito no documento,
        é guardado como texto e não há catálogo a consultar. Deixá-lo de fora
        era o que fazia o número do chamado ir parar no título.
      */
      {
        name: "externalId",
        label: "Número na HubSpot",
        kind: "texto",
        hint: "Só o número do chamado, se ele aparecer no documento.",
      },
      /*
        A conversa entra, e isso foi uma correção de rumo.

        Ela ficou de fora na primeira versão com o argumento de que uma
        conversa proposta por modelo faria a análise citar mensagem que
        ninguém trocou. O argumento vale para conversa **inventada** — não
        para a que está escrita no PDF que alguém anexou, onde extrair é
        transcrever. E a conversa é o grosso de um chamado: sem ela, importar
        por documento entregava a moldura e perdia o conteúdo que a análise
        precisa ler.

        A defesa continua sendo a mesma de todo o resto: nada entra sem
        alguém aprovar, e a lista aparece inteira na revisão.
      */
      {
        name: "messages",
        label: "Conversa",
        kind: "lista",
        itemFields: [
          { name: "author", label: "Quem falou", hint: "como o documento identifica" },
          { name: "body", label: "Mensagem" },
          { name: "createdAt", label: "Quando", hint: "ISO completo, só se o documento disser" },
        ],
        hint: "As mensagens trocadas, na ordem em que aparecem.",
      },
    ],
    []
  );

  /**
   * Converte a conversa proposta em mensagens do formulário.
   *
   * O identificador é nosso — o modelo não tem como saber o que já existe, e
   * um id vindo dele colidiria com mensagem gravada.
   *
   * A hora é o ponto delicado. `createdAt` é instante, e o documento quase
   * nunca traz um: quando falta, a mensagem herda **o dia do atendimento ao
   * meio-dia**. Meio-dia e não meia-noite porque `2026-08-01T00:00:00Z` é 31
   * de julho no Brasil, e a mensagem apareceria no dia anterior ao do próprio
   * chamado. É aproximação declarada, e não precisão fingida: quem revisa vê
   * a data no campo e corrige se souber melhor.
   */
  function toMessages(items: Record<string, string>[], dia: string): TicketMessageFormData[] {
    const base = toIsoDate(dia);

    return items.map((item) => ({
      id: crypto.randomUUID(),
      author: item.author ?? "",
      body: item.body ?? "",
      createdAt:
        item.createdAt && !Number.isNaN(Date.parse(item.createdAt))
          ? new Date(item.createdAt).toISOString()
          : base === ""
            ? new Date().toISOString()
            : new Date(`${base}T12:00:00`).toISOString(),
    }));
  }

  function changeMessage(id: string, patch: Partial<TicketMessageFormData>) {
    onDirty?.();
    setFormData((previous) => ({
      ...previous,
      messages: previous.messages.map((message) =>
        message.id === id ? { ...message, ...patch } : message
      ),
    }));
  }

  function addMessage(author: string) {
    onDirty?.();
    setFormData((previous) => ({
      ...previous,
      messages: [
        ...previous.messages,
        {
          id: crypto.randomUUID(),
          author,
          body: "",
          // ISO, como todo instante do produto. Quem formata é a tela.
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function removeMessage(id: string) {
    onDirty?.();
    setFormData((previous) => ({
      ...previous,
      messages: previous.messages.filter((message) => message.id !== id),
    }));
  }

  /*
    A integração é opcional, então a tela pergunta antes de oferecer o botão —
    mesma regra do botão de entrar com a conta Google: botão que às vezes leva
    a lugar nenhum é pior que botão que ainda não existe.

    A resposta entra depois da montagem: no primeiro render o servidor não sabe
    se há credencial, e assumir que sim divergiria na hidratação.
  */
  const [hubspotAtiva, setHubspotAtiva] = useState<boolean | null>(null);
  const [trazendo, setTrazendo] = useState(false);
  const [avisoDaConversa, setAvisoDaConversa] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    fetch("/api/hubspot/conversation")
      .then((resposta) => (resposta.ok ? resposta.json() : { configured: false }))
      .then((dados: { configured?: boolean }) => {
        if (vivo) setHubspotAtiva(Boolean(dados.configured));
      })
      .catch(() => {
        if (vivo) setHubspotAtiva(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  async function trazerConversa() {
    const numero = formData.externalId.trim();
    if (!numero || trazendo) return;

    setTrazendo(true);
    setAvisoDaConversa(null);

    try {
      const resposta = await fetch("/api/hubspot/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalId: numero }),
      });

      const dados: { messages?: TicketMessageFormData[]; message?: string } =
        await resposta.json();

      if (!resposta.ok) {
        setAvisoDaConversa(dados.message ?? "Não foi possível trazer a conversa.");
        return;
      }

      const vindas = dados.messages ?? [];

      if (vindas.length === 0) {
        setAvisoDaConversa(
          `Nenhuma conversa encontrada para o atendimento ${numero} na HubSpot.`
        );
        return;
      }

      onDirty?.();

      setFormData((previous) => {
        /*
          Some o que já está aqui: trazer duas vezes duplicaria o fio inteiro, e
          quem já digitou uma mensagem à mão não deve perdê-la.
        */
        const conhecidas = new Set(previous.messages.map((mensagem) => mensagem.id));
        const novas = vindas.filter((mensagem) => !conhecidas.has(mensagem.id));

        setAvisoDaConversa(
          novas.length === 0
            ? "A conversa já estava registrada aqui: nada novo veio."
            : `${novas.length} mensagem(ns) trazida(s) da HubSpot. Revise antes de salvar.`
        );

        return { ...previous, messages: [...previous.messages, ...novas] };
      });
    } catch {
      setAvisoDaConversa("Não foi possível falar com o servidor.");
    } finally {
      setTrazendo(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.title.trim() || !formData.projectId) return;
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FillPanel
        subject="Atendimento de suporte técnico da AltoQi"
        fields={fillFields}
        current={{
          title: formData.title,
          company: formData.company,
          solution: formData.solution,
          date: formData.date,
          externalId: formData.externalId,
        }}
        onApply={(values) => {
          onDirty?.();

          setFormData((previous) => {
            const { messages, ...simples } = values;
            const texto = simples as Partial<TicketFormData>;

            /*
              A conversa proposta **soma** à que já existe, e não substitui:
              quem já digitou uma mensagem à mão antes de anexar o documento
              não deveria perdê-la — e a tela avisou que haveria substituição
              antes do clique, então quem não quis somar desmarcou.
            */
            const conversa = Array.isArray(messages)
              ? toMessages(messages, texto.date ?? previous.date)
              : [];

            return {
              ...previous,
              ...texto,
              messages: [...previous.messages, ...conversa],
            };
          });
        }}
        placeholder="Cole o atendimento, ou anexe o PDF/print que o cliente enviou."
      />

      <Fieldset legend="Atendimento" hint="Do que o cliente precisou e em qual contexto.">
        <div className="space-y-2">
          <Label htmlFor="ticket-title">Título</Label>
          <Input
            id="ticket-title"
            value={formData.title}
            placeholder="Ex.: Erro ao autenticar após atualização"
            onChange={(event) => change("title", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ticket-company">Empresa</Label>
            <Input
              id="ticket-company"
              value={formData.company}
              placeholder="Ex.: Alpha Engenharia"
              onChange={(event) => change("company", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-solution">Solução</Label>
            <Input
              id="ticket-solution"
              value={formData.solution}
              placeholder="Ex.: Workflow"
              onChange={(event) => change("solution", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-date">Data</Label>

            {/*
              Campo de data, e não texto livre. Antes aceitava qualquer coisa —
              "ontem", "15 jul" —, e o que não dava para situar no tempo caía
              fora de toda janela dos indicadores. O valor nativo já é
              `aaaa-mm-dd`, que é o formato guardado.
            */}
            <Input
              id="ticket-date"
              type="date"
              value={formData.date}
              onChange={(event) => change("date", event.target.value)}
            />

            {/*
              Registro anterior cuja data não pôde ser lida chega vazio. Dizer
              isso é melhor que o campo parecer nunca ter sido preenchido.
            */}
            {formData.date === "" && (
              <p className="text-xs text-muted-foreground">
                Sem data. Os indicadores por período não alcançam este
                atendimento enquanto ela não for informada.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-external-id">Número na HubSpot</Label>
            <Input
              id="ticket-external-id"
              value={formData.externalId}
              placeholder="Ex.: 47673917220"
              onChange={(event) => change("externalId", event.target.value)}
            />

            {/*
              É por este número que a conversa vinda da HubSpot encontra o
              atendimento. Sem ele o fio existe do lado de lá e não tem onde
              se ligar aqui — e era o que acontecia com todo atendimento
              cadastrado à mão.
            */}
            <p className="text-xs text-muted-foreground">
              {formData.externalId.trim()
                ? "A conversa registrada na HubSpot pode ser trazida por este número."
                : "Sem o número, a conversa da HubSpot não tem como ser vinculada."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-project">Projeto</Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => change("projectId", value ?? "")}
            >
              <SelectTrigger id="ticket-project">
                <SelectValue placeholder="Selecione um projeto">
                  {(id: string) => projects.find((project) => project.id === id)?.name ?? "Selecione um projeto"}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Fieldset>

      <Fieldset
        legend="Registro da conversa"
        hint="É esta troca que a análise lê. Sem ela, a IA avalia o atendimento apenas pelo título."
      >
        <div className="space-y-3">
          {formData.messages.map((message) => (
            <div key={message.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={message.author}
                  aria-label="Autor da mensagem"
                  placeholder="Cliente ou Suporte"
                  className="h-8 w-40 text-xs"
                  onChange={(event) => changeMessage(message.id, { author: event.target.value })}
                />

                <Input
                  value={message.createdAt}
                  aria-label="Momento da mensagem"
                  placeholder="dd/mm/aaaa hh:mm"
                  className="h-8 w-44 text-xs"
                  onChange={(event) => changeMessage(message.id, { createdAt: event.target.value })}
                />

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="ml-auto"
                  aria-label="Remover mensagem"
                  onClick={() => removeMessage(message.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Textarea
                rows={2}
                value={message.body}
                aria-label="Conteúdo da mensagem"
                placeholder="O que foi dito."
                className="mt-2 text-sm"
                onChange={(event) => changeMessage(message.id, { body: event.target.value })}
              />
            </div>
          ))}

          {formData.messages.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhuma mensagem registrada. A análise ficará limitada ao título e à solução.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => addMessage("Cliente")}>
            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
            Mensagem do cliente
          </Button>

          <Button type="button" size="sm" variant="outline" onClick={() => addMessage("Suporte")}>
            <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
            Mensagem do suporte
          </Button>

          {/*
            É a única coisa que a API da HubSpot entrega e o arquivo não: a
            exportação traz o ticket, não o fio de mensagens. Só aparece com
            credencial configurada e com o número preenchido — sem o número não
            há por onde procurar.
          */}
          {hubspotAtiva && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!formData.externalId.trim() || trazendo}
              onClick={trazerConversa}
            >
              {trazendo ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {trazendo ? "Trazendo..." : "Trazer a conversa da HubSpot"}
            </Button>
          )}
        </div>

        {hubspotAtiva && !formData.externalId.trim() && (
          <p className="text-xs text-muted-foreground">
            Informe o número na HubSpot, acima, para poder trazer a conversa registrada lá.
          </p>
        )}

        {avisoDaConversa && (
          <p className="text-xs text-muted-foreground">{avisoDaConversa}</p>
        )}
      </Fieldset>

      <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit" disabled={!formData.title.trim() || !formData.projectId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
