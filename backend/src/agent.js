// Step 6 (RAG) + Step 7 (AI agent).
//
// RAG   : retrieve relevant passages (vector search) → put them in the prompt → LLM answers from them.
// Agent : instead of always retrieving once, the LLM decides WHICH tool to call (search / calculator),
//         sees the result, and loops until it can answer.
import { config } from './config.js';
import { chat, llmInfo } from './llm.js';
import { toolDefs, runTool, calculate } from './tools.js';

const SYSTEM = `You are Marginalia, a friendly AI tutor that teaches how modern AI works (LLMs, embeddings, vector search, RAG, agents).

How to work:
- For any question about AI/ML concepts, call search_knowledge first. You may search more than once with different queries.
- For any arithmetic, call calculator. Never do maths in your head.
- Ground your answer in the retrieved passages and cite them inline like [1] or [2] using the numbers the search tool gives you.
- If the passages don't cover the question, say so briefly, then answer from general knowledge and make clear that part isn't from the notes.
- Teach: lead with a plain one-sentence answer, then a short explanation, then a tiny example if it helps. Keep it under ~180 words unless asked for more. Use simple markdown.`;

export async function runAgent(question, history, store) {
  const t0 = Date.now();
  const ctx = { store, k: config.topK, sources: [] };
  const steps = [];
  const info = llmInfo();

  let answer;
  if (info.provider === 'mock') {
    answer = await mockAnswer(question, ctx, steps);
  } else {
    const messages = [
      ...history.slice(-8).filter((m) => m && m.content && (m.role === 'user' || m.role === 'assistant')).map((m) => ({ role: m.role, content: String(m.content) })),
      { role: 'user', content: question },
    ];
    for (let i = 0; ; i++) {
      const last = i >= config.maxAgentSteps;
      const res = await chat({ system: SYSTEM, messages, tools: toolDefs, noTools: last });
      if (!res.toolCalls.length || last) { answer = res.text || 'I could not produce an answer.'; break; }
      messages.push({ role: 'assistant', content: res.text, toolCalls: res.toolCalls });
      for (const call of res.toolCalls) {
        const { output, step } = await runTool(call.name, call.input, ctx);
        steps.push(step);
        messages.push({ role: 'tool', toolCallId: call.id, content: output });
      }
    }
  }

  return {
    answer,
    sources: ctx.sources,
    steps,
    meta: { ...info, embedding: store.embedder.name, ms: Date.now() - t0 },
  };
}


async function mockAnswer(question, ctx, steps) {
  const parts = [];
  const expr = extractExpression(question);
  if (expr) {
    try {
      calculate(expr);
      const { output, step } = await runTool('calculator', { expression: expr }, ctx);
      steps.push(step);
      parts.push(`**${expr} = ${Number(output).toLocaleString('en-US')}**`);
    } catch {  }
  }
  
  const leftover = question.replace(expr || '', ' ').toLowerCase().match(/[a-z]{3,}/g) || [];
  const filler = new Set(['what', 'whats', 'the', 'calculate', 'compute', 'solve', 'result', 'answer', 'plus', 'minus', 'times', 'divided', 'sqrt', 'and']);
  const isMathOnly = parts.length > 0 && leftover.filter((w) => !filler.has(w)).length < 2;
  if (!isMathOnly) {
    const { step } = await runTool('search_knowledge', { query: question }, ctx);
    steps.push(step);
    const top = ctx.sources.slice(0, 2);
    if (top.length) parts.push(...top.map((s, i) => `${s.text} [${i + 1}]`));
    else if (!parts.length) parts.push("I couldn't find anything about that in my notes. Try rephrasing, or add your own notes in the **Add notes** tab.");
  }
  parts.push('_Offline demo mode: these passages come straight from vector search. Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to `backend/.env` and an LLM will write the answer for you._');
  return parts.join('\n\n');
}

function extractExpression(q) {
  if (!/\d/.test(q)) return null;
  const m = q
    .replace(/\s+(plus)\s+/gi, ' + ').replace(/\s+minus\s+/gi, ' - ')
    .replace(/\s+times\s+/gi, ' * ').replace(/\s+divided by\s+/gi, ' / ')
    .match(/(?:sqrt\([^)]*\)|\d[\d.,]*%?\s*(?:of\s+)?|[+\-*/^()]|\s)+/gi);
  const best = (m || []).map((s) => s.trim()).filter((s) => /\d/.test(s) && /[+\-*/^%]|of|sqrt/i.test(s)).sort((a, b) => b.length - a.length)[0];
  return best || null;
}
