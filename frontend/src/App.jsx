import { useEffect, useState } from 'react';
import { ask, getStatus } from './api.js';
import Chat from './components/Chat.jsx';
import SidePanel from './components/SidePanel.jsx';

const uid = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeSource, setActiveSource] = useState(null); 
  const [tab, setTab] = useState('trace');
  const [panelOpen, setPanelOpen] = useState(false);

  const refreshStatus = () => getStatus().then(setStatus).catch(() => setStatus({ offline: true }));
  useEffect(() => { refreshStatus(); }, []);

  async function send(question) {
    const history = messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { id: uid(), role: 'user', content: question }]);
    setLoading(true);
    try {
      const r = await ask(question, history);
      const id = uid();
      setMessages((m) => [...m, { id, role: 'assistant', content: r.answer, sources: r.sources, steps: r.steps, meta: r.meta }]);
      setSelectedId(id);
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: e.message, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  const selected = messages.find((m) => m.id === selectedId);
  const openTrace = (msgId, n = null) => {
    setSelectedId(msgId);
    setActiveSource(n ? { msgId, n } : null);
    setTab('trace');
    setPanelOpen(true);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-card px-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl font-bold tracking-tight">AI Agent</h1>
          <span className="hidden text-sm text-soft sm:inline">AI learning agent</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={status} />
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper lg:hidden"
            aria-expanded={panelOpen}
          >
            {panelOpen ? 'Close details' : 'Details'}
          </button>
        </div>
      </header>

      {status?.offline && (
        <p role="alert" className="border-b border-rose/30 bg-rose/10 px-6 py-2 text-sm text-rose">
          Can't reach the API. Start the backend: <code className="font-mono">cd backend && npm run dev</code>
        </p>
      )}

      <div className="relative flex min-h-0 flex-1">
        <Chat messages={messages} loading={loading} onSend={send} onOpenTrace={openTrace} selectedId={selectedId} />
        <SidePanel
          open={panelOpen}
          tab={tab}
          setTab={setTab}
          message={selected}
          activeSource={activeSource}
          onAdded={refreshStatus}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  if (!status) return null;
  if (status.offline) return <span className="text-sm text-rose">API offline</span>;
  const demo = status.provider === 'mock';
  return (
    <p className="text-right text-sm leading-tight text-soft" title={`Embeddings: ${status.embedding}`}>
      <span className={demo ? 'font-medium text-ink' : 'font-medium text-leaf'}>
        {demo ? 'Offline demo' : `${status.provider} · ${status.model}`}
      </span>
      <span className="hidden sm:inline"> — {status.chunks} notes indexed</span>
    </p>
  );
}
