// Step 8 — Tools the agent can call: a calculator and a knowledge search.

// ---- Safe calculator (no eval) --------------------------------------------
const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  log: Math.log10, ln: Math.log, exp: Math.exp, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

export function calculate(input) {
  const src = String(input)
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, '$1')                    // 2,480 → 2480
    .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*/g, '($1/100)*')  // 15% of x
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^')
    .trim();

  const re = /\s*(\d+\.?\d*|\.\d+|[a-z_]+|[-+*/^(),])/y;
  const tokens = [];
  let m;
  while (re.lastIndex < src.length && (m = re.exec(src))) tokens.push(m[1]);
  if (re.lastIndex < src.length) throw new Error('Unsupported character in expression');

  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (t) => { if (t && tokens[pos] !== t) throw new Error(`Expected "${t}"`); return tokens[pos++]; };

  const expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') v = eat() === '+' ? v + term() : v - term();
    return v;
  };
  const term = () => {
    let v = unary();
    while (peek() === '*' || peek() === '/') v = eat() === '*' ? v * unary() : v / unary();
    return v;
  };
  const unary = () => {
    if (peek() === '-') { eat(); return -unary(); }
    if (peek() === '+') { eat(); return unary(); }
    return power();
  };
  const power = () => {
    const base = atom();
    if (peek() === '^') { eat(); return Math.pow(base, unary()); }
    return base;
  };
  const atom = () => {
    const t = eat();
    if (t === undefined) throw new Error('Unexpected end of expression');
    if (t === '(') { const v = expr(); eat(')'); return v; }
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (t in CONSTS) return CONSTS[t];
    if (t in FUNCS) {
      eat('(');
      const args = [];
      if (peek() !== ')') { args.push(expr()); while (peek() === ',') { eat(); args.push(expr()); } }
      eat(')');
      return FUNCS[t](...args);
    }
    throw new Error(`Unknown name "${t}"`);
  };

  const result = expr();
  if (pos < tokens.length) throw new Error('Unexpected input after expression');
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return Math.round(result * 1e10) / 1e10;
}

export const toolDefs = [
  {
    name: 'search_knowledge',
    description:
      'Semantic search over the AI knowledge base (concepts about LLMs, embeddings, RAG, agents, etc.). Use this before answering any question about AI/ML concepts. Returns the most relevant passages with similarity scores.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'A focused search query' } },
      required: ['query'],
    },
  },
  {
    name: 'calculator',
    description: 'Evaluate a math expression exactly. Supports + - * / ^ ( ), "15% of 200", sqrt, log, ln, sin, cos, tan, abs, pi. Always use this for arithmetic instead of computing in your head.',
    input_schema: {
      type: 'object',
      properties: { expression: { type: 'string', description: 'e.g. "sqrt(144) + 15% of 2480"' } },
      required: ['expression'],
    },
  },
];

export async function runTool(name, input, ctx) {
  const t0 = Date.now();
  const label = name === 'calculator' ? 'Calculated' : 'Searched notes';
  try {
    if (name === 'calculator') {
      const value = calculate(input.expression);
      return {
        output: String(value),
        step: { kind: 'tool', tool: name, label, input: input.expression, summary: `= ${value.toLocaleString('en-US')}`, ms: Date.now() - t0 },
      };
    }
    if (name === 'search_knowledge') {
      const results = await ctx.store.search(input.query, ctx.k);
      const lines = results.map((r) => {
        let idx = ctx.sources.findIndex((s) => s.id === r.id);
        if (idx === -1) { ctx.sources.push(r); idx = ctx.sources.length - 1; }
        else ctx.sources[idx].score = Math.max(ctx.sources[idx].score, r.score);
        return `[${idx + 1}] ${r.title} (similarity ${r.score})\n${r.text}`;
      });
      return {
        output: lines.length ? lines.join('\n\n') : 'No relevant passages found in the knowledge base.',
        step: {
          kind: 'tool', tool: name, label, input: input.query,
          summary: results.length ? `${results.length} passage${results.length > 1 ? 's' : ''}, best match ${Math.round(results[0].score * 100)}%` : 'No close matches',
          ms: Date.now() - t0,
        },
      };
    }
    throw new Error(`Unknown tool ${name}`);
  } catch (e) {
    return {
      output: `Error: ${e.message}`,
      step: { kind: 'tool', tool: name, label, input: input?.expression || input?.query || '', summary: `Failed: ${e.message}`, error: true, ms: Date.now() - t0 },
    };
  }
}
