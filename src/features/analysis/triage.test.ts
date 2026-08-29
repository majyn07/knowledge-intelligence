import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

import { MAXIMO_DE_ATENDIMENTOS, ticketTerms, triageTickets } from "./triage";

let sequencia = 0;

const atendimento = (extra: Partial<Ticket> = {}): Ticket => ({
  id: `tic-${(sequencia += 1)}`,
  projectId: "p1",
  title: "Atendimento",
  solution: "Resolvido.",
  company: "Construtora",
  causa: "",
  motivoDeContato: "",
  date: "2026-08-01",
  ...extra,
});

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: `art-${(sequencia += 1)}`,
  title: "Artigo",
  summary: "",
  content: "",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-vigas",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "html",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...extra,
});

/* Duas pessoas descrevendo o mesmo problema com palavras próprias. */
const FLECHA_A = "Flecha excessiva em viga contínua, cliente questiona fissuração";
const FLECHA_B = "Viga contínua apresentou flecha acima do limite, verificar fissuração";
const LICENCA = "Licença não ativa após reinstalação do sistema operacional";

describe("triageTickets", () => {
  it("junta atendimentos que falam do mesmo problema", () => {
    const { groups } = triageTickets(
      [
        atendimento({ title: FLECHA_A, solution: "Ajustada a inércia fissurada." }),
        atendimento({ title: FLECHA_B, solution: "Conferida a inércia fissurada." }),
      ],
      [],
      new Set()
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].tickets).toHaveLength(2);
    expect(groups[0].terms.length).toBeGreaterThan(0);
  });

  it("não junta assuntos diferentes", () => {
    const { groups } = triageTickets(
      [atendimento({ title: FLECHA_A }), atendimento({ title: LICENCA })],
      [],
      new Set()
    );

    expect(groups).toHaveLength(2);
  });

  /*
    O sinal que o produto existe para dar: muitos perguntando algo que o acervo
    não responde vence poucos perguntando algo já documentado.
  */
  it("põe na frente o que muitos perguntam e o acervo não cobre", () => {
    const naoCoberto = [
      atendimento({ title: FLECHA_A, solution: "Ajustada a inércia fissurada." }),
      atendimento({ title: FLECHA_B, solution: "Conferida a inércia fissurada." }),
    ];

    const coberto = atendimento({
      title: LICENCA,
      solution: "Reativada a licença pelo portal.",
    });

    const acervo = [
      artigo({
        title: "Licença não ativa após reinstalação",
        content: "<p>Como reativar a licença pelo portal depois de reinstalar o sistema.</p>",
      }),
    ];

    const { groups } = triageTickets([...naoCoberto, coberto], acervo, new Set());

    expect(groups[0].tickets).toHaveLength(2);
    expect(groups[0].coverage).toBeLessThan(groups[groups.length - 1].coverage);
  });

  /* Rascunho não responde ninguém, então não conta como cobertura. */
  it("mede cobertura só contra o que está publicado", () => {
    const ticket = atendimento({ title: LICENCA, solution: "Reativada pelo portal." });

    const rascunho = [
      artigo({
        status: "draft",
        title: "Licença não ativa após reinstalação",
        content: "<p>Como reativar a licença pelo portal depois de reinstalar.</p>",
      }),
    ];

    const semNada = triageTickets([ticket], [], new Set()).groups[0].coverage;
    const comRascunho = triageTickets([ticket], rascunho, new Set()).groups[0].coverage;

    expect(comRascunho).toBe(semNada);
  });

  describe("o que fica fora da fila", () => {
    it("atendimento sem solução, porque não há resposta para escrever", () => {
      const { groups, ignorados } = triageTickets(
        [atendimento({ solution: "   " })],
        [],
        new Set()
      );

      expect(groups).toHaveLength(0);
      expect(ignorados.semSolucao).toBe(1);
    });

    it("atendimento que já virou artigo", () => {
      const ticket = atendimento({ title: FLECHA_A });

      const { groups, ignorados } = triageTickets(
        [ticket],
        [artigo({ source: { ticketId: ticket.id } as KnowledgeArticle["source"] })],
        new Set()
      );

      expect(groups).toHaveLength(0);
      expect(ignorados.jaVirouArtigo).toBe(1);
    });

    it("atendimento já analisado, porque quem foi lido não volta para a fila", () => {
      const ticket = atendimento({ title: FLECHA_A });

      const { groups, ignorados } = triageTickets([ticket], [], new Set([ticket.id]));

      expect(groups).toHaveLength(0);
      expect(ignorados.jaAnalisado).toBe(1);
    });

    it("atendimento sem texto que dê para agrupar", () => {
      const { groups, ignorados } = triageTickets(
        [atendimento({ title: "ok", solution: "ok" })],
        [],
        new Set()
      );

      expect(groups).toHaveLength(0);
      expect(ignorados.semTextoSuficiente).toBe(1);
    });
  });

  /* Número parcial apresentado como completo é pior que número com ressalva. */
  it("anuncia quando passa do teto, em vez de calcular pela metade", () => {
    const muitos = Array.from({ length: MAXIMO_DE_ATENDIMENTOS + 1 }, () =>
      atendimento({ title: FLECHA_A })
    );

    const { groups, excedeuTeto } = triageTickets(muitos, [], new Set());

    expect(excedeuTeto).toBe(true);
    expect(groups).toHaveLength(0);
  });

  it("o rótulo do grupo é o atendimento mais antigo", () => {
    const { groups } = triageTickets(
      [
        atendimento({ title: FLECHA_B, date: "2026-08-20" }),
        atendimento({ title: FLECHA_A, date: "2026-03-05" }),
      ],
      [],
      new Set()
    );

    expect(groups[0].subject).toBe(FLECHA_A);
  });

  /* Palavra que só um disse não descreve o grupo. */
  it("o vocabulário do grupo é o que se repete entre eles", () => {
    const { groups } = triageTickets(
      [
        atendimento({ title: FLECHA_A, solution: "Ajustada a inércia fissurada." }),
        atendimento({ title: FLECHA_B, solution: "Conferida a inércia fissurada." }),
      ],
      [],
      new Set()
    );

    expect(groups[0].terms).toContain("fissurada");
    expect(groups[0].terms).not.toContain("questiona");
  });

  it("devolve fila vazia sem atendimento nenhum", () => {
    const { groups, excedeuTeto } = triageTickets([], [], new Set());

    expect(groups).toHaveLength(0);
    expect(excedeuTeto).toBe(false);
  });
});

