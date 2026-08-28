"use client";

import { FormEvent, useMemo, useState, type ReactNode } from "react";

import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";
import { productNamesFrom, UNSET_PRODUCT } from "@/features/projects/constants/products";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { projectStatusLabel, type ProjectStatus } from "@/models/Project";
import type { FieldSpec } from "@/services/ai/fill/fieldFill";

import { FillPanel } from "@/components/common/fill/FillPanel";
import { PersonSelect } from "@/features/people/components/PersonSelect";

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

interface ProjectFormProps {
  initialData?: ProjectFormData;
  submitLabel?: string;
  onSubmit: (data: ProjectFormData) => void;
  onCancel?: () => void;
}

const emptyForm: ProjectFormData = {
  name: "",
  description: "",
  status: "active",
  product: UNSET_PRODUCT,
  module: "",
  goal: "",
  owner: "",
};

const statusOptions: ProjectStatus[] = ["active", "inactive", "archived"];

const PRODUCT_PLACEHOLDER = "Não definido";

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

export function ProjectForm({
  initialData,
  submitLabel = "Salvar",
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  // O estado nasce do prop e não é sincronizado depois: quem troca o registro
  // em edição remonta o formulário por chave.
  const [formData, setFormData] = useState<ProjectFormData>(initialData ?? emptyForm);

  const { taxonomy } = useTaxonomy();
  const productNames = productNamesFrom(taxonomy);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    onSubmit(formData);
    setFormData(emptyForm);
  }

  function change<K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  /**
   * O que a IA pode propor neste formulário.
   *
   * **Responsável fica de fora, de propósito.** A atribuição guarda
   * identificador, não nome, e o modelo só sabe devolver texto. Propor ali
   * gravaria um vínculo que não resolve para pessoa nenhuma. Ele continua
   * aparecendo como pergunta na resposta, que é o comportamento honesto: a
   * lacuna fica visível e quem escolhe é quem abriu o formulário.
   *
   * **Status também fica de fora**, por outro motivo: é decisão de fluxo, e
   * não informação que um texto de contexto carregue. Projeto novo nasce
   * ativo, e deduzir isso de uma frase seria inventar intenção.
   *
   * O produto vai com o catálogo inteiro no pedido, e a conferência acontece
   * na volta: a mesma defesa da sugestão de seção.
   */
  const fillFields: FieldSpec[] = useMemo(
    () => [
      { name: "name", label: "Nome do projeto", kind: "texto" },
      {
        name: "goal",
        label: "Objetivo",
        kind: "texto",
        hint: "O resultado documental perseguido, mensurável quando o texto permitir.",
      },
      {
        name: "description",
        label: "Descrição",
        kind: "texto",
        hint: "O que o projeto abrange.",
      },
      { name: "product", label: "Produto", kind: "escolha", options: productNames },
      {
        name: "module",
        label: "Módulo",
        kind: "texto",
        hint: "O módulo do produto, quando o texto nomear um.",
      },
    ],
    [productNames]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FillPanel
        subject="Projeto de melhoria da base de conhecimento"
        fields={fillFields}
        current={{
          name: formData.name,
          goal: formData.goal,
          description: formData.description,
          /*
            `UNSET_PRODUCT` é ausência, e mandá-lo como valor atual faria a
            tela avisar que a proposta substitui algo, quando ela preenche um
            campo vazio.
          */
          product: formData.product === UNSET_PRODUCT ? "" : formData.product,
          module: formData.module,
        }}
        onApply={(values) => setFormData((previous) => ({ ...previous, ...values }))}
        placeholder="Ex.: precisamos atacar as dúvidas recorrentes de lançamento de vigas no Eberick; não existe artigo no portal cobrindo vigas de transição."
      />
      <Fieldset legend="Identidade" hint="Como este projeto é reconhecido na plataforma.">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do projeto</Label>
          <Input
            id="name"
            value={formData.name}
            placeholder="Ex.: Base Visus Produção"
            onChange={(event) => change("name", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => change("status", value as ProjectStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue>
                  {(status: ProjectStatus) => projectStatusLabel[status]}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {projectStatusLabel[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Contexto AltoQi" hint="Qual solução e qual módulo este projeto cobre.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product">Produto</Label>
            <Select
              value={formData.product}
              onValueChange={(value) =>
                change("product", !value || value === PRODUCT_PLACEHOLDER ? UNSET_PRODUCT : value)
              }
            >
              <SelectTrigger id="product">
                <SelectValue>
                  {(product: string) => product || PRODUCT_PLACEHOLDER}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={PRODUCT_PLACEHOLDER}>{PRODUCT_PLACEHOLDER}</SelectItem>
                {productNames.map((product) => (
                  <SelectItem key={product} value={product}>
                    {product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">Módulo</Label>
            <Input
              id="module"
              value={formData.module}
              placeholder="Ex.: Cost Management"
              onChange={(event) => change("module", event.target.value)}
            />
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Objetivo e condução" hint="Qual resultado documental o projeto persegue e quem conduz.">
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Textarea
            id="goal"
            value={formData.goal}
            rows={2}
            placeholder="Ex.: Reduzir a recorrência de dúvidas sobre importação IFC."
            onChange={(event) => change("goal", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">Responsável</Label>
          <PersonSelect
            id="owner"
            value={formData.owner}
            onChange={(name) => change("owner", name)}
            placeholder="Sem responsável"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            rows={2}
            placeholder="O que este projeto abrange."
            onChange={(event) => change("description", event.target.value)}
          />
        </div>
      </Fieldset>

      <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>

        <Button type="submit" disabled={!formData.name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
