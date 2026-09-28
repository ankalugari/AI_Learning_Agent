import Markdown from 'react-markdown';

export default function Message({ m, selected, onOpenTrace }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-cobalt px-4 py-2.5 text-white">{m.content}</p>
      </div>
    );
  }

  const nSources = m.sources?.length || 0;
  // Turn [1] into a link we can style as a citation chip.
  const content = m.error ? m.content : m.content.replace(/\[(\d+)\]/g, (t, n) => (Number(n) <= nSources ? `[${n}](#src-${n})` : t));

  return (
    <article className="flex flex-col gap-2">
      <div className={`rounded-2xl rounded-tl-md border bg-card px-5 py-4 ${m.error ? 'border-rose/40' : selected ? 'border-cobalt/40' : 'border-line'}`}>
        {m.error && <p className="mb-1 font-medium text-rose">Something went wrong</p>}
        <div className="prose-m">
          <Markdown
            components={{
              a: ({ href, children }) =>
                href?.startsWith('#src-') ? (
                  <button
                    onClick={() => onOpenTrace(m.id, Number(href.slice(5)))}
                    className="mx-0.5 rounded bg-mark px-1.5 align-baseline text-xs font-semibold text-ink hover:bg-cobalt hover:text-white"
                    aria-label={`Show source ${children}`}
                  >
                    {children}
                  </button>
                ) : (
                  <a href={href} target="_blank" rel="noreferrer" className="text-cobalt underline">{children}</a>
                ),
            }}
          >
            {content}
          </Markdown>
        </div>
      </div>

      {!m.error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-soft">
          <button onClick={() => onOpenTrace(m.id)} className="font-medium text-cobalt hover:underline">
            How it answered
          </button>
          <span>
            {m.steps.length === 0
              ? 'no tools used'
              : `${m.steps.length} tool call${m.steps.length > 1 ? 's' : ''}`}
            {' · '}
            {nSources} source{nSources === 1 ? '' : 's'}
            {' · '}
            {(m.meta.ms / 1000).toFixed(1)}s
          </span>
        </div>
      )}
    </article>
  );
}
