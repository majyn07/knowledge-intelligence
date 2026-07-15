import { useState } from "react";

import { knowledgeBases } from "./mock/knowledgeBases";

export function LibraryWorkspace() {
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] =
    useState(knowledgeBases[0].id);

  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-semibold">
          Base de Conhecimento
        </h1>

        <p className="mt-2 text-muted-foreground">
          Gerencie as Bases de Conhecimento utilizadas durante as análises.
        </p>

      </div>

      <div className="grid gap-4">

        {knowledgeBases.map((base) => {

          const selected =
            base.id === selectedKnowledgeBaseId;

          return (

            <button
              key={base.id}
              onClick={() => setSelectedKnowledgeBaseId(base.id)}
              className={`rounded-xl border p-6 text-left transition-colors ${
                selected
                  ? "border-primary bg-muted"
                  : "bg-card hover:bg-muted/40"
              }`}
            >

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-lg font-semibold">
                    {base.solution}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {base.source}
                  </p>

                </div>

                <span className="rounded-md border px-3 py-1 text-xs">
                  {base.status}
                </span>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">

                <div>

                  <p className="text-muted-foreground">
                    Versão
                  </p>

                  <p className="font-medium">
                    {base.version}
                  </p>

                </div>

                <div>

                  <p className="text-muted-foreground">
                    Artigos
                  </p>

                  <p className="font-medium">
                    {base.articles}
                  </p>

                </div>

                <div>

                  <p className="text-muted-foreground">
                    Última importação
                  </p>

                  <p className="font-medium">
                    {base.importedAt}
                  </p>

                </div>

              </div>

            </button>

          );

        })}

      </div>

    </div>
  );
}