import { z } from "zod";

const analysisMessageSchema = z.object({
  id: z.string().min(1),
  author: z.enum(["assistant", "user"]),
  message: z.string().min(1),
  createdAt: z.string().min(1),
  status: z.enum(["sending", "completed", "error"]).optional(),
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
