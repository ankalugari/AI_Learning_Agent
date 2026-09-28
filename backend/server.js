// Step 2 — Node + Express API.
import express from 'express';
import cors from 'cors';
import { config } from './src/config.js';
import { createEmbedder } from './src/embeddings.js';
import { VectorStore, chunkText } from './src/vectorStore.js';
import { loadSeedChunks } from './src/ingest.js';
import { runAgent } from './src/agent.js';
import { llmInfo } from './src/llm.js';

const embedder = await createEmbedder();
const store = new VectorStore(embedder);
await store.init(await loadSeedChunks());

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/status', (_req, res) =>
  res.json({ ...llmInfo(), embedding: embedder.name, chunks: store.items.length })
);

app.post('/api/ask', async (req, res) => {
  const { question, history = [] } = req.body || {};
  if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'Please type a question.' });
  if (question.length > 2000) return res.status(400).json({ error: 'Question is too long (2000 characters max).' });
  try {
    res.json(await runAgent(question.trim(), Array.isArray(history) ? history : [], store));
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: `The AI provider returned an error: ${e.message}` });
  }
});

app.post('/api/search', async (req, res) => {
  const { query, k = 5 } = req.body || {};
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({ error: 'Enter something to search for.' });
  res.json({ results: await store.search(query.trim(), Math.min(Number(k) || 5, 10)) });
});

app.post('/api/documents', async (req, res) => {
  const { title, text, topic } = req.body || {};
  if (!title?.trim() || !text?.trim()) return res.status(400).json({ error: 'Add a title and some text.' });
  const chunks = chunkText(text).map((c) => ({ title: title.trim(), topic: topic?.trim() || 'My notes', text: c }));
  const added = await store.add(chunks);
  res.json({ added, total: store.items.length });
});

app.listen(config.port, () => {
  const l = llmInfo();
  console.log(`\n✓ API running on http://localhost:${config.port}`);
  console.log(`  LLM: ${l.provider} (${l.model})   Embeddings: ${embedder.name}   Chunks: ${store.items.length}\n`);
});
