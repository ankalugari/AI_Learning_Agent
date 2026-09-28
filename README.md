# Marginalia — an AI learning agent

A full-stack RAG agent: ask about AI concepts and get answers grounded in a searchable knowledge base, with the retrieved passages highlighted and every agent step visible. Numbers go to a calculator tool.

**Stack:** React 18 · Tailwind CSS 4 · Vite · Node + Express · embeddings · vector similarity search · RAG · tool-using LLM agent (Claude or OpenAI)

## Run it

```bash
npm run setup                 # installs root, backend and frontend
cp backend/.env.example backend/.env
npm run dev                   # API on :3001, UI on :5173
```

Open http://localhost:5173.

It works with **no API key** (offline demo mode: real embeddings and vector search, but passages are returned instead of an LLM-written answer). For the full agent, add one key to `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...     # or
OPENAI_API_KEY=sk-...
```

The first start downloads a ~25 MB local embedding model (all-MiniLM-L6-v2). If that fails (no internet), it falls back to a small keyword-hash embedding automatically.

## How it maps to your 9 steps

| Step | Where |
|---|---|
| 1. React UI | `frontend/src/App.jsx`, `components/` (Tailwind styling in `index.css`) |
| 2. Node + Express backend | `backend/server.js` |
| 3. AI dataset | `backend/src/knowledge.js` (35 notes) + any `.md/.txt` in `backend/data/docs/` → `npm run ingest` (in `/backend`) |
| 4. Embeddings | `backend/src/embeddings.js` (local MiniLM, OpenAI, or hash fallback) |
| 5. Vector similarity search | `backend/src/vectorStore.js` (cosine similarity, saved to `data/vectors.json`) |
| 6. RAG | retrieval → passages in the prompt → cited answer (`agent.js`, `tools.js`) |
| 7. AI agent | `backend/src/agent.js` — LLM loop that decides which tool to call, up to 5 steps |
| 8. Calculator + knowledge tools | `backend/src/tools.js` (safe expression parser, no `eval`) |
| 9. Connect frontend + backend | `frontend/src/api.js` + Vite proxy in `vite.config.js` |

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/ask` `{question, history}` | Runs the agent → `{answer, sources, steps, meta}` |
| `POST /api/search` `{query, k}` | Raw vector search, no LLM |
| `POST /api/documents` `{title, text, topic}` | Chunk, embed and index new notes |
| `GET /api/status` | Provider, embedding model, note count |

## Try these

- "What is a context window?" — one search, cited answer
- "How is RAG different from fine-tuning?" — the agent may search twice
- "What is 15% of 2,480 plus sqrt(144)?" — calculator tool
- In the **Vector search** tab: "how do I find similar texts" — finds *cosine similarity* with no shared keywords (with the local model)
- In **Add notes**, paste something of your own, then ask about it

## Notes

- API keys stay in `backend/.env` on the server, never in the browser.
- Changing the embedding provider re-embeds everything automatically on next start.
- The in-memory vector store is fine up to a few thousand chunks. To scale, replace `vectorStore.js` with Chroma, Qdrant or pgvector; the rest of the app only calls `add()` and `search()`.
