"use client";

import { useMemo, useState } from "react";
import { Download, Image as ImageIcon, Plus, RotateCcw } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { useNow } from "@/hooks/useNow";
import { useProject } from "@/providers/ProjectProvider";

import { usePanels } from "../PanelsProvider";
import { panelFileName, panelToCsv } from "../panelCsv";
import { panelToPng } from "../panelImage";
import type { PanelSpec } from "../panelSpec";
import { runPanel, type PanelData } from "../runPanel";

import { PanelCard } from "./PanelCard";
import { PanelEditorDialog } from "./PanelEditorDialog";

/** Entrega o arquivo ao navegador. Existe só para não repetir em três lugares. */
function download(name: string, content: Blob) {
  const url = URL.createObjectURL(content);

  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Os painéis que a equipe montou.
 *
 * O quadro junta os dados uma vez e roda cada especificação sobre eles. Os
 * providers já têm tudo em memória, não há consulta nova por painel, e é por
 * isso que somar mais um cartão não custa nada.
 */
export function PanelBoard() {
  const { panels, savePanel, removePanel, movePanel, restoreDefaults } = usePanels();

  const { projects, activeProjectId } = useProject();
  const { tickets } = useTickets();
  const { analyses } = useKnowledgeLifecycle();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { events } = useActivity();
  const { taxonomy } = useTaxonomy();
  const { people, teams } = usePeople();

  const [editing, setEditing] = useState<PanelSpec | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);

  const now = useNow();

  const data: PanelData = useMemo(
    () => ({
      projects,
      tickets,
      analyses,
      plans,
      articles,
      events,
      taxonomy,
      people,
      teams,
      activeProjectId,
    }),
    [activeProjectId, analyses, articles, events, people, plans, projects, taxonomy, teams, tickets]
  );

  const results = useMemo(
    () => (now ? panels.map((spec) => ({ spec, result: runPanel(spec, data, now) })) : []),
    [data, now, panels]
  );

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (spec: PanelSpec) => {
    setEditing(spec);
    setEditorOpen(true);
  };

  const exportAll = () => {
    for (const { spec, result } of results) {
      download(
        panelFileName(spec),
        new Blob([panelToCsv(spec, result)], { type: "text/csv;charset=utf-8" })
      );
    }
  };

  const exportImages = async () => {
    for (const { spec, result } of results) {
      const png = await panelToPng(spec, result);

      // Um painel que não rasterizou não interrompe os outros: o botão vale
      // para o quadro inteiro, e falhar em silêncio no meio seria pior.
      if (png) download(panelFileName(spec).replace(/\.csv$/, ".png"), png);
    }
  };

  return (
    <PageSection
      title="Painéis da equipe"
      description="Montados aqui, sem passar pelo código. O painel guarda a pergunta; o número é recalculado a cada abertura."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={restoreDefaults}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={exportAll}
            disabled={results.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void exportImages()}
            disabled={results.length === 0}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Exportar imagem
          </Button>

          <Button size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" />
            Novo painel
          </Button>
        </div>
      }
    >
      {/*
        Sem o relógio ainda não dá para dizer nada sobre janela de tempo, e
        renderizar com a hora do servidor divergiria na hidratação.
      */}
      {now === null ? null : panels.length === 0 ? (
        <BrandEmptyState
          title="Nenhum painel"
          description="Crie o primeiro, ou restaure os padrão para partir de algo pronto."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {results.map(({ spec, result }, index) => (
            <PanelCard
              key={spec.id}
              spec={spec}
              result={result}
              isFirst={index === 0}
              isLast={index === results.length - 1}
              onEdit={() => openEdit(spec)}
              onRemove={() => removePanel(spec.id)}
              onMove={(direction) => movePanel(spec.id, direction)}
            />
          ))}
        </div>
      )}

      {/*
        A `key` remonta o formulário quando o painel em edição muda: o estado
        nasce do prop e não é sincronizado depois.
      */}
      {isEditorOpen && (
        <PanelEditorDialog
          key={editing?.id ?? "novo"}
          spec={editing}
          open={isEditorOpen}
          onOpenChange={setEditorOpen}
          onSave={savePanel}
        />
      )}
    </PageSection>
  );
}
