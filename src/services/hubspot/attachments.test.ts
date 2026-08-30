import { describe, expect, it } from "vitest";

import { attachmentsOf } from "./attachments";

const mensagem = (attachments: unknown[]) => ({ type: "MESSAGE", attachments });

const arquivo = (extra: Record<string, unknown> = {}) => ({
  type: "FILE",
  fileId: "220499645547",
  name: "image-Aug-27-2026.png",
  fileUsageType: "IMAGE",
  url: "https://44552714.cdnp1.hubspotusercontent-na1.net/hubfs/x.png?Expires=1&Signature=y",
  ...extra,
});

describe("attachmentsOf", () => {
  it("lê o arquivo com o que é preciso para exibir", () => {
    const [anexo] = attachmentsOf([mensagem([arquivo()])]);

    expect(anexo).toMatchObject({
      fileId: "220499645547",
      name: "image-Aug-27-2026.png",
      isImage: true,
    });
    expect(anexo.url).toContain("Signature=");
  });

  /*
    `attachments` mistura arquivo com metadado de widget: no acervo real
    aparecem QUICK_REPLIES (a lista de opções do bot),
    WHATSAPP_TEMPLATE_METADATA e MESSAGE_HEADER. Sem o filtro, a tela ofereceria
    "anexo" para uma resposta rápida de chatbot.
  */
  it("metadado de widget não é anexo", () => {
    const anexos = attachmentsOf([
      mensagem([
        { type: "QUICK_REPLIES", quickReplies: [{ value: "Financeiro" }] },
        { type: "WHATSAPP_TEMPLATE_METADATA", contentId: "210227283617" },
        { type: "MESSAGE_HEADER" },
      ]),
    ]);

    expect(anexos).toEqual([]);
  });

  /* Anexo que não dá para abrir é uma linha que só frustra quem clica. */
  it("arquivo sem url fica de fora", () => {
    expect(attachmentsOf([mensagem([arquivo({ url: "" })])])).toEqual([]);
  });

  it("arquivo sem identificador fica de fora", () => {
    expect(attachmentsOf([mensagem([arquivo({ fileId: "" })])])).toEqual([]);
  });

  /*
    O mesmo arquivo aparece de novo quando a mensagem é respondida com o
    histórico embutido, que é o normal numa conversa de e-mail.
  */
  it("o mesmo arquivo em duas mensagens vira uma linha", () => {
    const anexos = attachmentsOf([mensagem([arquivo()]), mensagem([arquivo()])]);

    expect(anexos).toHaveLength(1);
  });

  it("arquivos diferentes convivem", () => {
    const anexos = attachmentsOf([
      mensagem([arquivo(), arquivo({ fileId: "999", name: "erro.log", fileUsageType: "FILE" })]),
    ]);

    expect(anexos).toHaveLength(2);
    expect(anexos[1]).toMatchObject({ name: "erro.log", isImage: false });
  });

  it("sem nome, ainda dá para oferecer o arquivo", () => {
    expect(attachmentsOf([mensagem([arquivo({ name: "" })])])[0].name).toBe("Arquivo");
  });

  it("mensagem sem anexo nenhum não quebra", () => {
    expect(attachmentsOf([{ type: "MESSAGE" }, mensagem([])])).toEqual([]);
  });

  it("lista vazia devolve lista vazia", () => {
    expect(attachmentsOf([])).toEqual([]);
  });
});
