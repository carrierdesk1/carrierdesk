// Shared helpers for campaigns: Supabase REST, login check, email verification, rendering, sending (Resend).
// Env (Vercel): SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, RESEND_API_KEY, EMAIL_FROM_ADDR,
//               BUSINESS_ADDRESS (postal address shown in every email footer), SITE_URL (optional)
const SB_URL = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = () => String(process.env.SUPABASE_SERVICE_KEY || '').replace(/["'\s]/g, '');
const SITE = () => String(process.env.SITE_URL || 'https://carrierdesk.vercel.app').replace(/\/+$/, '');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Supabase REST with the service key. opts: {method, body, headers, raw}
async function sb(path, opts) {
  const o = opts || {}, key = SB_KEY();
  if (!SB_URL() || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY are not set in Vercel.');
  const r = await fetch(SB_URL() + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, o.body ? { 'Content-Type': 'application/json' } : {}, o.headers || {}),
    body: o.body ? JSON.stringify(o.body) : undefined,
    signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Database error ' + r.status + (t ? ': ' + t.slice(0, 200) : '')); }
  if (o.raw) return r;
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// Returns { id, email, pro } or null (a 401 was already sent)
async function getUser(req, res) {
  const anon = process.env.SUPABASE_ANON_KEY || '';
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) { res.status(401).json({ error: 'Please log in first.' }); return null; }
  try {
    const r = await fetch(SB_URL() + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) { res.status(401).json({ error: 'Session expired. Please log in again.' }); return null; }
    const u = await r.json();
    let pro = false, prof = {};
    try {
      const rows = await sb('profiles?id=eq.' + encodeURIComponent(u.id) + '&select=*');
      prof = (rows && rows[0]) || {};
      pro = prof.approved === true || (prof.plan === 'paid' && !!prof.plan_expires && Date.parse(prof.plan_expires) > Date.now());
    } catch (e) { /* profiles missing: not pro */ }
    return { id: u.id, email: String(u.email || '').toLowerCase(), pro, prof };
  } catch (e) {
    res.status(502).json({ error: 'Login check failed: ' + (e.message || e) });
    return null;
  }
}

// ---------- email verification (syntax, role/disposable, MX via DNS-over-HTTPS) ----------
const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'getnada.com', 'sharklasers.com', 'throwawaymail.com', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'tempail.com', 'moakt.com', 'spamgourmet.com', 'mailnesia.com']);
const NOREPLY = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|abuse|bounce|bounces)$/i;
const RE = /^[a-z0-9._%+\-]{1,64}@([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;
const mxCache = new Map();
async function hasMx(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = null; // null = could not check
  try {
    const r = await fetch('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(domain) + '&type=MX', { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    if (j.Status === 3) ok = false;
    else if (Array.isArray(j.Answer) && j.Answer.some((a) => a.type === 15)) ok = true;
    else if (j.Status === 0) {
      const r2 = await fetch('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(domain) + '&type=A', { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) });
      const j2 = await r2.json();
      ok = Array.isArray(j2.Answer) && j2.Answer.some((a) => a.type === 1);
    }
  } catch (e) { ok = null; }
  if (mxCache.size > 3000) mxCache.clear();
  mxCache.set(domain, ok);
  return ok;
}
// -> [{ email, ok, reason }]  reason: '' | invalid | disposable | noreply | duplicate | no-mx | unchecked(ok=true)
async function verifyList(list) {
  const seen = new Set(), out = [], domains = new Set();
  list.forEach((e0) => {
    const email = String(e0 || '').trim().toLowerCase();
    if (!email) return;
    if (!RE.test(email)) return out.push({ email, ok: false, reason: 'invalid' });
    if (seen.has(email)) return out.push({ email, ok: false, reason: 'duplicate' });
    seen.add(email);
    const [local, dom] = email.split('@');
    if (DISPOSABLE.has(dom)) return out.push({ email, ok: false, reason: 'disposable' });
    if (NOREPLY.test(local)) return out.push({ email, ok: false, reason: 'noreply' });
    domains.add(dom);
    out.push({ email, ok: true, reason: '' });
  });
  const doms = Array.from(domains), res = {};
  for (let i = 0; i < doms.length; i += 12) await Promise.all(doms.slice(i, i + 12).map(async (d) => { res[d] = await hasMx(d); }));
  out.forEach((x) => {
    if (!x.ok) return;
    const m = res[x.email.split('@')[1]];
    if (m === false) { x.ok = false; x.reason = 'no-mx'; } else if (m === null) x.reason = 'unchecked';
  });
  return out;
}

// ---------- rendering + sending ----------
const fill = (t, r, p) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => {
  const v = { name: r.name, company: r.name, mc: r.mc, dot: r.dot_number, officer: r.officer || r.name, sender: p.sender_name, email: r.email }[String(k).toLowerCase()];
  return v == null ? '' : String(v);
});
function build(r, camp, p) {
  const step = r.step || 0;
  const subject = fill(step ? (camp.followup_subject || 'Re: ' + camp.subject) : camp.subject, r, p);
  const text = fill(step ? camp.followup_body : camp.body, r, p);
  const unsub = SITE() + '/api/unsub?r=' + r.id;
  const addr = process.env.BUSINESS_ADDRESS || '';
  const html = '<div style="font:15px/1.55 Arial,sans-serif;color:#111">' + esc(text).replace(/\n/g, '<br>') + '</div>' +
    '<p style="font:12px/1.5 Arial,sans-serif;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:10px">' + esc(p.sender_name) + (addr ? ' · ' + esc(addr) : '') +
    '<br>Don\'t want these emails? <a href="' + unsub + '" style="color:#888">Unsubscribe</a></p>' +
    '<img src="' + SITE() + '/api/track?r=' + r.id + '" width="1" height="1" alt="" style="display:none">';
  const plain = text + '\n\n--\n' + p.sender_name + (addr ? ' - ' + addr : '') + '\nUnsubscribe: ' + unsub;
  return {
    from: p.sender_name + ' <' + process.env.EMAIL_FROM_ADDR + '>',
    to: [r.email], subject, html, text: plain, reply_to: p.reply_to,
    headers: { 'List-Unsubscribe': '<' + unsub + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
  };
}
const RESEND = 'https://api.resend.com/emails';
async function resend(path, payload) {
  const r = await fetch(RESEND + path, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j, status: r.status };
}
// rows: campaign_recipients rows (all of one campaign). Returns [{ id, ok, msgId, error }]
async function sendRows(rows, camp, p) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM_ADDR) throw new Error('Email sending is not set up yet (RESEND_API_KEY / EMAIL_FROM_ADDR missing in Vercel).');
  const results = [];
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const b = await resend('/batch', chunk.map((r) => build(r, camp, p)));
    if (b.ok && b.j && Array.isArray(b.j.data)) { chunk.forEach((r, k) => results.push({ id: r.id, ok: true, msgId: (b.j.data[k] && b.j.data[k].id) || '' })); continue; }
    for (const r of chunk) { // batch is all-or-nothing: retry one by one to find the bad address
      const s = await resend('', build(r, camp, p));
      results.push({ id: r.id, ok: s.ok, msgId: (s.j && s.j.id) || '', error: s.ok ? '' : String((s.j && (s.j.message || s.j.error)) || 'Send failed ' + s.status).slice(0, 200) });
    }
  }
  return results;
}

module.exports = { sb, getUser, verifyList, sendRows, esc, SITE, SB_URL, SB_KEY };
