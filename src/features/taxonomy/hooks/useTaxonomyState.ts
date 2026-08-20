"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { getSupabase } from "@/lib/supabase/client";
import { readRaw, writeJSON } from "@/lib/storage";
import type { Taxonomy } from "@/models/Taxonomy";

import { buildPortalTaxonomy } from "../mock/portalTaxonomy";
import { parseTaxonomy } from "../normalizeTaxonomy";
import { readTaxonomy, seedTaxonomyIfEmpty, writeTaxonomy } from "../repository/taxonomyRepository";
import { STORAGE_KEYS } from "@/lib/storage";

const STORAGE_KEY = STORAGE_KEYS.taxonomy;

/**
 * Estado da taxonomia, do servidor quando há e do navegador quando não há.
 *
 * Não usa `useSharedCollection` porque a taxonomia não é coleção plana: são
 * três tabelas que compõem um objeto, e a ordem de gravação entre elas importa
 * por causa das chaves estrangeiras.
 */
export function useTaxonomyState() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(buildPortalTaxonomy);
  const [isHydrated, setIsHydrated] = useState(false);

  const persisted = useRef<Taxonomy | null>(null);
  const supabase = getSupabase();

  useEffect(() => {
    let alive = true;

    async function load() {
      if (supabase) {
        try {
          /*
            Semeia a estrutura do portal só quando o banco está vazio. A partir
            daí o cadastro é da equipe, e sobrescrever apagaria o trabalho dela.
          */
          await seedTaxonomyIfEmpty(supabase, buildPortalTaxonomy());

          const remota = await readTaxonomy(supabase);

          if (alive && remota) {
            setTaxonomy(remota);
            persisted.current = remota;
          }
        } catch (error) {
          toast.error(
            `Não foi possível carregar a classificação: ${
              error instanceof Error ? error.message : "erro desconhecido"
            }`
          );
        }
      } else {
        const raw = readRaw(STORAGE_KEY);

        if (raw !== null) {
          try {
            const local = parseTaxonomy(raw);
            setTaxonomy(local);
            persisted.current = local;
          } catch {
            // Conteúdo ilegível: mantém a semente.
          }
        }
      }

      if (alive) setIsHydrated(true);
    }

    load();

    return () => {
      alive = false;
    };
  }, [supabase]);

  // Tempo real nas três tabelas.
  useEffect(() => {
    if (!supabase || !isHydrated) return;

    const channel = supabase.channel("sync:taxonomy");

    for (const table of ["taxonomy_categories", "taxonomy_sections", "taxonomy_entries"] as const) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, async () => {
        const remota = await readTaxonomy(supabase).catch(() => null);

        if (remota) {
          setTaxonomy(remota);
          persisted.current = remota;
        }
      });
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHydrated, supabase]);

  // Gravação.
  useEffect(() => {
    if (!isHydrated) return;

    const anterior = persisted.current;
    if (anterior === taxonomy) return;

    persisted.current = taxonomy;

    if (!supabase) {
      writeJSON(STORAGE_KEY, taxonomy);
      return;
    }

    if (!anterior) return;

    writeTaxonomy(supabase, anterior, taxonomy).catch((error: unknown) => {
      toast.error(
        `Não foi possível gravar a classificação: ${
          error instanceof Error ? error.message : "erro desconhecido"
        }`
      );
    });
  }, [isHydrated, supabase, taxonomy]);

  return [taxonomy, setTaxonomy, isHydrated] as const;
}
