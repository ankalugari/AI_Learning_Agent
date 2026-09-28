import 'dotenv/config';

const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';

let llmProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
if (!llmProvider) llmProvider = anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'mock';

export const config = {
  port: Number(process.env.PORT || 3001),
  llmProvider,
  anthropicKey,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  openaiKey,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  embeddingProvider: (process.env.EMBEDDINGS_PROVIDER || 'local').toLowerCase(),
  topK: 4,
  maxAgentSteps: 5,
};
