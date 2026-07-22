import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openAIService = {
  async chat(message: string): Promise<string> {
    const response = await client.responses.create({
      model: "gpt-5",
      input: message,
    });

    return response.output_text;
  },
};