import OpenAI from "openai";

// Default OpenAI client (uses server env var as fallback)
export const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Create an OpenAI client with a custom API key (for BYOK)
export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

// Get OpenAI client - prefers user key, falls back to server key
export function getOpenAIClient(userApiKey?: string): OpenAI {
  if (userApiKey) {
    return createOpenAIClient(userApiKey);
  }
  if (openai) {
    return openai;
  }
  throw new Error("No OpenAI API key available. Please add your API key in Settings.");
}

export default openai;
