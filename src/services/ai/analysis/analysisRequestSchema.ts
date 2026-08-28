import { z } from "zod";

const analysisMessageSchema = z.object({
  id: z.string().min(1),
  author: z.enum(["assistant", "user"]),
  message: z.string().min(1),
  createdAt: z.string().min(1),
  status: z.enum(["sending", "completed", "error"]).optional(),
}).strict();

const conversationSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  messages: z.array(z.object({
    id: z.string().min(1),
    author: z.string(),
    role: z.enum(["cliente", "suporte", "automacao", "sistema"]),
    body: z.string(),
    createdAt: z.string(),
    channel: z.string().optional(),
  }).strict()),
  source: z.object({
    provider: z.literal("hubspot"),
    externalId: z.string(),
    importedAt: z.string(),
  }).strict().optional(),
}).strict();

/**
 * Evidência documental já resolvida pelo cliente, que é onde o acervo vive.
 * Só trafega o que o prompt realmente usa.
 */
const relatedArticleSchema = z.object({
  article: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string(),
  }).strict(),
  score: z.number().min(0).max(1),
  matchedTerms: z.array(z.string()),
}).strict();

const analysisContextSchema = z.object({
  ticket: z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    title: z.string().min(1),
    solution: z.string().min(1),
    company: z.string(),
    date: z.string().min(1),
  }).strict(),
  conversation: conversationSchema.optional(),
  relatedArticles: z.array(relatedArticleSchema).optional(),
  knowledgeBaseId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  analysisMode: z.enum(["ticket", "article"]).optional(),
}).strict();

export const startAnalysisRequestSchema = z.object({
  context: analysisContextSchema,
  messages: z.array(analysisMessageSchema),
}).strict();

export const analysisChatRequestSchema = startAnalysisRequestSchema.extend({
  messages: z.array(analysisMessageSchema).min(1),
}).superRefine(({ messages }, context) => {
  const lastMessage = messages.at(-1);
  if (lastMessage?.author !== "user") {
    context.addIssue({
      code: "custom",
      message: "A última mensagem deve ser enviada pelo analista.",
      path: ["messages"],
    });
  }
});