/*
  O que a HubSpot devolve como solução é o e-mail inteiro do suporte. Sem
  limpar, o grupo passava a ser a assinatura de quem respondeu.
*/
const ASSINATURA =
  "Atenciosamente, equipe de suporte AltoQi. Acesse https://suporte.altoqi.com.br/hc/pt-br/articles/360002887154-2e82-4abd ou fale com nossos atendentes pelo contato suporte@altoqi.com.br. Protocolo 537686325.";

describe("ticketTerms", () => {
  it("descarta a cortesia do e-mail do suporte", () => {
    const termos = ticketTerms(atendimento({ title: "Erro", solution: ASSINATURA }));

    for (const ruido of ["atenciosamente", "atendentes", "acesse", "contato", "suporte"]) {
      expect(termos).not.toContain(ruido);
    }
  });

  /* `2e82` e `4abd` são pedaços de identificador dentro de uma URL. */
  it("descarta endereço e e-mail antes de virar palavra", () => {
    const termos = ticketTerms(atendimento({ title: "Erro", solution: ASSINATURA }));

    for (const pedaco of ["2e82", "4abd", "360002887154", "https", "altoqi"]) {
      expect(termos).not.toContain(pedaco);
    }
  });

  /* Número solto é chamado ou ano, e não descreve dúvida nenhuma. */
  it("descarta número solto", () => {
    const termos = ticketTerms(
      atendimento({ title: "Ticket 47968252511", solution: "Corrigido na versão 2024." })
    );

    expect(termos).not.toContain("47968252511");
    expect(termos).not.toContain("2024");
  });

  /* Código de erro tem letra, e é a letra que o separa de uma contagem. */
  it("preserva código com letra e dígito", () => {
    const termos = ticketTerms(
      atendimento({ title: "Aviso D15 na viga", solution: "Corrigido." })
    );

    expect(termos).toContain("d15");
  });

  /* O rodapé de horário juntou importação de IFC com falha ao abrir o programa. */
  it("descarta hora de relógio, e mantém código de erro", () => {
    const termos = ticketTerms(
      atendimento({
        title: "Aviso D15 na viga",
        solution: "Atendemos das 9h as 12h e das 13h30 as 17h30.",
      })
    );

    for (const hora of ["9h", "12h", "13h30", "17h30"]) expect(termos).not.toContain(hora);
    expect(termos).toContain("d15");
  });

  it("preserva o termo técnico que descreve a dúvida", () => {
    const termos = ticketTerms(
      atendimento({ title: "Fissuração na viga contínua", solution: ASSINATURA })
    );

    expect(termos).toContain("fissuracao");
  });
});

/*
  O caso que a fila de triagem mostrou na tela: multa de cancelamento e
  pagamento de dívida no mesmo grupo, unidos por "atenciosamente, atendentes,
  acesse, agradecemos". Assuntos diferentes, mesma assinatura.
*/
describe("assinatura não forma grupo", () => {
  it("mantém separados dois assuntos que só dividem o rodapé do e-mail", () => {
    const { groups } = triageTickets(
      [
        atendimento({ title: "Multa de cancelamento do contrato", solution: ASSINATURA }),
        atendimento({ title: "Pagamento de dívida em aberto", solution: ASSINATURA }),
      ],
      [],
      new Set()
    );

    for (const grupo of groups) expect(grupo.tickets).toHaveLength(1);
  });
});
