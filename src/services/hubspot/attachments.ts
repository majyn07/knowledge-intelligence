import { items, record, text } from "@/lib/shape";

/**
 * O que o cliente anexou ao atendimento.
 *
 * A conversa de **e-mail** carrega arquivo, e é a maior parte do acervo: dos
 * 445 fios que nunca passaram pelo bot, 378 são e-mail. Medido em dez deles,
 * 27 anexos em 209 mensagens — quase sempre o print da tela que o cliente
 * mandou, que é justamente a evidência que falta quando se lê o chamado.
 *
 * **A URL não se guarda.** Ela vem assinada, com o prazo dentro dela
 * (`?Expires=…&Signature=…`), e a que foi medida valia cerca de um dia. Gravada
 * junto do atendimento, funcionaria hoje e estaria quebrada amanhã — imagem
 * morta dentro de um registro, sem erro nenhum dizendo por quê. Por isso o fio
 * é pedido de novo na hora de exibir, e a HubSpot devolve assinatura nova.
 *
 * É por isso também que este módulo **não** entra na importação: o que se
 * importa é o que dura.
 */

/** Só o que a HubSpot marca como arquivo. O resto de `attachments` é widget. */
const TIPO_ARQUIVO = "FILE";

export interface HubSpotAttachment {
  fileId: string;
  name: string;
  /** `IMAGE` quando dá para exibir; qualquer outra coisa é anexo para baixar. */
  isImage: boolean;
  /** Assinada, e com prazo. Serve para exibir agora, nunca para guardar. */
  url: string;
}

/**
 * Os anexos de uma leva de mensagens cruas.
 *
 * `attachments` mistura arquivo com metadado de widget: no acervo real
 * aparecem `QUICK_REPLIES` (a lista de opções do bot),
 * `WHATSAPP_TEMPLATE_METADATA` e `MESSAGE_HEADER`. Sem o filtro por tipo, a
 * tela ofereceria "anexo" para uma resposta rápida de chatbot.
 *
 * Sem `url` também sai: um anexo que não dá para abrir é uma linha que só
 * frustra quem clica.
 */
export function attachmentsOf(rawMessages: readonly unknown[]): HubSpotAttachment[] {
  const encontrados: HubSpotAttachment[] = [];
  const vistos = new Set<string>();

  for (const bruta of rawMessages) {
    for (const entrada of items(record(bruta).attachments)) {
      const anexo = record(entrada);

      if (text(anexo.type) !== TIPO_ARQUIVO) continue;

      const url = text(anexo.url);
      const fileId = text(anexo.fileId) || text(anexo.id);

      if (url === "" || fileId === "") continue;

      /*
        O mesmo arquivo aparece mais de uma vez quando a mensagem é respondida
        com o histórico embutido, que é o normal numa conversa de e-mail.
      */
      if (vistos.has(fileId)) continue;

      vistos.add(fileId);

      encontrados.push({
        fileId,
        name: text(anexo.name) || "Arquivo",
        isImage: text(anexo.fileUsageType) === "IMAGE",
        url,
      });
    }
  }

  return encontrados;
}
