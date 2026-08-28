import { describe, expect, it } from "vitest";

import {
  decidirSincronizacao,
  FOLGA_MS,
  INTERVALO_PADRAO_MS,
  intervaloLegivel,
  RETOMADA_MAXIMA_MS,
} from "./autoSync";

const AGORA = new Date("2026-08-28T15:00:00.000Z");

const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 60 * 60 * 1000).toISOString();

describe("decidirSincronizacao", () => {
  it("não busca com o interruptor desligado", () => {
    const decisao = decidirSincronizacao({ ligado: false, ultimaEm: horasAtras(5) }, AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "desligado" });
  });

  it("não busca antes de o intervalo fechar", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: horasAtras(0.5) }, AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "cedo-demais" });
  });

  it("busca quando o intervalo fechou", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: horasAtras(2) }, AGORA);

    expect(decisao.sincronizar).toBe(true);
  });

  /*
    Se a última busca foi na sexta, quem abre na segunda precisa que ela alcance
    a sexta. Buscar só a última hora deixaria o fim de semana para trás, em
    silêncio.
  */
  it("a janela cobre o intervalo perdido, e não a última hora", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: horasAtras(72) }, AGORA);

    if (!decisao.sincronizar) throw new Error("deveria sincronizar");

    const recuo = AGORA.getTime() - new Date(decisao.desde).getTime();

    expect(recuo).toBeGreaterThan(71 * 60 * 60 * 1000);
  });

  /*
    Dois relógios nunca batem no milissegundo, e sem folga a conversa que chega
    na virada cai no vão entre duas execuções, sem erro nenhum.
  */
  it("recua um pouco além da última execução", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: horasAtras(2) }, AGORA);

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

    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: parada }, AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "parado-tempo-demais" });
  });

  /* A primeira busca é de gente: escolher a janela sozinho seria disparar um tamanho que ninguém pediu. */
  it("não faz a primeira busca sozinha", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: "" }, AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "sem-registro" });
  });

  it("trata carimbo ilegível como se não houvesse registro", () => {
    const decisao = decidirSincronizacao({ ligado: true, ultimaEm: "ontem" }, AGORA);

    expect(decisao).toEqual({ sincronizar: false, motivo: "sem-registro" });
  });

  it("aceita intervalo diferente do padrão", () => {
    const estado = { ligado: true, ultimaEm: horasAtras(0.5) };

    expect(decidirSincronizacao(estado, AGORA).sincronizar).toBe(false);
    expect(decidirSincronizacao(estado, AGORA, 10 * 60 * 1000).sincronizar).toBe(true);
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
