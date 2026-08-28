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
 * A assinatura devolvida é a mesma de `usePersistedState`. `[itens, definir,
 * hidratado]`, para que os providers não precisem saber de onde o dado vem.
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
/**
 * Quantas linhas por pedido.
 *
 * Vinte e cinco, e o número veio de uma falha: com cem, cada pedido levava
 * cerca de 1,3 MB de corpo de artigo, e a gravação dos 1.782 do portal morreu
 * no quinto lote, sem erro na tela e sem nada no console.
 */
const POR_LOTE = 25;

/**
 * Quantas linhas por leitura.
 *
 * Abaixo do teto de mil do PostgREST, e pequena o bastante para a consulta não
 * estourar o tempo do servidor com corpos de artigo de doze mil caracteres.
 */
const POR_PAGINA = 200;

/** Quantas páginas correm juntas. Medido: acima disso as consultas se atropelam. */
const PAGINAS_SIMULTANEAS = 3;

/** Divide em pedaços, preservando a ordem. */
export function emLotes<T>(lista: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];

  for (let inicio = 0; inicio < lista.length; inicio += tamanho) {
    lotes.push(lista.slice(inicio, inicio + tamanho));
  }

  return lotes;
}

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
  /** Verdadeiro enquanto uma gravação nossa está em curso. */
  const gravando = useRef(false);

  const persisted = useRef<T[]>(fallback);
  /*
    As conversões chegam como funções novas a cada render do provider. Guardá-
    las numa ref evita reassinar o tempo real e recarregar a coleção a cada
    render, mas a atualização acontece em efeito, porque escrever numa ref
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

  /**
   * Lê tudo da tabela, em páginas.
   *
   * Era um `select("*")` só, com o comentário de que as coleções são pequenas.
   * Deixaram de ser: com o portal importado são mil e oitocentos artigos e
   * vinte e quatro megabytes, e a consulta única falhava de duas formas ao
   * mesmo tempo. Estourava o tempo do servidor, e quando não estourava vinha
   * **cortada em mil linhas**, que é o teto do PostgREST.
   *
   * O corte era o pior dos dois: chegava sem erro, e o tempo real substituía o
   * acervo inteiro por essas mil.
   */
  const fetchAll = useCallback(async () => {
    if (!supabase) return null;

    /*
      A contagem primeiro, sem trazer linha nenhuma. Ela custa um pedido e paga
      por si: sem saber o total, as páginas só podem ser pedidas uma depois da
      outra, e eram dez em fila, nove segundos até a Biblioteca abrir.
    */
    const { count, error: erroDaContagem } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (erroDaContagem) {
      toast.error(`Não foi possível ler ${table}: ${erroDaContagem.message}`);
      return null;
    }

    const total = count ?? 0;
    if (total === 0) return options.current.fromRows([]);

    const paginas = Array.from(
      { length: Math.ceil(total / POR_PAGINA) },
      (_, indice) => indice * POR_PAGINA
    );

    /*
      Em paralelo, mas com freio, e o freio veio da medição.

      Dez páginas em fila levavam nove segundos. Dez de uma vez baixaram a
      parede para quinze, mas cada consulta passou de seiscentos milissegundos
      para nove segundos: vinte e quatro megabytes pedidos ao mesmo tempo se
      atropelam do lado do servidor.

      Três de cada vez aproveita a ida e volta sem transformar o banco em fila
      de si mesmo.
    */
    const respostas: Awaited<ReturnType<typeof paginaDe>>[] = [];

    async function paginaDe(inicio: number) {
      return supabase!
        .from(table)
        .select("*")
        .range(inicio, inicio + POR_PAGINA - 1);
    }

    for (let i = 0; i < paginas.length; i += PAGINAS_SIMULTANEAS) {
      const bloco = paginas.slice(i, i + PAGINAS_SIMULTANEAS);
      respostas.push(...(await Promise.all(bloco.map(paginaDe))));
    }

    const comErro = respostas.find((resposta) => resposta.error);

    if (comErro?.error) {
      toast.error(`Não foi possível ler ${table}: ${comErro.error.message}`);
      return null;
    }

    return options.current.fromRows(respostas.flatMap((resposta) => resposta.data ?? []));
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
          /*
            Enquanto **nós** estamos gravando, o eco da própria escrita não pode
            reler: cada lote dispara um evento, e a releitura devolveria uma
            visão **parcial** do banco que substituiria o estado local no meio
            do caminho. Foi assim que uma importação de 1.782 artigos ficou com
            440 na tela e o resto sumiu da memória.
          */
          if (gravando.current) return;

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

      gravando.current = true;

      /*
        `table` é uma união de nomes, então o tipo da linha esperada vira a
        interseção de todas, `never`. O gancho é genérico de propósito: quem
        o usa fornece `toRow`, e é lá que a forma correta é garantida.
      */
      const tabela = supabase.from(table) as unknown as {
        upsert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
        delete: () => { in: (column: string, values: string[]) => Promise<{ error: { message: string } | null }> };
      };

      /*
        Em lotes, e não tudo de uma vez.

        A importação do portal grava 1.822 artigos numa tacada só. Cerca de
        vinte e quatro megabytes de corpo HTML. Um `upsert` único com isso
        estoura o limite de tamanho do pedido, e a falha chegaria como um erro
        genérico depois de a pessoa ter esperado a varredura inteira.

        Cem por lote dá pedidos de poucos megabytes, e o `delete` vai junto
        porque uma lista de mil e oitocentos identificadores também tem teto,
        agora na URL.
      */
      for (const lote of emLotes(mudados, POR_LOTE)) {
        const { error } = await tabela.upsert(lote.map(row));

        if (error) {
          toast.error(`Não foi possível gravar: ${error.message}`);
          return;
        }
      }

      for (const lote of emLotes(removidos, POR_LOTE)) {
        const { error } = await tabela.delete().in("id", lote);

        if (error) {
          toast.error(`Não foi possível remover: ${error.message}`);
          return;
        }
      }
    }

    /*
      O `catch` existe porque `void sync()` engolia a exceção: quando um pedido
      falhava por rede ou por tamanho, o laço morria calado e metade do acervo
      simplesmente não chegava. Falha silenciosa é pior que falha. Ninguém vai
      atrás do que não sabe que quebrou.
    */
    void sync()
      .catch((erro: unknown) => {
        const causa = erro instanceof Error ? erro.message : "causa desconhecida";
        toast.error(`A gravação foi interrompida: ${causa}. Tente de novo.`);
      })
      .finally(() => {
        gravando.current = false;
      });
  }, [isHydrated, items, key, remote, supabase, table]);

  return [items, setItems, isHydrated] as const;
}
