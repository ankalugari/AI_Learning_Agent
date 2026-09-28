import { useState } from 'react';
import { search } from '../api.js';
import SourceCard from './SourceCard.jsx';

export default function SearchLab() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setError('');
    try { setResults((await search(q, 5)).results); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-soft">
        Type anything and see which notes sit closest to it in embedding space. No LLM is involved here, only vectors and cosine similarity.
      </p>
      <form onSubmit={run} className="flex gap-2">
        <label htmlFor="sq" className="sr-only">Search the notes</label>
        <input
          id="sq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. how do I find similar texts"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm"
        />
        <button disabled={busy || !q.trim()} className="rounded-lg bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt-dark disabled:opacity-40">
          Search
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      {results && results.length === 0 && <p className="text-sm text-soft">Nothing close enough. Try different words, or add a note about this topic.</p>}
      {results?.map((r) => <SourceCard key={r.id} source={r} />)}
    </div>
  );
}
