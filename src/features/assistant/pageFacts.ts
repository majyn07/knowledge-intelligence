import type { Finding } from "@/features/survey/survey";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Taxonomy } from "@/models/Taxonomy";
import type { Ticket } from "@/models/Ticket";
import { sectionsOf } from "@/models/Taxonomy";

/**
 * O que a IA sabe da tela em que a pessoa está.
 *
 * **Ela responde do que o produto calculou, e não varrendo o acervo.** São 1.822
 * artigos e 22 MB: não cabem num pedido, e não precisam. As perguntas que
 * motivaram isto — "existe conteúdo repetido?", "quais poderiam virar um só?" —
 * o Levantamento já responde por medição, e um modelo recontando produziria um
 * número diferente do que a tela mostra, sem ninguém saber qual está certo.
 *
 * Então o contexto é um **retrato factual**: contagens que o produto derivou,
 * mais os achados do Levantamento, mais uma amostra pequena para o modelo ter
 * exemplos concretos. O trabalho dele é explicar, priorizar e ligar as pontas —
 * que é justamente o que uma lista de números não faz sozinha.
 *
 * Consequência assumida: perguntas que exigiriam ler o acervo inteiro ("resuma
 * todos os artigos de laje") não têm resposta aqui, e o prompt manda dizer isso
 * em vez de inventar. Para ler um artigo existe o painel dentro dele.
 */

export interface Fato {
  rotulo: string;
  valor: string;
}

export interface PageFacts {
  /** Em que tela a pessoa está, em palavras. */
  tela: string;
  /** O que ela pode perguntar aqui, para a IA não prometer o que não alcança. */
  alcance: string;
  fatos: Fato[];
  /** Achados já calculados, quando a tela tem. */
  achados: { titulo: string; porque: string }[];
  /** Exemplos concretos, poucos: o modelo precisa de amostra, não do acervo. */
  amostra: string[];
  /**
   * O que perguntar aqui.
   *
   * Campo de texto vazio não diz o que a ferramenta alcança, e quem não sabe o
   * que ela sabe pergunta o que ela não pode responder — sai frustrado e não
   * volta. As sugestões são o alcance escrito em forma de pergunta.
   */
  sugestoes: string[];
}

/** Quantos exemplos vão no pedido. Poucos: é amostra, não acervo. */
const NA_AMOSTRA = 12;

/** Quantos achados vão. A lista é para priorizar, não para transcrever. */
const ACHADOS_NO_PEDIDO = 15;

/*
  Contagem por chave, e o nome evita `contar`: `lib/plural` exporta um `contar`
  que faz outra coisa — concordar em número. Dois nomes iguais com significados
  diferentes é onde alguém importa o errado sem perceber.
*/
function agruparEContar<T>(itens: T[], chave: (item: T) => string): Fato[] {
  const contagem = new Map<string, number>();

  for (const item of itens) {
    const nome = chave(item) || "Não definido";
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }

  return [...contagem]
    .sort((a, b) => b[1] - a[1])
    .map(([rotulo, valor]) => ({ rotulo, valor: String(valor) }));
}

export interface EntradaDosFatos {
  rota: string;
  articles: KnowledgeArticle[];
  tickets: Ticket[];
  conversations: SupportConversation[];
  taxonomy: Taxonomy;
  achados: Finding[];
}

/**
 * O retrato da tela atual.
 *
 * A rota decide o recorte: quem está na Biblioteca pergunta do acervo, quem
 * está em Atendimentos pergunta da fila. Mandar tudo em toda tela encheria o
 * pedido de contexto que não vem ao caso e diluiria o que vem.
 */
export function pageFacts(entrada: EntradaDosFatos): PageFacts {
  if (entrada.rota.startsWith("/library")) return doAcervo(entrada);
  if (entrada.rota.startsWith("/analysis")) return dosAtendimentos(entrada);
  if (entrada.rota.startsWith("/survey")) return doLevantamento(entrada);
  if (entrada.rota.startsWith("/indicators")) return dosIndicadores(entrada);

  return geral(entrada);
}

function doAcervo({ articles, taxonomy, achados }: EntradaDosFatos): PageFacts {
  const publicados = articles.filter((artigo) => artigo.status === "published");
  const secoes = taxonomy.categories.flatMap((categoria) => sectionsOf(taxonomy, categoria.id));

  const nomeDaSecao = new Map(secoes.map((secao) => [secao.id, secao.name]));

  const semSecao = articles.filter((artigo) => artigo.sectionId === "").length;

  return {
    tela: "Biblioteca — o acervo de artigos publicados no portal de suporte.",
    alcance:
      "Perguntas sobre o tamanho e a saúde do acervo, sobre o que está repetido ou " +
      "sobreposto, e sobre o que falta cobrir. Os números vêm medidos do acervo.",
    fatos: [
      { rotulo: "Artigos no acervo", valor: String(articles.length) },
      { rotulo: "Publicados", valor: String(publicados.length) },
      { rotulo: "Sem seção", valor: String(semSecao) },
      { rotulo: "Seções cadastradas", valor: String(secoes.length) },
      /*
        As seções vão rotuladas como seções, e o artigo sem seção fica de fora
        daqui: ele já tem linha própria acima. Sem isso a lista trazia "Sem
        seção" duas vezes com números diferentes (56 no acervo, 55 publicados),
        que lê como contradição — e as duas linhas colidiam na chave do React.
      */
      ...agruparEContar(
        publicados.filter((artigo) => artigo.sectionId !== ""),
        (artigo) => `Seção ${nomeDaSecao.get(artigo.sectionId) ?? "desconhecida"}`
      ).slice(0, 10),
    ],
    achados: resumirAchados(achados),
    amostra: publicados.slice(0, NA_AMOSTRA).map((artigo) => artigo.title),
    sugestoes: [
      "Existe conteúdo repetido ou artigos que poderiam virar um só?",
      "Onde o acervo está mais descoberto?",
      "Por onde eu começaria a arrumar a Biblioteca hoje?",
    ],
  };
}

