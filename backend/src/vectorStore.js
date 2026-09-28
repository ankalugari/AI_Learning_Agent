// Step 5 — Vector similarity search.
// A tiny in-memory vector database persisted to data/vectors.json.
// For a few thousand chunks, brute-force cosine similarity is instant.
// (Swap this file for Chroma / Qdrant / pgvector when you outgrow it.)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize } from './embeddings.js';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'vectors.json');
const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

function bestSentence(text, query) {
  const q = new Set(tokenize(query));
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  let best = '', bestScore = 0;
  for (const s of sentences) {
    const score = tokenize(s).filter((t) => q.has(t)).length;
    if (score > bestScore) [best, bestScore] = [s.trim(), score];
  }
  return best;
}

export class VectorStore {
  constructor(embedder) {
    this.embedder = embedder;
    this.items = [];
  }

  async init(seedChunks) {
    let saved = null;
    try { saved = JSON.parse(await fs.readFile(FILE, 'utf8')); } catch {}

    if (saved?.items?.length && saved.model === this.embedder.name) {
      this.items = saved.items;
      return;
    }
    const base = saved?.items?.length ? saved.items.map(({ id, title, topic, text }) => ({ id, title, topic, text })) : seedChunks;
    console.log(`Embedding ${base.length} chunks with ${this.embedder.name} …`);
    this.items = [];
    await this.add(base);
  }

  async add(chunks) {
    const vectors = await this.embedder.embed(chunks.map((c) => `${c.title}. ${c.text}`));
    chunks.forEach((c, i) =>
      this.items.push({
        id: c.id || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        title: c.title,
        topic: c.topic || 'Notes',
        text: c.text,
        embedding: vectors[i].map((x) => Math.round(x * 1e5) / 1e5),
      })
    );
    await this.save();
    return chunks.length;
  }

  async save() {
    await fs.writeFile(FILE, JSON.stringify({ model: this.embedder.name, items: this.items }));
  }

  async search(query, k = 4) {
    const [qv] = await this.embedder.embed([query]);
    return this.items
      .map((it) => ({ it, score: dot(qv, it.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter((r) => r.score >= this.embedder.minScore)
      .map(({ it, score }) => ({
        id: it.id,
        title: it.title,
        topic: it.topic,
        text: it.text,
        highlight: bestSentence(it.text, query),
        score: Math.round(score * 1000) / 1000,
      }));
  }
}

// Split long text into ~600-char chunks on paragraph / sentence boundaries.
export function chunkText(text, size = 600) {
  const parts = text.split(/\n{2,}/).flatMap((p) => p.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [p]);
  const chunks = [];
  let cur = '';
  for (const s of parts) {
    if ((cur + s).length > size && cur) { chunks.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}
