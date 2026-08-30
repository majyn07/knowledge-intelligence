"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { getSupabase } from "@/lib/supabase/client";
import type { RealtimeTable } from "@/lib/supabase/types";
import { gravarCache, lerCache } from "@/lib/collectionCache";
import { readRaw, writeJSON } from "@/lib/storage";

import {
  aplicarReleitura,
  planejarReleitura,
  POR_PEDIDO_DE_IDS,
  valeIncremental,
  type Carimbo,
  mesclarLinhas,
} from "./collectionSync";
import { criarCoalescer } from "./coalescer";

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
  /**
   * Reler só o que mudou quando outra pessoa mexe na tabela.
   *
   * Vale a pena onde a coleção é grande: no acervo, um colega classificando um
   * artigo fazia cada aba da equipe baixar os 22,7 MB inteiros.
   *
   * É opção e não padrão porque depende de `fromRows` converter **linha a
   * linha**. Quem tiver `fromRows` que decide algo olhando o conjunto (ordenar,
   * cortar, deduplicar) não pode receber um pedaço dele.
   */
  releituraIncremental?: boolean;
  /**
   * Guardar a coleção no navegador, para a abertura não baixar tudo de novo.
   *
   * Exige `releituraIncremental`: sem ela não há como saber o que mudou desde o
   * cache, e mostrar o guardado sem conferir seria a tela com dado velho, que é
   * o defeito que ninguém percebe.
   */
  usaCache?: boolean;
}

/** O que a releitura incremental precisa de cada linha, e mais nada. */
interface LinhaComCarimbo {
  id?: unknown;
  synced_at?: unknown;
}

function carimbosDe(rows: unknown[]): Carimbo[] {
  const lista: Carimbo[] = [];

  for (const row of rows) {
    const linha = row as LinhaComCarimbo;

    if (typeof linha?.id !== "string" || typeof linha?.synced_at !== "string") continue;

    lista.push({ id: linha.id, syncedAt: linha.synced_at });
  }

  return lista;
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
 * Teto de bytes por pedido, que é o que de fato importa.
 *
 * Contar linhas não descreve o pedido quando as linhas têm tamanhos muito
 * diferentes. No acervo real o artigo médio tem 12,7 KB de corpo e o maior tem
 * 311 KB: um lote de 25 medianos dá 300 KB, e um lote que calhe de reunir os
 * 25 maiores dá 2,5 MB, quase dez vezes mais pelo mesmo número de linhas.
 *
 * Foi assim que 91 classificações se perderam. O lote grande falhou, e como é
 * no primeiro lote que isso acontece, nenhuma das 91 chegou ao banco.
 *
 * Meio megabyte deixa o pedido previsível: o lote grande se divide sozinho, e
 * o lote pequeno continua indo inteiro.
 */
const BYTES_POR_LOTE = 512 * 1024;

/**
 * Quantas linhas por leitura.
 *
 * Abaixo do teto de mil do PostgREST, e pequena o bastante para a consulta não
 * estourar o tempo do servidor com corpos de artigo de doze mil caracteres.
 */
const POR_PAGINA = 200;

/**
 * E quantos carimbos por leitura.
 *
 * Muito maior que a página de linhas inteiras, porque aqui cada registro são
 * duas colunas curtas: os 1.822 artigos cabem em duas idas em vez de dez. Mil é
 * o teto do PostgREST, então este é o maior valor que existe.
 */
const CARIMBOS_POR_PAGINA = 1_000;

/** Quantas páginas correm juntas. Medido: acima disso as consultas se atropelam. */
const PAGINAS_SIMULTANEAS = 3;

/**
 * Quanto silêncio espera antes de reler o que outra pessoa mudou.
 *
 * Curto o bastante para a mudança de um colega aparecer sem parecer travada, e
 * longo o bastante para uma gravação em lote virar uma releitura só.
 */
const ESPERA_DO_ECO = 400;

/**
 * E quanto tempo, no máximo, a tela pode ficar sem atualizar durante uma
 * gravação que não para. A importação do portal grava por quarenta e cinco
 * minutos: sem teto, quem estivesse acompanhando não veria nada até o fim.
 */
const TETO_DO_ECO = 4_000;

/** Divide em pedaços, preservando a ordem. */
export function emLotes<T>(lista: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];

  for (let inicio = 0; inicio < lista.length; inicio += tamanho) {
    lotes.push(lista.slice(inicio, inicio + tamanho));
  }

  return lotes;
}

/**
 * Divide pelo tamanho do que vai no pedido, e não só pela contagem.
 *
 * O teto de linhas continua valendo, porque muitas linhas pequenas também
 * custam. Item que sozinho já passa do teto de bytes vai sozinho: recusá-lo
 * seria perder o registro em silêncio, e o pedido de um item só é o menor que
 * dá para fazer.
 */
