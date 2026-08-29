import { describe, expect, it } from "vitest";

import {
  decidirSincronizacao,
  FOLGA_MS,
  INTERVALO_PADRAO_MS,
  intervaloLegivel,
  RETOMADA_MAXIMA_MS,
  TRANCA_ABANDONADA_MS,
  varreduraEmCurso,
  type EstadoDaSincronizacao,
} from "./autoSync";

const AGORA = new Date("2026-08-28T15:00:00.000Z");

const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 60 * 60 * 1000).toISOString();

const estado = (extra: Partial<EstadoDaSincronizacao> = {}): EstadoDaSincronizacao => ({
  ligado: true,
  bloqueado: false,
  ultimaEm: "",
  execucaoEm: "",
  execucaoPor: "",
  /*
    Sem atraso por padrão nos testes antigos: eles foram escritos para a janela
    que ia até agora, e continuam descrevendo essa regra. Os do atraso pedem o
    atraso explicitamente, logo abaixo.
  */
  atrasoDias: 0,
  janelaDias: 30,
  cursorEm: "",
  ...extra,
});

describe("decidirSincronizacao", () => {
  it("não busca com o interruptor desligado", () => {
    const decisao = decidirSincronizacao(estado({ ligado: false, ultimaEm: horasAtras(5) }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "desligado" });
  });

  it("não busca antes de o intervalo fechar", () => {
    const decisao = decidirSincronizacao(estado({ ligado: true, ultimaEm: horasAtras(0.5) }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "cedo-demais" });
  });

  it("busca quando o intervalo fechou", () => {
    const decisao = decidirSincronizacao(
      estado({ ligado: true, ultimaEm: horasAtras(2), cursorEm: horasAtras(2) }),
      AGORA
    );

    expect(decisao.sincronizar).toBe(true);
  });

  /*
    Se a última busca foi na sexta, quem abre na segunda precisa que ela alcance
    a sexta. Buscar só a última hora deixaria o fim de semana para trás, em
    silêncio.
  */
  it("a janela cobre o intervalo perdido, e não a última hora", () => {
    const decisao = decidirSincronizacao(
      estado({ ligado: true, ultimaEm: horasAtras(72), cursorEm: horasAtras(72) }),
      AGORA
    );

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const recuo = AGORA.getTime() - new Date(decisao.desde).getTime();

    expect(recuo).toBeGreaterThan(71 * 60 * 60 * 1000);
  });

  /*
    Dois relógios nunca batem no milissegundo, e sem folga a conversa que chega
    na virada cai no vão entre duas execuções, sem erro nenhum.
  */
  it("recua um pouco além da última execução", () => {
    const decisao = decidirSincronizacao(
      estado({ ligado: true, ultimaEm: horasAtras(2), cursorEm: horasAtras(2) }),
      AGORA
    );

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const ultima = new Date(horasAtras(2)).getTime();

    expect(new Date(decisao.desde).getTime()).toBe(ultima - FOLGA_MS);
  });

  /*
    Duas semanas sem ninguém abrir significa férias ou produto parado, e a
    retomada viraria a varredura do histórico inteiro disparada sozinha.
  */
  it("não retoma sozinha depois de parada longa demais", () => {
    const parada = new Date(AGORA.getTime() - RETOMADA_MAXIMA_MS - 1000).toISOString();

    const decisao = decidirSincronizacao(estado({ ligado: true, ultimaEm: parada }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "parado-tempo-demais" });
  });

  /* A primeira busca é de gente: escolher a janela sozinho seria disparar um tamanho que ninguém pediu. */
  it("não faz a primeira busca sozinha", () => {
    const decisao = decidirSincronizacao(estado({ ligado: true, ultimaEm: "" }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "sem-registro" });
  });

  it("trata carimbo ilegível como se não houvesse registro", () => {
    const decisao = decidirSincronizacao(estado({ ligado: true, ultimaEm: "ontem" }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "sem-registro" });
  });

  it("aceita intervalo diferente do padrão", () => {
    const comMeiaHora = estado({ ligado: true, ultimaEm: horasAtras(0.5) });

    expect(decidirSincronizacao(comMeiaHora, AGORA).sincronizar).toBe(false);
    expect(decidirSincronizacao(comMeiaHora, AGORA, 10 * 60 * 1000).sincronizar).toBe(true);
  });

  it("o padrão é de uma hora", () => {
    expect(INTERVALO_PADRAO_MS).toBe(60 * 60 * 1000);
  });
});

describe("intervaloLegivel", () => {
  it("diz a hora sem obrigar ninguém a converter milissegundos", () => {
    expect(intervaloLegivel(60 * 60 * 1000)).toBe("a cada hora");
    expect(intervaloLegivel(3 * 60 * 60 * 1000)).toBe("a cada 3 horas");
  });

  it("cai em minutos abaixo de uma hora", () => {
    expect(intervaloLegivel(15 * 60 * 1000)).toBe("a cada 15 minutos");
  });
});

