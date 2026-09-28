// Step 4 — Embeddings: turn text into a vector of numbers so that
// "similar meaning" becomes "nearby in space". All vectors are L2-normalised,
// which means cosine similarity is just a dot product.
import { config } from './config.js';

const normalize = (v) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

let extractorPromise;
async function localEmbed(texts) {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers').then((m) =>
      m.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  const extractor = await extractorPromise;
  const out = [];
  for (const t of texts) {
    const r = await extractor(t, { pooling: 'mean', normalize: true });
    out.push(Array.from(r.data));
  }
  return out;
}

async function openaiEmbed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'OpenAI embeddings failed');
  return data.data.map((d) => normalize(d.embedding));
}

const DIMS = 512;
const STOP = new Set(
  'a an the of to in on for and or is are was were be by with as at from that this it its how what why when which do does can i you we'.split(' ')
);
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
const fnv = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
export const tokenize = (t) =>
  (t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w)).map(stem);

function hashEmbed(texts) {
  return texts.map((text) => {
    const toks = tokenize(text);
    const v = new Array(DIMS).fill(0);
    const bump = (key, w) => {
      v[fnv(key) % DIMS] += (fnv(key + '#') & 1 ? 1 : -1) * w;
    };
    toks.forEach((t, i) => {
      bump(t, 1);
      if (i > 0) bump(toks[i - 1] + '_' + t, 0.5);
    });
    return normalize(v);
  });
}

export async function createEmbedder() {
  const wanted = config.embeddingProvider;

  if (wanted === 'local') {
    try {
      await localEmbed(['warm-up']);
      return { name: 'local:all-MiniLM-L6-v2', minScore: 0.25, embed: localEmbed };
    } catch (e) {
      console.warn(`⚠ Local embedding model unavailable (${e.message}). Falling back to hash embeddings.`);
    }
  }
  if (wanted === 'openai' && config.openaiKey) {
    return { name: 'openai:text-embedding-3-small', minScore: 0.3, embed: openaiEmbed };
  }
  return { name: 'hash-512', minScore: 0.1, embed: async (t) => hashEmbed(t) };
}
