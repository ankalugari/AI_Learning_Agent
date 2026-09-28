// Step 3 — the dataset. Seeds the vector store from:
//   1. src/knowledge.js   (built-in AI notes)
//   2. data/docs/*.md|txt (drop your own files here, then run `npm run ingest`)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knowledge from './knowledge.js';
import { chunkText } from './vectorStore.js';

const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'docs');

export async function loadSeedChunks() {
  const chunks = knowledge.map((k, i) => ({ id: `seed-${i}`, ...k }));
  try {
    for (const f of await fs.readdir(DOCS)) {
      if (!/\.(md|txt)$/i.test(f)) continue;
      const text = await fs.readFile(path.join(DOCS, f), 'utf8');
      const title = f.replace(/\.(md|txt)$/i, '').replace(/[-_]/g, ' ');
      chunkText(text).forEach((c, i) => chunks.push({ id: `doc-${f}-${i}`, title, topic: 'My docs', text: c }));
    }
  } catch {  }
  return chunks;
}

// `npm run ingest` → wipe and rebuild the index from scratch.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { createEmbedder } = await import('./embeddings.js');
  const { VectorStore } = await import('./vectorStore.js');
  await fs.rm(path.join(path.dirname(DOCS), 'vectors.json'), { force: true });
  const store = new VectorStore(await createEmbedder());
  await store.init(await loadSeedChunks());
  console.log(`✓ Indexed ${store.items.length} chunks using ${store.embedder.name}`);
}
