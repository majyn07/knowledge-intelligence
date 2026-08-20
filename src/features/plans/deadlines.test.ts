import { describe, expect, it } from "vitest";

import {
  attentionRank,
  daysSince,
  daysUntil,
  deadlineLabel,
  deadlineState,
  isStalled,
  parseDate,
  STALLED_AFTER_DAYS,
} from "./deadlines";

const agora = new Date("2026-08-20T18:00:00.000Z");
const dia = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe("parseDate", () => {
  it("recusa o texto de exibição que os planos guardavam", () => {
    // "Ontem, 16:20" e "15 jul. 2026" eram o formato anterior. Interpretá-los
    // exigiria inventar um instante que o registro nunca teve.
    expect(parseDate("Ontem, 16:20")).toBeNull();
    expect(parseDate("15 jul. 2026")).toBeNull();
  });

  it("aceita ISO e Date, e trata ausência como ausência", () => {
    expect(parseDate("2026-08-20T00:00:00.000Z")).toBeInstanceOf(Date);
    expect(parseDate(new Date())).toBeInstanceOf(Date);
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("daysUntil", () => {
  it("compara dias, não instantes", () => {
    // Quem olha às 18h não deve ver "atrasado" num prazo para hoje só porque
    // o registro foi criado de manhã.
    expect(daysUntil("2026-08-20T09:00:00.000Z", agora)).toBe(0);
    expect(daysUntil("2026-08-20T23:59:00.000Z", agora)).toBe(0);
  });

  it("conta para frente e para trás", () => {
    expect(daysUntil(dia(3), agora)).toBe(3);
    expect(daysUntil(dia(-2), agora)).toBe(-2);
  });

  it("sem prazo devolve nulo, e não zero", () => {
    // Zero significaria "vence hoje", que é uma afirmação bem diferente.
    expect(daysUntil(undefined, agora)).toBeNull();
  });
});

describe("deadlineState", () => {
  it("separa atrasado, hoje, próximo e distante", () => {
    expect(deadlineState(dia(-1), agora)).toBe("atrasado");
    expect(deadlineState("2026-08-20T08:00:00.000Z", agora)).toBe("hoje");
    expect(deadlineState(dia(2), agora)).toBe("proximo");
    expect(deadlineState(dia(10), agora)).toBe("distante");
    expect(deadlineState(undefined, agora)).toBe("sem-prazo");
  });

  it("o horizonte de ação é três dias", () => {
    expect(deadlineState(dia(3), agora)).toBe("proximo");
    expect(deadlineState(dia(4), agora)).toBe("distante");
  });
});

describe("deadlineLabel", () => {
  it("fala como quem lê", () => {
    expect(deadlineLabel("2026-08-20T08:00:00.000Z", agora)).toBe("vence hoje");
    expect(deadlineLabel(dia(1), agora)).toBe("vence amanhã");
    expect(deadlineLabel(dia(5), agora)).toBe("vence em 5 dias");
  });

  it("singular no atraso de um dia", () => {
    expect(deadlineLabel(dia(-1), agora)).toBe("atrasado 1 dia");
    expect(deadlineLabel(dia(-4), agora)).toBe("atrasado 4 dias");
  });

  it("sem prazo não inventa texto", () => {
    expect(deadlineLabel(undefined, agora)).toBe("");
    expect(deadlineLabel("Ontem, 16:20", agora)).toBe("");
  });
});

describe("isStalled", () => {
  it("parado é diferente de atrasado", () => {
    // Um plano sem prazo nenhum pode estar parado. São perguntas separadas.
    expect(isStalled(dia(-STALLED_AFTER_DAYS), agora)).toBe(true);
    expect(isStalled(dia(-1), agora)).toBe(false);
  });

  it("registro concluído não está parado — ele terminou", () => {
    expect(isStalled(dia(-30), agora, { finished: true })).toBe(false);
  });

  it("sem histórico não afirma parada", () => {
    expect(isStalled(undefined, agora)).toBe(false);
  });

  it("data no futuro não vira parada negativa", () => {
    expect(daysSince(dia(2), agora)).toBe(0);
  });
});

describe("attentionRank", () => {
  it("ordena a fila: atrasado, hoje, parado, próximo, resto", () => {
    const rank = (input: Parameters<typeof attentionRank>[0]) => attentionRank(input);

    expect(rank({ due: dia(-2), now: agora })).toBe(0);
    expect(rank({ due: "2026-08-20T08:00:00.000Z", now: agora })).toBe(1);
    expect(rank({ lastActivityAt: dia(-20), now: agora })).toBe(2);
    expect(rank({ due: dia(2), now: agora })).toBe(3);
    expect(rank({ due: dia(30), now: agora })).toBe(4);
  });

  it("atraso vence parada quando as duas valem", () => {
    // O que já passou do prazo é mais urgente que o que só não se move.
    expect(attentionRank({ due: dia(-1), lastActivityAt: dia(-30), now: agora })).toBe(0);
  });

  it("sem prazo e sem parada cai no fim da fila, não some", () => {
    expect(attentionRank({ now: agora })).toBe(4);
  });
});

describe("estrito por segurança, não por rigor", () => {
  it("recusa formato que depende do motor para ser lido", () => {
    // `new Date("15 jul. 2026")` funciona neste Node e pode falhar noutro
    // navegador. Aceitar significaria o mesmo registro mostrando prazos
    // diferentes em máquinas diferentes, sem nada indicando o problema.
    for (const texto of ["15 jul. 2026", "20/08/2026", "Aug 20 2026", "hoje"]) {
      expect(parseDate(texto), texto).toBeNull();
    }
  });

  it("aceita as formas ISO que o produto grava", () => {
    expect(parseDate("2026-08-20")).toBeInstanceOf(Date);
    expect(parseDate("2026-08-20T18:00")).toBeInstanceOf(Date);
    expect(parseDate("2026-08-20T18:00:00.000Z")).toBeInstanceOf(Date);
  });

  it("recusa data em forma ISO que não existe no calendário", () => {
    expect(parseDate("2026-02-30")).toBeNull();
  });
});

describe("fuso horário", () => {
  it("aceita hora do fim do dia sem fuso, que é lida como local", () => {
    /*
      Defeito que a primeira versão da conferência de transbordo tinha: com
      hora e sem fuso, "2026-08-20T22:00" vira 21 de agosto em UTC num fuso a
      oeste de Greenwich, e comparar componentes UTC recusava a data.
    */
    for (const hora of ["00:00", "12:00", "22:00", "23:59"]) {
      expect(parseDate(`2026-08-20T${hora}`), hora).toBeInstanceOf(Date);
    }
  });

  it("o transbordo continua sendo pego na forma de data pura", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-04-31")).toBeNull();
    expect(parseDate("2026-02-28")).toBeInstanceOf(Date);
  });
});
