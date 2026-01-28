import OpenAI from "openai";

// Initialize OpenAI client
// Requires OPENAI_API_KEY environment variable
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

