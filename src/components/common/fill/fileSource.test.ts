import { describe, expect, it } from "vitest";

import { attachmentTooLarge, classifyFile, humanSize, FILE_ACCEPT } from "./fileSource";

describe("classifyFile", () => {
  it("manda PDF como anexo, para o modelo ver a página", () => {
    /*
      Extrair texto de PDF no navegador resolveria o digital e falharia no
      escaneado — que é o que mais chega de um suporte.
    */
    expect(classifyFile("atendimento.pdf", "application/pdf")).toEqual({
      role: "anexo",
      mimeType: "application/pdf",
    });
  });

  it("manda imagem como anexo", () => {
    expect(classifyFile("captura.png", "image/png")?.role).toBe("anexo");
    expect(classifyFile("foto.JPG", "image/jpeg")?.mimeType).toBe("image/jpeg");
  });

  it("lê arquivo de texto no navegador em vez de anexar", () => {
    /*
      Base64 de um `.csv` custa um terço a mais de tokens para entregar
      exatamente o mesmo conteúdo.
    */
    expect(classifyFile("export.csv", "text/csv")?.role).toBe("texto");
    expect(classifyFile("notas.md", "")?.role).toBe("texto");
  });

  it("confia na extensão quando o navegador não soube nomear o tipo", () => {
    /*
      `.md` costuma chegar com `type` vazio e `.csv` ora como `text/csv`, ora
      como `application/vnd.ms-excel`. Recusar um arquivo legítimo porque o
      sistema operacional não soube nomeá-lo é pior que aceitar pela extensão.
    */
    expect(classifyFile("relatorio.pdf", "")?.role).toBe("anexo");
    expect(classifyFile("planilha.csv", "application/vnd.ms-excel")?.role).toBe("texto");
  });

  it("aceita pelo tipo declarado quando não há extensão", () => {
    expect(classifyFile("documento", "application/pdf")?.role).toBe("anexo");
  });

  it("recusa o que não serve, sem exceção", () => {
    /*
      Arquivo não suportado é escolha comum, não erro de programa: quem chama
      transforma o `null` em frase na tela.
    */
    expect(classifyFile("planilha.xlsx", "application/vnd.openxmlformats")).toBeNull();
    expect(classifyFile("arquivo.zip", "application/zip")).toBeNull();
    expect(classifyFile("video.mp4", "video/mp4")).toBeNull();
  });
});

describe("attachmentTooLarge", () => {
  it("aceita o que cabe e recusa o que passa de oito megabytes", () => {
    expect(attachmentTooLarge(7 * 1024 * 1024)).toBe(false);
    expect(attachmentTooLarge(9 * 1024 * 1024)).toBe(true);
  });
});

describe("FILE_ACCEPT", () => {
  it("oferece no seletor o mesmo vocabulário que a checagem aceita", () => {
    /*
      Duas listas do mesmo vocabulário divergem, e a divergência apareceria
      como a tela oferecendo um arquivo que ela mesma recusa depois.
    */
    for (const extensao of [".pdf", ".png", ".csv", ".md", ".txt"]) {
      expect(FILE_ACCEPT).toContain(extensao);
    }
  });
});

describe("humanSize", () => {
  it("diz o tamanho como se diz para alguém", () => {
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(2048)).toBe("2 kB");
    expect(humanSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