/*
  A pergunta que originou o freio: "como impeço que alguém sobrecarregue o
  servidor do suporte". Desligar a automática não responde, porque qualquer
  administrador ainda varre três meses à mão.
*/
describe("o freio", () => {
  it("bloqueado vence tudo, inclusive a automática ligada", () => {
    const decisao = decidirSincronizacao(
      estado({ bloqueado: true, ultimaEm: horasAtras(5) }),
      AGORA
    );

    expect(decisao).toEqual({ sincronizar: false, motivo: "bloqueado" });
  });

  it("bloqueado vence mesmo com a automática desligada", () => {
    const decisao = decidirSincronizacao(
      estado({ ligado: false, bloqueado: true, ultimaEm: horasAtras(5) }),
      AGORA
    );

    expect(decisao.sincronizar).toBe(false);
    if (decisao.sincronizar) return;
    expect(decisao.motivo).toBe("bloqueado");
  });
});

/*
  Dois administradores com a tela aberta disparariam duas varreduras de três
  meses contra a mesma caixa, e o servidor do suporte sentiria as duas somadas.
*/
describe("uma varredura por vez", () => {
  it("não começa com outra em curso", () => {
    const decisao = decidirSincronizacao(
      estado({ ultimaEm: horasAtras(5), execucaoEm: horasAtras(0.01), execucaoPor: "Outra pessoa" }),
      AGORA
    );

    expect(decisao).toEqual({ sincronizar: false, motivo: "ja-em-curso" });
  });

  /* Aba fechada no meio deixaria a tranca fechada para sempre. */
  it("tranca sem sinal de vida é dada como abandonada", () => {
    const abandonada = new Date(AGORA.getTime() - TRANCA_ABANDONADA_MS - 1000).toISOString();

    const decisao = decidirSincronizacao(
      estado({ ultimaEm: horasAtras(5), cursorEm: horasAtras(5), execucaoEm: abandonada }),
      AGORA
    );

    expect(decisao.sincronizar).toBe(true);
  });

  it("sem tranca não há varredura em curso", () => {
    expect(varreduraEmCurso(estado(), AGORA)).toBe(false);
  });

  it("carimbo ilegível não tranca ninguém", () => {
    expect(varreduraEmCurso(estado({ execucaoEm: "ontem" }), AGORA)).toBe(false);
  });
});

/*
  Medido contra a caixa real: nas conversas mais recentes de uma janela de três
  dias, 119 de 144 não tinham chamado associado; nas mais antigas da mesma
  janela, treze de vinte viraram atendimento. Ler o que acabou de chegar é ler
  antes de existir o que se quer.
*/
describe("a janela fica atrás do agora", () => {
  const comAtraso = (extra: Partial<EstadoDaSincronizacao> = {}) =>
    estado({ atrasoDias: 2, janelaDias: 10, ultimaEm: horasAtras(5), ...extra });

  it("o fim da janela recua o atraso escolhido", () => {
    const decisao = decidirSincronizacao(comAtraso({ cursorEm: horasAtras(96) }), AGORA);

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const recuoDoFim = AGORA.getTime() - new Date(decisao.ate).getTime();

    expect(recuoDoFim).toBe(2 * 24 * 60 * 60 * 1000);
  });

  /* Zero devolve o comportamento antigo: janela até agora. */
  it("sem atraso, o fim é agora", () => {
    const decisao = decidirSincronizacao(
      comAtraso({ atrasoDias: 0, cursorEm: horasAtras(5) }),
      AGORA
    );

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    expect(new Date(decisao.ate).getTime()).toBe(AGORA.getTime());
  });

  /*
    Uma busca à mão que varreu até agora já cobriu tudo que está maduro.
    Buscar de novo antes de o tempo passar seria reler o mesmo.
  */
  it("não busca quando o cursor já passou do fim da janela", () => {
    const decisao = decidirSincronizacao(comAtraso({ cursorEm: horasAtras(1) }), AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "nada-maduro" });
  });

  /* O teto existe para uma volta de férias não virar a varredura do trimestre. */
  it("a janela não passa da largura máxima", () => {
    const decisao = decidirSincronizacao(comAtraso({ cursorEm: horasAtras(24 * 90) }), AGORA);

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const largura = new Date(decisao.ate).getTime() - new Date(decisao.desde).getTime();

    expect(largura).toBe(10 * 24 * 60 * 60 * 1000);
  });

  /* Quem só fez busca à mão antes de ligar a automática não tem cursor. */
  it("sem cursor, parte da largura máxima", () => {
    const decisao = decidirSincronizacao(comAtraso({ cursorEm: "" }), AGORA);

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const largura = new Date(decisao.ate).getTime() - new Date(decisao.desde).getTime();

    expect(largura).toBe(10 * 24 * 60 * 60 * 1000);
  });

  it("atraso negativo é tratado como zero", () => {
    const decisao = decidirSincronizacao(
      comAtraso({ atrasoDias: -5, cursorEm: horasAtras(5) }),
      AGORA
    );

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    expect(new Date(decisao.ate).getTime()).toBe(AGORA.getTime());
  });
});
