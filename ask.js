// POST /api/ask  { question, history:[{role,content}] }  -> { answer }
// Needs env var ANTHROPIC_API_KEY in Vercel. Optional: ANTHROPIC_MODEL, ASK_DAILY_LIMIT.
const SB_URL = process.env.SUPABASE_URL || 'https://ouxolslusdduddbgwwsg.supabase.co';
const SB_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_-RDfUdZKeQ16YFU0pVX1pQ_eLWCTkg4';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const LIMIT = parseInt(process.env.ASK_DAILY_LIMIT || '40', 10);
const SYSTEM = [
  'You are the CarrierDesk Assistant, helping independent truck dispatchers who book US freight for owner-operators and small carriers.',
  'Help with: carrier vetting (MC/USDOT, authority, insurance such as the $750K BI&PD minimum, safety rating, new-authority risk), negotiating rates, rate confirmations, BOL/POD, detention, TONU, lumpers, factoring, load boards, cold-call scripts, and short emails or WhatsApp messages to carriers and brokers.',
  'Answer in the language the user writes in (Roman Urdu, Hinglish or English). Be practical and concise: short paragraphs or a few bullets, no long essays.',
  'You have no live data: never invent current market rates, load availability or a specific carrier\'s status. Say so and suggest where to check (SAFER, a load board).',
  'For legal, tax or insurance-claim questions, give general information and suggest a professional.'
].join(' ');
const used = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not set up yet (ANTHROPIC_API_KEY missing on the server).' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please log in to use the AI assistant.' });
  let user;
  try {
    const u = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
    if (!u.ok) return res.status(401).json({ error: 'Please log in again.' });
    user = await u.json();
  } catch (e) { return res.status(502).json({ error: 'Login check failed. Try again.' }); }
  const uid = String(user && user.id || '');
  if (!uid) return res.status(401).json({ error: 'Please log in again.' });

  const today = new Date().toISOString().slice(0, 10);
  const rec = used.get(uid) && used.get(uid).day === today ? used.get(uid) : { day: today, n: 0 };
  if (rec.n >= LIMIT) return res.status(429).json({ error: 'Daily question limit reached (' + LIMIT + '). Try again tomorrow.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const q = String(body.question || '').trim().slice(0, 2000);
  if (!q) return res.status(400).json({ error: 'Empty question.' });
  const hist = (Array.isArray(body.history) ? body.history : []).slice(-8)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (hist.length && hist[0].role !== 'user') hist.shift();
  const messages = hist.concat([{ role: 'user', content: q }]);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, messages })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'AI error: ' + ((j && j.error && j.error.message) || r.status) });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    rec.n++; used.set(uid, rec);
    return res.status(200).json({ answer: text || 'No answer. Try rephrasing.' });
  } catch (e) {
    return res.status(502).json({ error: 'AI request failed. Try again.' });
  }
};
