"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";

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

import { todayIso } from "@/lib/dates";

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.title.trim() || !formData.projectId) return;
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        </div>
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
