// POST /api/targets { action, ... }
// Members:  me, event{kind:'email'|'call'}
// Admin:    team, set{userId|'all', emails, calls}, weekly{offset:0|-1|-2}
// Day = TARGET_TZ (default America/New_York = US Eastern, resets at 12:00 AM ET). Default target = DEFAULT_EMAIL_TARGET / DEFAULT_CALL_TARGET (100 / 100).
const { sb, getUser } = require('./_mail');

const TZ = process.env.TARGET_TZ || 'America/New_York';
const DEF = { emails: parseInt(process.env.DEFAULT_EMAIL_TARGET || '100', 10), calls: parseInt(process.env.DEFAULT_CALL_TARGET || '100', 10) };
const dayOf = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d || new Date()); // YYYY-MM-DD
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const mondayOf = (iso) => addDays(iso, -((new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7));
const num = (v, max) => Math.max(0, Math.min(max || 5000, parseInt(v, 10) || 0));

async function members() {
  const rows = await sb('profiles?approved=eq.true&select=id,name,email,role&limit=1000');
  const t = await sb('team_targets?select=*&limit=1000');
  const by = {}; (t || []).forEach((x) => { by[x.user_id] = x; });
  // admins only take part when they have an explicit target row
  return (rows || []).filter((m) => m.role !== 'admin' || by[m.id]).map((m) => ({
    id: m.id, name: m.name || m.email || '', email: m.email || '', custom: !!by[m.id],
    target: by[m.id] ? { emails: by[m.id].emails, calls: by[m.id].calls } : { emails: DEF.emails, calls: DEF.calls }
  }));
}
async function progress(from, to) {
  const rows = await sb('activity_daily?day=gte.' + from + '&day=lte.' + to + '&select=user_id,day,kind,n&limit=10000');
  const o = {}; // uid -> day -> {e,c}
  (rows || []).forEach((r) => { const u = o[r.user_id] = o[r.user_id] || {}; const d = u[r.day] = u[r.day] || { e: 0, c: 0 }; if (r.kind === 'email') d.e += r.n; else d.c += r.n; });
  return o;
}
async function meState(user) {
  const ms = await members();
  const m = ms.filter((x) => x.id === user.id)[0];
  if (!m) return { show: false };
  const day = dayOf();
  const p = ((await progress(day, day))[user.id] || {})[day] || { e: 0, c: 0 };
  return { show: true, day, tz: TZ, name: m.name, emails: { done: p.e, target: m.target.emails }, calls: { done: p.c, target: m.target.calls } };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const user = await getUser(req, res);
    if (!user) return;
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const act = String(b.action || '');
    const isMember = user.prof.approved === true;
    const isAdmin = isMember && user.prof.role === 'admin';

    if (act === 'me') return res.status(200).json(isMember ? await meState(user) : { show: false });
    if (act === 'event') {
      if (!isMember) return res.status(200).json({ show: false });
      const kind = b.kind === 'call' ? 'call' : b.kind === 'email' ? 'email' : '';
      if (!kind) return res.status(400).json({ error: 'Bad kind.' });
      await sb('rpc/bump_activity', { method: 'POST', body: { p_user: user.id, p_day: dayOf(), p_kind: kind } });
      return res.status(200).json(await meState(user));
    }

    if (!isAdmin) return res.status(403).json({ error: 'Admins only.' });

    if (act === 'team') {
      const day = dayOf(), ms = await members(), p = await progress(day, day);
      return res.status(200).json({ day, defaults: DEF, members: ms.map((m) => { const d = (p[m.id] || {})[day] || { e: 0, c: 0 }; return Object.assign({}, m, { emailsDone: d.e, callsDone: d.c }); }) });
    }
    if (act === 'set') {
      const e = num(b.emails), c = num(b.calls);
      let ids = [];
      if (b.userId === 'all') ids = (await members()).filter((m) => !m.custom || true).map((m) => m.id);
      else if (/^[0-9a-f-]{36}$/i.test(String(b.userId || ''))) ids = [String(b.userId)];
      if (!ids.length) return res.status(400).json({ error: 'No member selected.' });
      const ok = (await sb('profiles?approved=eq.true&select=id&limit=1000')).map((x) => x.id);
      ids = ids.filter((x) => ok.indexOf(x) !== -1);
      if (!ids.length) return res.status(400).json({ error: 'Member is not in your team.' });
      await sb('team_targets?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: ids.map((id) => ({ user_id: id, emails: e, calls: c, updated_at: new Date().toISOString() })) });
      return res.status(200).json({ ok: true, count: ids.length });
    }
    if (act === 'weekly') {
      const today = dayOf();
      const off = Math.max(-8, Math.min(0, parseInt(b.offset, 10) || 0));
      const start = addDays(mondayOf(today), off * 7);
      const days = [0, 1, 2, 3, 4, 5].map((i) => addDays(start, i)).filter((d) => d <= today); // Mon-Sat
      const done = days.filter((d) => d < today); // finished days are the ones that count
      const ms = await members(), p = days.length ? await progress(days[0], days[days.length - 1]) : {};
      const out = ms.map((m) => {
        const per = days.map((d) => { const x = (p[m.id] || {})[d] || { e: 0, c: 0 }; return { day: d, e: x.e, c: x.c, open: d === today, met: x.e >= m.target.emails && x.c >= m.target.calls }; });
        const cnt = per.filter((x) => done.indexOf(x.day) !== -1);
        const totE = cnt.reduce((a, x) => a + x.e, 0), totC = cnt.reduce((a, x) => a + x.c, 0);
        return { id: m.id, name: m.name, target: m.target, per, counted: cnt.length, daysMet: cnt.filter((x) => x.met).length, totalE: totE, totalC: totC,
          achieved: cnt.length ? (totE >= m.target.emails * cnt.length && totC >= m.target.calls * cnt.length) : null };
      });
      return res.status(200).json({ weekStart: start, days, today, members: out });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Targets request failed' });
  }
};
