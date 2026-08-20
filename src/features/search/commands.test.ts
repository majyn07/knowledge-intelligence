import { describe, expect, it } from "vitest";

import { commandGroup, commands, matchCommands } from "./commands";

describe("matchCommands", () => {
  it("campo vazio devolve tudo, porque é o estado em que a paleta abre", () => {
    // Antes disto, `Ctrl+K` sem digitar mostrava só "digite ao menos dois
    // caracteres" — uma tela que não faz nada.
    expect(matchCommands("")).toHaveLength(commands.length);
    expect(matchCommands("   ")).toHaveLength(commands.length);
  });

  it("casa pelo rótulo", () => {
    expect(matchCommands("Biblioteca").map((c) => c.id)).toEqual(["go-library"]);
  });

  it("casa pela palavra que a pessoa usa, não só pelo rótulo", () => {
    // Quem procura "tema" não sabe que isso mora em Configurações.
    expect(matchCommands("tema").map((c) => c.id)).toEqual(["go-settings"]);
    expect(matchCommands("historico").map((c) => c.id)).toEqual(["go-activities"]);
  });

  it("ignora acento nos dois lados", () => {
    expect(matchCommands("métricas").map((c) => c.id)).toEqual(["go-indicators"]);
    expect(matchCommands("integracoes").map((c) => c.id)).toEqual(["go-integrations"]);
  });

  it("devolve vazio quando nada casa", () => {
    expect(matchCommands("zzzz")).toEqual([]);
  });

  it("não oferece ação que decide pelo ciclo", () => {
    // Publicar, aprovar e excluir pedem intenção; uma lista percorrida com a
    // seta não é lugar para isso.
    const rotulos = commands.map((command) => command.label.toLowerCase()).join(" ");

    for (const proibido of ["publicar", "aprovar", "excluir", "descartar"]) {
      expect(rotulos).not.toContain(proibido);
    }
  });

  it("todo comando aponta para uma rota, e sem repetir identificador", () => {
    const ids = commands.map((command) => command.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(commands.every((command) => command.href.startsWith("/"))).toBe(true);
  });
});

describe("commandGroup", () => {
  it("empacota como grupo de busca, para reusar a navegação por teclado", () => {
    const group = commandGroup("biblioteca");

    expect(group?.kind).toBe("command");
    expect(group?.results[0].href).toBe("/library");
  });

  it("devolve nulo quando nada casa, para o grupo não aparecer vazio", () => {
    expect(commandGroup("zzzz")).toBeNull();
  });
});
