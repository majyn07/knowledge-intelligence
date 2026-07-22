import { openAIClient } from "./openAIClient";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const aiService = {
  async chat(messages: AIMessage[]) {
    const response =
      await openAIClient.chat.completions.create({
        model: "gpt-5",
        messages,
      });

    return (
      response.choices[0].message.content ?? ""
    );
  },
};