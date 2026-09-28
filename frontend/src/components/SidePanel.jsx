import { useEffect } from 'react';
import SourceCard from './SourceCard.jsx';
import SearchLab from './SearchLab.jsx';
import AddNotes from './AddNotes.jsx';

const TABS = [
  ['trace', 'How it answered'],
  ['search', 'Vector search'],
  ['notes', 'Add notes'],
];

export default function SidePanel({ open, tab, setTab, message, activeSource, onAdded }) {
  // Scroll the cited source into view when a [n] chip is clicked.
  useEffect(() => {
    if (tab === 'trace' && activeSource) {
      document.getElementById(`src-${activeSource.n}`)?.scrollIntoView({ block: 'center' });
    }
  }, [activeSource, tab, message?.id]);

  return (
    <aside
      className={`${open ? 'flex' : 'hidden'} absolute inset-y-0 right-0 z-10 w-[min(92vw,26rem)] flex-col border-l border-line bg-paper shadow-xl lg:static lg:flex lg:w-[26rem] lg:shrink-0 lg:shadow-none`}
    >
      <div role="tablist" className="flex shrink-0 gap-1 border-b border-line bg-card px-3 pt-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === id ? 'border-b-2 border-cobalt text-cobalt' : 'text-soft hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'trace' && <Trace message={message} activeSource={activeSource} />}
        {tab === 'search' && <SearchLab />}
        {tab === 'notes' && <AddNotes onAdded={onAdded} />}
      </div>
    </aside>
  );
}

function Trace({ message, activeSource }) {
  if (!message || message.error) {
    return (
      <p className="text-sm leading-relaxed text-soft">
        Ask a question and the agent's steps appear here: what it searched for, what it calculated, and which passages the answer is based on.
      </p>
    );
  }
  const { steps, sources, meta } = message;
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Steps</h3>
        {steps.length === 0 ? (
          <p className="text-sm text-soft">The model answered directly without calling a tool.</p>
        ) : (
          <ol className="ml-2 space-y-5 border-l border-line">
            {steps.map((s, i) => (
              <li key={i} className="relative pl-5">
                <span className={`absolute -left-[7px] top-1.5 size-3 rounded-full border-2 bg-card ${s.error ? 'border-rose' : 'border-cobalt'}`} />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{s.label}</p>
                  <span className="font-mono text-xs text-soft">{s.ms} ms</span>
                </div>
                <p className="mt-0.5 break-words text-sm text-soft">“{s.input}”</p>
                <p className={`mt-1 text-sm ${s.error ? 'text-rose' : ''}`}>{s.summary}</p>
              </li>
            ))}
            <li className="relative pl-5">
              <span className="absolute -left-[7px] top-1.5 size-3 rounded-full bg-leaf" />
              <p className="font-medium">Wrote the answer</p>
              <p className="text-sm text-soft">
                {meta.provider === 'mock' ? 'Offline demo (no LLM)' : `${meta.provider} · ${meta.model}`} · {(meta.ms / 1000).toFixed(1)}s total
              </p>
            </li>
          </ol>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Sources</h3>
        {sources.length === 0 ? (
          <p className="text-sm text-soft">No notes were used for this answer.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sources.map((s, i) => (
              <SourceCard key={s.id} source={s} index={i + 1} active={activeSource?.n === i + 1} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