function dosAtendimentos({ tickets, conversations, achados }: EntradaDosFatos): PageFacts {
  const comConversa = new Set(conversations.map((conversa) => conversa.ticketId));

  return {
    tela: "Atendimentos — a fila de chamados que vieram do suporte.",
    alcance:
      "Perguntas sobre o que está chegando, o que já foi analisado e o que ainda " +
      "espera leitura. Os agrupamentos vêm da triagem, que compara o que o cliente escreveu.",
    fatos: [
      { rotulo: "Atendimentos", valor: String(tickets.length) },
      { rotulo: "Com conversa registrada", valor: String(comConversa.size) },
      {
        rotulo: "Sem solução registrada",
        valor: String(tickets.filter((ticket) => ticket.solution.trim() === "").length),
      },
    ],
    achados: resumirAchados(achados),
    amostra: tickets.slice(0, NA_AMOSTRA).map((ticket) => ticket.title),
    sugestoes: [
      "Que assunto está chegando mais e o acervo não cobre?",
      "Por qual atendimento eu deveria começar?",
      "O que dá para transformar em artigo a partir desta fila?",
    ],
  };
}

function doLevantamento({ achados }: EntradaDosFatos): PageFacts {
  return {
    tela: "Levantamento — o que o acervo está pedindo, apurado dos dados.",
    alcance:
      "Perguntas sobre os achados: por onde começar, o que vale mais, o que dá para " +
      "resolver junto. Todos foram calculados dos dados, nenhum veio de modelo.",
    fatos: [
      { rotulo: "Achados", valor: String(achados.length) },
      ...agruparEContar(achados, (achado) => achado.severity),
      ...agruparEContar(achados, (achado) => achado.kind).slice(0, 8),
    ],
    achados: resumirAchados(achados),
    amostra: [],
    sugestoes: [
      "Por onde eu começo, considerando o que rende mais?",
      "Quais destes achados dá para resolver de uma vez só?",
      "O que aqui é urgente e o que pode esperar?",
    ],
  };
}

function dosIndicadores({ articles, tickets, achados }: EntradaDosFatos): PageFacts {
  return {
    tela: "Indicadores — como o ciclo de conhecimento se moveu.",
    alcance:
      "Perguntas sobre volume, cobertura e o que os números indicam. Os valores " +
      "vêm calculados; a leitura deles é o que se pede aqui.",
    fatos: [
      { rotulo: "Atendimentos", valor: String(tickets.length) },
      { rotulo: "Artigos publicados", valor: String(articles.filter((a) => a.status === "published").length) },
      ...agruparEContar(articles, (artigo) => artigo.status),
    ],
    achados: resumirAchados(achados),
    amostra: [],
    sugestoes: [
      "O que estes números dizem sobre o ciclo?",
      "O que eu levaria destes indicadores para uma reunião?",
      "Onde o ciclo está travando?",
    ],
  };
}

function geral({ articles, tickets }: EntradaDosFatos): PageFacts {
  return {
    tela: "Visus Knowledge Intelligence — o hub que transforma atendimento em conhecimento.",
    alcance:
      "Perguntas gerais sobre o produto e sobre os números do espaço de trabalho. " +
      "Para detalhe de acervo ou de fila, a pergunta rende mais na tela correspondente.",
    fatos: [
      { rotulo: "Artigos", valor: String(articles.length) },
      { rotulo: "Atendimentos", valor: String(tickets.length) },
    ],
    achados: [],
    amostra: [],
    sugestoes: [
      "O que este produto faz?",
      "Como um atendimento vira artigo publicado?",
      "Por onde eu começo a usar isto?",
    ],
  };
}

/**
 * Os achados como o modelo os lê.
 *
 * O `why` vai junto porque é a evidência: sem ele o modelo teria de supor por
 * que o achado existe, e supor é o que esta ferramenta não deve fazer.
 */
function resumirAchados(achados: Finding[]): { titulo: string; porque: string }[] {
  return achados
    .slice(0, ACHADOS_NO_PEDIDO)
    .map((achado) => ({ titulo: `${achado.action} — ${achado.subject}`, porque: achado.why }));
}
