import { afterEach, describe, expect, it, vi } from "vitest";

import { APP_STORAGE_KEYS, clearAppStorage, readJSON, readRaw, writeJSON, writeRaw } from "./storage";

/** Dublê mínimo do localStorage, com falha programável. */
function installStorage(fail?: () => never) {
  const data = new Map<string, string>();

  const store = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail) fail();
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };

  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", store);

  return data;
}

function quotaError(): never {
  const error = new Error("cheio");
  error.name = "QuotaExceededError";
  throw error;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("writeJSON", () => {
  it("grava e devolve ok", () => {
    const data = installStorage();

    expect(writeJSON("k", { a: 1 })).toBe("ok");
    expect(data.get("k")).toBe('{"a":1}');
  });

  it("devolve quota sem lançar quando o armazenamento enche", () => {
    installStorage(quotaError);

    expect(() => writeJSON("k", { a: 1 })).not.toThrow();
    expect(writeJSON("k", { a: 1 })).toBe("quota");
  });

  it("devolve erro para falhas de outra natureza", () => {
    installStorage(() => {
      throw new Error("armazenamento desabilitado");
    });

    expect(writeJSON("k", 1)).toBe("error");
  });

  it("devolve unavailable fora do navegador", () => {
    expect(writeJSON("k", 1)).toBe("unavailable");
  });
});

describe("writeRaw", () => {
  it("grava texto puro, sem serializar", () => {
    const data = installStorage();

    writeRaw("k", "project-001");

    expect(data.get("k")).toBe("project-001");
  });
});

describe("readJSON", () => {
  it("devolve o padrão quando a chave não existe", () => {
    installStorage();

    expect(readJSON("k", { a: 0 })).toEqual({ a: 0 });
  });

  it("devolve o padrão quando o conteúdo é ilegível", () => {
    const data = installStorage();
    data.set("k", "{quebrado");

    expect(readJSON("k", { a: 0 })).toEqual({ a: 0 });
  });

  it("usa o conversor informado", () => {
    const data = installStorage();
    data.set("k", '[{"n":1}]');

    expect(readJSON("k", [] as { n: number }[], (raw) => JSON.parse(raw))).toEqual([{ n: 1 }]);
  });

  it("devolve o padrão quando o conversor falha", () => {
    const data = installStorage();
    data.set("k", "[]");

    expect(
      readJSON("k", "padrao", () => {
        throw new Error("conversor quebrou");
      })
    ).toBe("padrao");
  });

  it("devolve o padrão fora do navegador", () => {
    expect(readJSON("k", "padrao")).toBe("padrao");
  });
});

describe("readRaw", () => {
  it("não lança quando o acesso é negado", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("acesso negado");
      },
    });

    expect(readRaw("k")).toBeNull();
  });
});

describe("clearAppStorage", () => {
  it("apaga todas as chaves da aplicação e preserva as demais", () => {
    const data = installStorage();

    for (const key of APP_STORAGE_KEYS) data.set(key, "x");
    data.set("outra-app", "preservar");

    clearAppStorage();

    expect([...data.keys()]).toEqual(["outra-app"]);
  });
});
