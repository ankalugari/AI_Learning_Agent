// A retrieved passage. The sentence that best matched the question gets the highlighter.
function Highlighted({ text, highlight }) {
  const i = highlight ? text.indexOf(highlight) : -1;
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{highlight}</mark>
      {text.slice(i + highlight.length)}
    </>
  );
}

export default function SourceCard({ source, index, active }) {
  const pct = Math.round(Math.max(0, Math.min(1, source.score)) * 100);
  return (
    <article
      id={index ? `src-${index}` : undefined}
      className={`rounded-xl border bg-card p-4 ${active ? 'border-cobalt ring-2 ring-cobalt/20' : 'border-line'}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h4 className="font-display font-semibold leading-snug">
          {index && <span className="mr-1.5 text-cobalt">[{index}]</span>}
          {source.title}
        </h4>
        <span className="shrink-0 text-xs text-soft">{source.topic}</span>
      </header>
      <p className="mt-2 text-sm leading-relaxed">
        <Highlighted text={source.text} highlight={source.highlight} />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
          role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Similarity to your question"
        >
          <div className="h-full rounded-full bg-cobalt" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-xs text-soft">{pct}% match</span>
      </div>
    </article>
  );
}
