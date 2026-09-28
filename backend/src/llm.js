// The LLM layer. One function — chat({ system, messages, tools }) — with two
// providers behind it. Messages use a neutral shape:
//   { role: 'user' | 'assistant' | 'tool', content, toolCalls?, toolCallId? }
import { config } from './config.js';

function toAnthropic(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.content });
    else if (m.role === 'assistant') {
      const blocks = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const c of m.toolCalls || []) blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input });
      out.push({ role: 'assistant', content: blocks.length ? blocks : m.content });
    } else if (m.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content };
      const last = out[out.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
    }
  }
  return out;
}

async function anthropicChat({ system, messages, tools, noTools }) {
  const body = {
    model: config.anthropicModel,
    max_tokens: 1200,
    system,
    messages: toAnthropic(messages),
    tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
  };
  if (noTools) body.tool_choice = { type: 'none' };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic error ${res.status}`);
  return {
    text: data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(),
    toolCalls: data.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input })),
  };
}

function toOpenAI(system, messages) {
  const out = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: m.content });
    else if (m.role === 'assistant')
      out.push({
        role: 'assistant',
        content: m.content || null,
        ...(m.toolCalls?.length && {
          tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input) } })),
        }),
      });
    else out.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content });
  }
  return out;
}

async function openaiChat({ system, messages, tools, noTools }) {
  const body = {
    model: config.openaiModel,
    messages: toOpenAI(system, messages),
    tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
  };
  if (noTools) body.tool_choice = 'none';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI error ${res.status}`);
  const msg = data.choices[0].message;
  return {
    text: (msg.content || '').trim(),
    toolCalls: (msg.tool_calls || []).map((c) => ({ id: c.id, name: c.function.name, input: JSON.parse(c.function.arguments || '{}') })),
  };
}

export const chat = (args) => (config.llmProvider === 'openai' ? openaiChat(args) : anthropicChat(args));
export const llmInfo = () =>
  config.llmProvider === 'anthropic' ? { provider: 'anthropic', model: config.anthropicModel }
  : config.llmProvider === 'openai' ? { provider: 'openai', model: config.openaiModel }
  : { provider: 'mock', model: 'offline demo' };
