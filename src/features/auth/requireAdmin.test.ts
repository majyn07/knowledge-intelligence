import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A porta da HubSpot, conferida na ordem certa.
 *
 * Não é teste de componente: é a lógica que decide se milhares de requisições
 * saem contra o servidor de suporte da AltoQi. A dependência é o cliente do
 * banco, e ele entra dublado porque o que está sob teste é a **ordem das
 * recusas**, não a Supabase.
 */

const mocks = vi.hoisted(() => ({
  compartilhado: true,
  usuario: null as { id: string } | null,
  perfil: { is_admin: false } as { is_admin: boolean } | null,
  erroDoPerfil: null as unknown,
  config: { bloqueado: false } as Record<string, unknown> | null,
}));

/*
  `server-only` derruba a importação fora de um servidor do Next. Aqui ele não
  protege nada: o que está sob teste é a ordem das recusas, e o arquivo já
  declara a intenção com o import de verdade.
*/
vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/mode", () => ({
  isSharedWorkspace: () => mocks.compartilhado,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.usuario } }) },
    from: (tabela: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            tabela === "profiles"
              ? { data: mocks.perfil, error: mocks.erroDoPerfil }
              : { data: { value: mocks.config }, error: null },
        }),
      }),
    }),
  }),
}));

const { requireAdmin } = await import("./requireAdmin");

beforeEach(() => {
  mocks.compartilhado = true;
  mocks.usuario = { id: "u1" };
  mocks.perfil = { is_admin: true };
  mocks.erroDoPerfil = null;
  mocks.config = { bloqueado: false };
});

describe("requireAdmin", () => {
  it("deixa passar quem administra", async () => {
    expect(await requireAdmin()).toEqual({ ok: true });
  });

  /*
    Sem fundação compartilhada não há conta, e sem conta não há administrador.
    Recusar aqui trancaria o `dev:local` numa porta sem chave.
  */
  it("libera quando não há espaço compartilhado", async () => {
    mocks.compartilhado = false;
    mocks.usuario = null;

    expect(await requireAdmin()).toEqual({ ok: true });
  });

  it("recusa sem sessão", async () => {
    mocks.usuario = null;

    const resultado = await requireAdmin();

    expect(resultado).toMatchObject({ ok: false, status: 401 });
  });

  it("recusa quem não administra", async () => {
    mocks.perfil = { is_admin: false };

    const resultado = await requireAdmin();

    expect(resultado).toMatchObject({ ok: false, status: 403 });
  });

  /*
    Falha ao consultar não vira permissão. Um banco fora do ar deixaria a porta
    aberta se o erro caísse no mesmo caminho do "não é administrador", e o erro
    é justamente quando ninguém está olhando.
  */
  it("recusa quando não consegue conferir a permissão", async () => {
    mocks.erroDoPerfil = { message: "fora do ar" };

    const resultado = await requireAdmin();

    expect(resultado).toMatchObject({ ok: false, status: 503 });
  });

  describe("o freio", () => {
    /*
      A pergunta que originou isto: "como impeço que alguém sobrecarregue o
      servidor do suporte". Um freio que só esconde botão não freia nada, e
      conferir por requisição é o que faz o interruptor parar uma varredura já
      em curso.
    */
    it("recusa mesmo quem administra", async () => {
      mocks.config = { bloqueado: true };

      const resultado = await requireAdmin();

      expect(resultado).toMatchObject({ ok: false, status: 423 });
    });

    /* 423 e não 403: aqui a pessoa poderia, e o que impede é um estado. */
    it("responde com um estado, e não com uma proibição de pessoa", async () => {
      mocks.config = { bloqueado: true };

      const resultado = await requireAdmin();

      if (resultado.ok) throw new Error("deveria ter recusado");

      expect(resultado.status).not.toBe(403);
      expect(resultado.message).toContain("bloqueada");
    });

    /*
      Ausente é liberado, e é o lado certo do erro: uma linha gravada antes
      deste campo existir não pode chegar bloqueando a equipe inteira sem
      ninguém ter ligado nada.
    */
    it("campo ausente não bloqueia", async () => {
      mocks.config = {};

      expect(await requireAdmin()).toEqual({ ok: true });
    });

    it("linha ausente não bloqueia", async () => {
      mocks.config = null;

      expect(await requireAdmin()).toEqual({ ok: true });
    });

    /* Quem nem administra é recusado antes, e a mensagem diz o motivo dele. */
    it("a recusa de quem não administra vem antes do freio", async () => {
      mocks.perfil = { is_admin: false };
      mocks.config = { bloqueado: true };

      const resultado = await requireAdmin();

      expect(resultado).toMatchObject({ ok: false, status: 403 });
    });
  });
});