export function emLotesPorTamanho<T>(
  lista: T[],
  linhas: number,
  bytes: number,
  medir: (item: T) => number
): T[][] {
  const lotes: T[][] = [];
  let atual: T[] = [];
  let soma = 0;

  for (const item of lista) {
    const tamanho = medir(item);

    if (atual.length > 0 && (atual.length >= linhas || soma + tamanho > bytes)) {
      lotes.push(atual);
      atual = [];
      soma = 0;
    }

    atual.push(item);
    soma += tamanho;
  }

  if (atual.length > 0) lotes.push(atual);

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
  releituraIncremental = false,
  usaCache = false,
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

  /** O carimbo de gravação de cada linha, como estava na última leitura. */
  const carimbos = useRef<Map<string, string>>(new Map());

  /*
    As linhas cruas que o cache tem, para a releitura incremental poder
    reescrevê-lo sem reconverter registro em linha.
  */
  const linhasEmCache = useRef<unknown[] | null>(null);
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
    if (total === 0) return { items: options.current.fromRows([]), carimbos: [], rows: [] };

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

    /*
      Ordenado por `id`, e isso não é preferência.

      Paginar com `range` sobre uma consulta sem ordem é comportamento
      indefinido no Postgres: entre duas páginas o planejador pode devolver a
      mesma linha duas vezes e pular outra, e a coleção chegaria com um artigo
      repetido e outro ausente sem erro nenhum. A ordem também é o que permite a
      releitura incremental: ela compara com a lista de carimbos, que é lida na
      mesma ordem.
    */
    async function paginaDe(inicio: number) {
      return supabase!
        .from(table)
        .select("*")
        .order("id")
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

    const linhas = respostas.flatMap((resposta) => resposta.data ?? []);

    return { items: options.current.fromRows(linhas), carimbos: carimbosDe(linhas), rows: linhas };
  }, [supabase, table]);

  /**
   * Só quem é cada linha e quando ela foi gravada.
   *
   * É o primeiro dos dois passos da releitura incremental, e o que a torna
   * barata: 1.822 artigos em identificador e carimbo são cento e dez
   * kilobytes, contra os 22,7 MB do acervo com os corpos.
   *
   * Devolve `null` quando não dá para responder, e aí quem chamou faz a
   * releitura inteira. É o caso de um banco sem a coluna, que existe: a
   * aplicação em produção pode estar à frente da migração.
   */
  const fetchCarimbos = useCallback(async (): Promise<Carimbo[] | null> => {
    if (!supabase) return null;

    const carimbos: Carimbo[] = [];

    for (let inicio = 0; ; inicio += CARIMBOS_POR_PAGINA) {
      const { data, error } = await supabase
        .from(table)
        .select("id,synced_at")
        .order("id")
        .range(inicio, inicio + CARIMBOS_POR_PAGINA - 1);

      if (error) return null;

      const pagina = data ?? [];
      carimbos.push(...carimbosDe(pagina));

      if (pagina.length < CARIMBOS_POR_PAGINA) break;
    }

    return carimbos;
  }, [supabase, table]);

  /** As linhas inteiras de um punhado de identificadores. */
  const fetchPorIds = useCallback(
    async (ids: string[]): Promise<unknown[] | null> => {
      if (!supabase) return null;

      const linhas: unknown[] = [];

      for (let i = 0; i < ids.length; i += POR_PEDIDO_DE_IDS) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .in("id", ids.slice(i, i + POR_PEDIDO_DE_IDS));

        if (error) {
          toast.error(`Não foi possível ler ${table}: ${error.message}`);
          return null;
        }

        linhas.push(...(data ?? []));
      }

      return linhas;
    },
    [supabase, table]
  );

  /** Guarda o que está em memória, para a próxima abertura não baixar tudo. */
  const guardarNoCache = useCallback(
    (rows: unknown[]) => {
      if (!usaCache) return;

      linhasEmCache.current = rows;

      void gravarCache(table, {
        rows,
        carimbos: [...carimbos.current],
        at: new Date().toISOString(),
      });
    },
    [table, usaCache]
  );

  /** A releitura inteira, que é o caminho de sempre e o de recuo. */
  const relerTudo = useCallback(async () => {
    const lido = await fetchAll();
    if (!lido) return;

    setItems(lido.items);
    persisted.current = lido.items;
    carimbos.current = new Map(lido.carimbos.map((linha) => [linha.id, linha.syncedAt]));
    guardarNoCache(lido.rows);
  }, [fetchAll, guardarNoCache]);

  /*
    A releitura em dois passos: os carimbos, e depois só as linhas que mudaram.
    Ela recua para a inteira sempre que não puder responder com certeza, e são
    quatro casos: banco sem a coluna do carimbo, memória sem carimbo nenhum,
    quase tudo mudado (aí dois passos custam mais que um) e falha ao buscar.

    Recuar é o lado seguro do erro. O contrário, ficar com a tela mostrando dado
    velho, é o defeito que ninguém percebe.
  */
  const sincronizarComCache = useCallback(async () => {
    const remotos = await fetchCarimbos();
    if (!remotos) return relerTudo();

    const plano = planejarReleitura(carimbos.current, remotos);

    if (plano.buscar.length === 0 && plano.remover.length === 0) return;
    if (!valeIncremental(plano, remotos.length)) return relerTudo();

    const linhas = await fetchPorIds(plano.buscar);
    if (!linhas) return;

    const buscados = options.current.fromRows(linhas);

    const proximos = aplicarReleitura({
      local: persisted.current,
      ordem: remotos.map((linha) => linha.id),
      buscados,
      identify: options.current.identify,
    });

    setItems(proximos);
    persisted.current = proximos;
    carimbos.current = new Map(remotos.map((linha) => [linha.id, linha.syncedAt]));

    /*
      E o cache é reescrito aqui também.

      Ele guarda linhas, e a recusa anterior era não inventar um segundo caminho
      de conversão reconvertendo registro em linha. A recusa continua valendo, e
      não é preciso converter nada: `linhas` são as linhas cruas que acabaram de
      chegar, que é exatamente o que o cache quer guardar.

      Sem isto ele não ficava "um pouco velho", ficava velho para sempre: nada o
      reescrevia, então toda abertura voltava a baixar as mesmas linhas. Medido
      depois de classificar 52 artigos — o cache continuou com as 52 antigas
      através de recarregamentos, e a releitura pagava por elas de novo em cada
      um, para catorze pessoas várias vezes por dia.
    */
    if (linhasEmCache.current !== null) {
      guardarNoCache(
        mesclarLinhas({
          local: linhasEmCache.current,
          ordem: remotos.map((linha) => linha.id),
          buscadas: linhas,
        })
      );
    }
  }, [fetchCarimbos, fetchPorIds, guardarNoCache, relerTudo]);

  /*
    A carga inicial acontece **uma vez**, e a guarda é uma ref e não a lista de
    dependências.

    O efeito roda mais de uma vez por montagem: o React monta duas vezes em
    desenvolvimento, e qualquer dependência que mude o traz de volta. Cada
    execução era uma carga completa da coleção, e com o cache ficou pior: as
    leituras do IndexedDB se atropelavam, uma devolvia vazio, e aquela execução
    entendia "sem cache" e baixava os 22,7 MB. Medido: doze pedidos numa
    abertura que deveria custar dois.

    Quem cuida de manter isto atualizado depois é o tempo real, que é o desenho
    desde o começo. A carga inicial só precisa acontecer, e só precisa acontecer
    uma vez.

    Com a guarda, o antigo `alive` da limpeza saiu, e ele **precisava** sair: o
    React desmonta e remonta em desenvolvimento, a limpeza da primeira execução
    marcava `alive = false` enquanto a leitura ainda estava no ar, e a segunda
    execução saía pela guarda. O resultado chegava e era descartado, a coleção
    nunca era populada, e a tela ficava em esqueleto sem erro nenhum.
  */
  const carregou = useRef(false);

  // Carga inicial.
  useEffect(() => {
    if (carregou.current) return;

    carregou.current = true;

    async function load() {
      if (remote) {
        /*
          O que já está aqui aparece primeiro, e o que mudou vem depois.

          A abertura custava o acervo inteiro, 22,7 MB, toda vez que alguém
          abria o produto. Com o cache do navegador a tela mostra o acervo em
          milissegundos e a rede fica com o trabalho pequeno de dizer o que
          mudou desde a última vez.

          Guardamos as **linhas**, e não os registros convertidos: a conversão é
          onde mora o normalizador, e pular o normalizador é como um campo novo
          derrubaria a tela na primeira leitura.
        */
        const guardado = usaCache ? await lerCache(table) : null;

        if (guardado && guardado.rows.length > 0) {
          /*
            Uma conversão só, e é o ponto em que isto quebrou feio.

            Duas chamadas a `fromRows` produzem dois arrays com objetos
            diferentes, e a gravação compara identidade para saber o que mudou:
            com duas conversões, **todos** os 1.822 artigos pareciam alterados
            na abertura, e o produto os regravava no banco. Uma abertura
            escrevia o acervo inteiro de volta, e o carimbo de todos eles
            mudava, o que fazia a releitura seguinte recuar para a leitura
            completa. O cache piorava as duas coisas que ele veio consertar.
          */
          const doCache = options.current.fromRows(guardado.rows);

          setItems(doCache);
          persisted.current = doCache;
          carimbos.current = new Map(guardado.carimbos);
          /* As linhas ficam guardadas para a releitura incremental reescrever o cache. */
          linhasEmCache.current = guardado.rows;
          setIsHydrated(true);

          /*
            A partir daqui a releitura incremental conserta a diferença. Se ela
            não puder responder com certeza, recua para a leitura inteira
            sozinha, que é o comportamento de sempre.
          */
          await sincronizarComCache();
          return;
        }

        const lido = await fetchAll();
        if (lido) {
          setItems(lido.items);
          persisted.current = lido.items;
          carimbos.current = new Map(lido.carimbos.map((linha) => [linha.id, linha.syncedAt]));

          if (usaCache) {
            linhasEmCache.current = lido.rows;

            void gravarCache(table, {
              rows: lido.rows,
              carimbos: [...carimbos.current],
              at: new Date().toISOString(),
            });
          }
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

      setIsHydrated(true);
    }

    void load();
  }, [fetchAll, key, remote, sincronizarComCache, table, usaCache]);

  /*
    Tempo real. Qualquer mudança na tabela relê a coleção inteira em vez de
    aplicar o payload: aplicar evento a evento erra quando eles chegam fora de
    ordem ou quando um se perde na reconexão.

    Mas o aviso vem **por linha**, e a releitura custa o acervo inteiro. Uma
    classificação em massa de noventa e oito artigos produzia noventa e oito
    releituras de 22,7 MB em cada aba aberta da equipe, e o trabalho das
    noventa e oito era o mesmo: a releitura busca o estado atual, não o evento.
    Por isso a rajada vira uma execução só.
  */
  useEffect(() => {
    if (!supabase || !isHydrated) return;

    const coalescer = criarCoalescer(
      () => {
        void (async () => {
          if (releituraIncremental && carimbos.current.size > 0) {
            await sincronizarComCache();
            return;
          }

          await relerTudo();
        })();
      },
      ESPERA_DO_ECO,
      TETO_DO_ECO
    );

    const channel = supabase
      .channel(`sync:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        /*
          Enquanto **nós** estamos gravando, o eco da própria escrita não pode
          reler: cada lote dispara um evento, e a releitura devolveria uma
          visão **parcial** do banco que substituiria o estado local no meio
          do caminho. Foi assim que uma importação de 1.782 artigos ficou com
          440 na tela e o resto sumiu da memória.
        */
        if (gravando.current) return;

        coalescer.pedir();
      })
      .subscribe();

    return () => {
      coalescer.cancelar();
      supabase.removeChannel(channel);
    };
  }, [isHydrated, releituraIncremental, relerTudo, sincronizarComCache, supabase, table]);

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

        A importação do portal grava 1.822 artigos. São 22,7 MB de corpo HTML,
        e um `upsert` único com isso estoura o limite de tamanho do pedido: a
        falha chegaria como erro genérico depois de a pessoa ter esperado a
        varredura inteira.

        O lote fecha por bytes antes de fechar por contagem, porque o corpo do
        artigo varia de um par de KB a 311 KB e vinte e cinco linhas podem ser
        300 KB ou 2,5 MB. O `delete` continua contando linhas: ali só vão
        identificadores, e o teto é o tamanho da URL.
      */
      const linhas = mudados.map(row);

      for (const lote of emLotesPorTamanho(
        linhas,
        POR_LOTE,
        BYTES_POR_LOTE,
        (linha) => JSON.stringify(linha).length
      )) {
        const { error } = await tabela.upsert(lote);

        if (error) {
          /*
            A consequência vai junto porque a tela já disse que deu certo.

            A mudança fica só nesta aba: a operação avisa "aplicado" assim que
            o estado local muda, e a gravação acontece depois, aqui. Quem ler
            só "não foi possível gravar" fecha a aba achando que perdeu pouco,
            e perde o trabalho inteiro. Foi assim que 91 classificações de
            artigo sumiram entre a tela e o banco.
          */
          toast.error(
            `Não foi possível gravar: ${error.message}. A mudança está só nesta aba, e recarregar a página perde ela.`
          );
          return;
        }
      }

      for (const lote of emLotes(removidos, POR_LOTE)) {
        const { error } = await tabela.delete().in("id", lote);

        if (error) {
          toast.error(
            `Não foi possível remover: ${error.message}. A mudança está só nesta aba, e recarregar a página perde ela.`
          );
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
