"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { getSupabase } from "@/lib/supabase/client";
import type { RealtimeTable } from "@/lib/supabase/types";
import { readRaw, writeJSON } from "@/lib/storage";

interface UseSharedCollectionOptions<T> {
  /** Chave do `localStorage`, usada enquanto não há servidor. */
  key: string;
  /** Tabela do banco, quando há. */
  table: RealtimeTable;
  /** Valor canônico do servidor e do primeiro render do cliente. */
  fallback: T[];
  /** Conversão do conteúdo bruto do `localStorage`. */
  parseLocal: (raw: string) => T[];
  /** Conversão das linhas do banco. */
  fromRows: (rows: unknown[]) => T[];
  /** Conversão de volta, para gravar. */
  toRow: (item: T) => Record<string, unknown>;
  /** Identidade do registro, para saber o que mudou entre dois estados. */
  identify: (item: T) => string;
}

/** Um aviso por sessão: repetir a cada tecla seria pior que o problema. */
let writeWarned = false;

/**
 * Coleção que vive no servidor quando há servidor, e no navegador quando não há.
 *
 * A assinatura devolvida é a mesma de `usePersistedState` — `[itens, definir,
 * hidratado]` — para que os providers não precisem saber de onde o dado vem.
 * Era a promessa da arquitetura desde o começo: a última camada é trocável, e
 * a interface não se refaz.
 *
 * A hidratação continua valendo: servidor e primeiro render do cliente
 * produzem `fallback`, e o que veio de fora entra depois da montagem. Isso não
 * mudou por o dado passar a vir da rede.
 *
 * A escrita compara o estado anterior com o novo e manda só a diferença. É o
 * que permite manter os providers como estão, chamando `definir(proximo)` sem
 * saber que existe um banco atrás.
 */
export function useSharedCollection<T>({
  key,
  table,
  fallback,
  parseLocal,
  fromRows,
  toRow,
  identify,
}: UseSharedCollectionOptions<T>) {
  const [items, setItems] = useState<T[]>(fallback);
  const [isHydrated, setIsHydrated] = useState(false);

  /*
    O estado gravado por último. Serve para calcular a diferença sem depender
    da ordem em que o React aplica as atualizações.
  */
  const persisted = useRef<T[]>(fallback);
  /*
    As conversões chegam como funções novas a cada render do provider. Guardá-
    las numa ref evita reassinar o tempo real e recarregar a coleção a cada
    render — mas a atualização acontece em efeito, porque escrever numa ref
    durante o render quebra a renderização concorrente.

    O efeito é declarado antes dos que consomem a ref, então roda antes deles.
    Na primeira montagem isso nem importa: `useRef` já nasce com o valor certo.
  */
  const options = useRef({ parseLocal, fromRows, toRow, identify });

  useEffect(() => {
    options.current = { parseLocal, fromRows, toRow, identify };
  }, [fromRows, identify, parseLocal, toRow]);

  const supabase = getSupabase();
  const remote = supabase !== null;

  /** Lê tudo da tabela. Simples de propósito: as coleções são pequenas. */
  const fetchAll = useCallback(async () => {
    if (!supabase) return null;

    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      toast.error(`Não foi possível ler ${table}: ${error.message}`);
      return null;
    }

    return options.current.fromRows(data ?? []);
  }, [supabase, table]);

  // Carga inicial.
  useEffect(() => {
    let alive = true;

    async function load() {
      if (remote) {
        const rows = await fetchAll();
        if (alive && rows) {
          setItems(rows);
          persisted.current = rows;
        }
      } else {
        const raw = readRaw(key);

        if (raw !== null) {
          try {
            const parsed = options.current.parseLocal(raw);
            setItems(parsed);
            persisted.current = parsed;
          } catch {
            // Conteúdo ilegível: mantém a semente e deixa a próxima escrita corrigir.
          }
        }
      }

      if (alive) setIsHydrated(true);
    }

    load();

    return () => {
      alive = false;
    };
  }, [fetchAll, key, remote]);

  /*
    Tempo real. Qualquer mudança na tabela relê a coleção inteira em vez de
    aplicar o payload: relemos pouco, e aplicar evento a evento erra quando
    eles chegam fora de ordem ou quando um se perde na reconexão.
  */
  useEffect(() => {
    if (!supabase || !isHydrated) return;

    const channel = supabase
      .channel(`sync:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        async () => {
          const rows = await fetchAll();
          if (rows) {
            setItems(rows);
            persisted.current = rows;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, isHydrated, supabase, table]);

  // Gravação.
  useEffect(() => {
    if (!isHydrated) return;
    if (items === persisted.current) return;

    const anterior = persisted.current;
    persisted.current = items;

    if (!remote) {
      const result = writeJSON(key, items);

      if (result === "quota" && !writeWarned) {
        writeWarned = true;
        toast.error(
          "O armazenamento deste navegador encheu. O trabalho continua na tela, mas parou de ser gravado."
        );
      }

      return;
    }

    const { identify: id, toRow: row } = options.current;

    const antes = new Map(anterior.map((item) => [id(item), item]));
    const agora = new Map(items.map((item) => [id(item), item]));

    const mudados = items.filter((item) => antes.get(id(item)) !== item);
    const removidos = [...antes.keys()].filter((chave) => !agora.has(chave));

    async function sync() {
      if (!supabase) return;

      /*
        `table` é uma união de nomes, então o tipo da linha esperada vira a
        interseção de todas — `never`. O gancho é genérico de propósito: quem
        o usa fornece `toRow`, e é lá que a forma correta é garantida.
      */
      const tabela = supabase.from(table) as unknown as {
        upsert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
        delete: () => { in: (column: string, values: string[]) => Promise<{ error: { message: string } | null }> };
      };

      if (mudados.length > 0) {
        const { error } = await tabela.upsert(mudados.map(row));
        if (error) toast.error(`Não foi possível gravar: ${error.message}`);
      }

      if (removidos.length > 0) {
        const { error } = await tabela.delete().in("id", removidos);
        if (error) toast.error(`Não foi possível remover: ${error.message}`);
      }
    }

    void sync();
  }, [isHydrated, items, key, remote, supabase, table]);

  return [items, setItems, isHydrated] as const;
}
