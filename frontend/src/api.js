// Step 9 — the frontend talks to the Express API only. No API keys live in the browser.
async function request(url, options) {
  let res;
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error("Can't reach the API. Start the backend with `npm run dev` inside /backend.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const getStatus = () => request('/api/status');
export const ask = (question, history) =>
  request('/api/ask', { method: 'POST', body: JSON.stringify({ question, history }) });
export const search = (query, k = 5) =>
  request('/api/search', { method: 'POST', body: JSON.stringify({ query, k }) });
export const addDocument = (title, text, topic) =>
  request('/api/documents', { method: 'POST', body: JSON.stringify({ title, text, topic }) });
