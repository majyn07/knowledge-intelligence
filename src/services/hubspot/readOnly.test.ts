import { describe, expect, it } from "vitest";

import { postDeLeitura } from "./readOnly";

describe("postDeLeitura", () => {
  it("aceita os POST que só leem: busca e leitura em lote", () => {
    expect(postDeLeitura("/crm/v3/objects/tickets/search")).toBe(true);
    expect(postDeLeitura("/crm/v3/objects/tickets/batch/read")).toBe(true);
    expect(postDeLeitura("/conversations/v3/conversations/actors/batch/read")).toBe(true);
    expect(postDeLeitura("/crm/v3/objects/contacts/search?archived=false")).toBe(true);
  });

  it("recusa o que escreveria no CRM de produção", () => {
    expect(postDeLeitura("/crm/v3/objects/tickets")).toBe(false);
    expect(postDeLeitura("/crm/v3/objects/tickets/batch/create")).toBe(false);
    expect(postDeLeitura("/crm/v3/objects/tickets/batch/update")).toBe(false);
    expect(postDeLeitura("/crm/v3/objects/tickets/batch/archive")).toBe(false);
    expect(postDeLeitura("/conversations/v3/conversations/threads/1/messages")).toBe(false);
    expect(postDeLeitura("/crm/v3/objects/tickets/search/../batch/update")).toBe(false);
  });
});
