"use client";

/**
 * O acervo guardado no navegador, para a abertura não custar o download inteiro.
 *
 * A releitura incremental já resolveu o eco do tempo real: um colega
 * classificando um artigo custa três pedidos em vez de onze. A abertura
 * continuava custando os 22,7 MB, **toda vez que alguém abre o produto**, e é o
 * custo que catorze pessoas pagam várias vezes por dia.
 *
 * Com o carimbo `synced_at` no banco, a saída é a mesma ideia aplicada ao outro
 * momento: mostrar o que já está aqui, perguntar o que mudou, e baixar só isso.
 *
 * **`localStorage` não serve, e não é preferência.** O teto dele fica entre 5 e
 * 10 MB conforme o navegador, e o acervo tem 22,7. IndexedDB não tem esse teto e
 * é assíncrono, que é o motivo de tudo aqui devolver `Promise`.
 *
 * O que se guarda são as **linhas do banco**, e não os registros já convertidos.
 * A conversão é onde mora o normalizador, e ele existe porque um registro pode
 * ter sido gravado por uma versão anterior do produto: guardar convertido faria
 * o cache pular o normalizador e a primeira leitura de um campo novo derrubaria
 * a tela. Aqui a linha do cache percorre exatamente o mesmo caminho da linha que
 * chega pela rede.
 */

const BANCO = "visus-cache";
const DEPOSITO = "colecoes";
const VERSAO = 1;

export interface ColecaoGuardada {
  /** As linhas como o banco as devolveu. */
  rows: unknown[];
  /** O carimbo de gravação de cada uma, por identificador. */
  carimbos: [string, string][];
  /** Quando este cache foi escrito, em ISO. */
  at: string;
}

/*
  Uma conexão só, guardada, e a promessa dela também.

  Abrir e fechar por operação parece limpo e não é: as chamadas se atropelam. O
  efeito de carga da coleção roda mais de uma vez (o React monta duas vezes em
  desenvolvimento, e cada provider tem o seu), e o `close()` de uma chamada
  derrubava a transação da outra. Quem recebia `null` entendia "sem cache" e
  baixava o acervo inteiro: o cache existia, estava correto, e mesmo assim a
  abertura custava os 22,7 MB. Medido: doze pedidos numa abertura que deveria
  custar dois.

  Guardada como **promessa** e não como banco: duas chamadas simultâneas antes
  de a primeira abrir precisam esperar a mesma abertura, senão o problema volta
  com outro nome.
*/
let conexao: Promise<IDBDatabase | null> | null = null;

/**
 * Abre o banco, ou devolve `null`.
 *
 * Ausência de IndexedDB é estado previsto, não erro: modo privado de alguns
 * navegadores, política corporativa, cota negada. Quem chama recua para a
 * leitura inteira, que é o caminho que já existia.
 */
function abrir(): Promise<IDBDatabase | null> {
  if (conexao) return conexao;

  conexao = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    let pedido: IDBOpenDBRequest;

    try {
      pedido = indexedDB.open(BANCO, VERSAO);
    } catch {
      resolve(null);
      return;
    }

    pedido.onupgradeneeded = () => {
      const banco = pedido.result;

      if (!banco.objectStoreNames.contains(DEPOSITO)) banco.createObjectStore(DEPOSITO);
    };

    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => resolve(null);

    /*
      `onblocked` dispara quando outra aba segura uma versão anterior. Sem este
      caminho a promessa nunca resolveria, e a tela ficaria em esqueleto para
      sempre esperando um cache que não vem.
    */
    pedido.onblocked = () => resolve(null);
  });

  /*
    Falha não fica guardada para sempre. Um `null` memoizado condenaria a aba
    inteira ao caminho sem cache por causa de um bloqueio momentâneo.
  */
  void conexao.then((banco) => {
    if (!banco) conexao = null;
  });

  return conexao;
}

function transacao(
  banco: IDBDatabase,
  modo: IDBTransactionMode
): IDBObjectStore | null {
  try {
    return banco.transaction(DEPOSITO, modo).objectStore(DEPOSITO);
  } catch {
    return null;
  }
}

export async function lerCache(chave: string): Promise<ColecaoGuardada | null> {
  const banco = await abrir();

  if (!banco) return null;

  return new Promise((resolve) => {
    const deposito = transacao(banco, "readonly");

    if (!deposito) {
      resolve(null);
      return;
    }

    const pedido = deposito.get(chave);

    pedido.onsuccess = () => {
      const valor = pedido.result as ColecaoGuardada | undefined;

      /*
        Forma conferida antes de acreditar. O cache é do navegador, e o
        navegador é de quem abre: um valor com outra forma não pode virar
        exceção dentro de um efeito.
      */
      if (
        !valor ||
        !Array.isArray(valor.rows) ||
        !Array.isArray(valor.carimbos) ||
        typeof valor.at !== "string"
      ) {
        resolve(null);
        return;
      }

      resolve(valor);
    };

    pedido.onerror = () => resolve(null);
  });
}

/**
 * Grava, e a falha vira resultado.
 *
 * Cota estourada aqui não é problema de ninguém: o cache é conveniência, e sem
 * ele o produto volta a baixar tudo, que é como ele funcionava antes. Por isso
 * não há aviso na tela: um erro sobre algo que não muda o que a pessoa vê é
 * ruído.
 */
export async function gravarCache(chave: string, valor: ColecaoGuardada): Promise<boolean> {
  const banco = await abrir();

  if (!banco) return false;

  return new Promise((resolve) => {
    const deposito = transacao(banco, "readwrite");

    if (!deposito) {
      resolve(false);
      return;
    }

    let pedido: IDBRequest;

    try {
      pedido = deposito.put(valor, chave);
    } catch {
      resolve(false);
      return;
    }

    pedido.onsuccess = () => resolve(true);
    pedido.onerror = () => resolve(false);
  });
}

/**
 * Apaga tudo que este cache guarda.
 *
 * A tela de falha oferece voltar à semente, e a promessa dela é apagar o que o
 * navegador guardou. Deixar o acervo aqui faria a promessa ser mentira, e o
 * problema que levou alguém àquela tela poderia estar justamente no cache.
 */
export async function limparCache(): Promise<void> {
  const banco = await abrir();

  if (!banco) return;

  return new Promise((resolve) => {
    const deposito = transacao(banco, "readwrite");

    if (!deposito) {
      resolve();
      return;
    }

    const pedido = deposito.clear();

    pedido.onsuccess = () => resolve();
    pedido.onerror = () => resolve();
  });
}
