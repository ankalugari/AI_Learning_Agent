import { useEffect, useRef, useState } from 'react';
import Message from './Message.jsx';

const SUGGESTIONS = [
  'What is a context window?',
  'How does RAG reduce hallucinations?',
  'Explain cosine similarity with an example',
  'What is 15% of 2,480 plus sqrt(144)?',
];

export default function Chat({ messages, loading, onSend, onOpenTrace, selectedId }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, loading]);

  const submit = (q = text) => {
    const question = q.trim();
    if (!question || loading) return;
    setText('');
    if (boxRef.current) boxRef.current.style.height = 'auto';
    onSend(question);
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.length === 0 && (
            <section className="pt-8 sm:pt-16">
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Ask about AI. Every answer shows the notes it came from.
              </h2>
              <p className="mt-3 max-w-prose text-soft">
                The agent searches its notes by meaning, quotes what it found, and uses a calculator when numbers are involved.
              </p>
              <ul className="mt-6 flex flex-col items-start gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => submit(s)}
                      className="rounded-full border border-line bg-card px-4 py-2 text-left text-sm hover:border-cobalt hover:text-cobalt"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {messages.map((m) => (
            <Message key={m.id} m={m} selected={m.id === selectedId} onOpenTrace={onOpenTrace} />
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-soft" role="status">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="dot size-1.5 rounded-full bg-cobalt" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
              Searching notes and thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-card px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <label htmlFor="q" className="sr-only">Your question</label>
          <textarea
            id="q"
            ref={boxRef}
            rows={1}
            value={text}
            placeholder="Ask about embeddings, RAG, agents… or try some maths"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            className="max-h-40 flex-1 resize-none rounded-xl border border-line bg-paper px-4 py-2.5 placeholder:text-soft/70"
          />
          <button
            onClick={() => submit()}
            disabled={!text.trim() || loading}
            className="rounded-xl bg-cobalt px-5 py-2.5 font-medium text-white hover:bg-cobalt-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </div>
    </main>
  );
}
