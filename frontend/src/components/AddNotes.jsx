import { useState } from 'react';
import { addDocument } from '../api.js';

export default function AddNotes({ onAdded }) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await addDocument(title, text, topic);
      setMsg({ ok: true, text: `Added ${r.added} passage${r.added > 1 ? 's' : ''}. The agent can use ${r.added > 1 ? 'them' : 'it'} now (${r.total} notes total).` });
      setTitle(''); setTopic(''); setText('');
      onAdded?.();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally { setBusy(false); }
  }

  const field = 'w-full rounded-lg border border-line bg-card px-3 py-2 text-sm';
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-soft">
        Paste your own study notes. They're split into passages, embedded, and added to the search index so the agent can cite them.
      </p>
      <div>
        <label htmlFor="nt" className="mb-1 block text-sm font-medium">Title</label>
        <input id="nt" required value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="e.g. Kubernetes basics" />
      </div>
      <div>
        <label htmlFor="ntp" className="mb-1 block text-sm font-medium">Topic <span className="font-normal text-soft">(optional)</span></label>
        <input id="ntp" value={topic} onChange={(e) => setTopic(e.target.value)} className={field} placeholder="e.g. DevOps" />
      </div>
      <div>
        <label htmlFor="nx" className="mb-1 block text-sm font-medium">Notes</label>
        <textarea id="nx" required rows={9} value={text} onChange={(e) => setText(e.target.value)} className={field} placeholder="Paste text here…" />
      </div>
      <button disabled={busy} className="rounded-lg bg-cobalt px-4 py-2.5 text-sm font-medium text-white hover:bg-cobalt-dark disabled:opacity-40">
        {busy ? 'Embedding…' : 'Add to knowledge base'}
      </button>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-leaf' : 'text-rose'}`}>{msg.text}</p>}
    </form>
  );
}
