// POST /api/campaign  { action, ... }   (needs login; sending needs Pro)
// actions: verify, skip_list, skip_add, skip_del, create, send, list, detail, mark_replied, pause, resume, delete,
//          sender_get, sender_save, issue
// Cron:    GET /api/campaign?cron=1   (daily, sends due follow-ups; Authorization: Bearer CRON_SECRET)
const { sb, getUser, verifyList, sendRows } = require('../lib/mail');

const DAILY = () => parseInt(process.env.SEND_DAILY_LIMIT || '300', 10); // emails per user per day
const BATCH = 100;                                                         // emails per "send" call
const iso = (ms) => new Date(ms).toISOString();
const inList = (arr) => '(' + arr.map((x) => encodeURIComponent('"' + String(x).replace(/"/g, '') + '"')).join(',') + ')';

async function sentToday(uid) {
  const since = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
  const r = await sb('campaign_recipients?user_id=eq.' + uid + '&last_sent_at=gte.' + since + '&select=id', { headers: { Prefer: 'count=exact', Range: '0-0' }, raw: true });
  const n = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
  return isFinite(n) ? n : 0;
}

// Sends due emails of ONE campaign. Returns { sent, failed, left }
async function sendDue(uid, camp, prof, user, cap) {
  if (camp.status !== 'active') return { sent: 0, failed: 0, left: 0, note: 'Campaign is ' + camp.status };
  const left0 = Math.max(0, DAILY() - (await sentToday(uid)));
  const take = Math.min(cap || BATCH, left0);
  if (take <= 0) return { sent: 0, failed: 0, left: 1, note: 'Daily sending limit reached (' + DAILY() + '). Remaining emails go out tomorrow.' };
  const rows = await sb('campaign_recipients?campaign_id=eq.' + camp.id + '&status=eq.queued&next_at=lte.' + iso(Date.now()) + '&order=created_at.asc&limit=' + take + '&select=*');
  if (!rows.length) return { sent: 0, failed: 0, left: 0 };
  // last-second unsubscribe check
  const un = await sb('unsubscribes?email=in.' + inList(rows.map((r) => r.email)) + '&select=email');
  const unSet = new Set((un || []).map((x) => x.email));
  const ok = rows.filter((r) => !unSet.has(r.email));
  const gone = rows.filter((r) => unSet.has(r.email));
  await Promise.all(gone.map((r) => sb('campaign_recipients?id=eq.' + r.id, { method: 'PATCH', body: { status: 'unsub' } })));
  const p = { sender_name: prof.sender_name || user.name || 'M&H Dispatch Solutions', reply_to: prof.reply_to || user.email };
  const res = await sendRows(ok, camp, p);
  const byId = {}; ok.forEach((r) => { byId[r.id] = r; });
  const now = Date.now();
  let sent = 0, failed = 0;
  await Promise.all(res.map((x) => {
    const r = byId[x.id];
    if (!x.ok) { failed++; return sb('campaign_recipients?id=eq.' + x.id, { method: 'PATCH', body: { status: 'failed', error: x.error || 'Send failed' } }); }
    sent++;
    const followUp = (r.step || 0) === 0 && camp.followup_days > 0 && camp.followup_body;
    const upd = followUp
      ? { step: 1, next_at: iso(now + camp.followup_days * 86400000), sent_at: iso(now), last_sent_at: iso(now), msg_id: x.msgId, error: null }
      : { status: 'sent', sent_at: r.sent_at || iso(now), last_sent_at: iso(now), msg_id: x.msgId, error: null };
    return sb('campaign_recipients?id=eq.' + x.id, { method: 'PATCH', body: upd });
  }));
  const more = await sb('campaign_recipients?campaign_id=eq.' + camp.id + '&status=eq.queued&next_at=lte.' + iso(Date.now()) + '&select=id&limit=1');
  return { sent, failed, left: more.length ? 1 : 0 };
}

async function runCron() {
  const due = await sb('campaign_recipients?status=eq.queued&next_at=lte.' + iso(Date.now()) + '&select=campaign_id,user_id&limit=2000');
  const seen = {}, out = { campaigns: 0, sent: 0, failed: 0 };
  for (const d of due || []) {
    if (seen[d.campaign_id]) continue;
    seen[d.campaign_id] = true;
    try {
      const camp = (await sb('campaigns?id=eq.' + d.campaign_id + '&select=*'))[0];
      const prof = (await sb('profiles?id=eq.' + d.user_id + '&select=*'))[0] || {};
      if (!camp) continue;
      let guard = 0, r;
      do { r = await sendDue(d.user_id, camp, prof, { email: prof.email || '' }, BATCH); out.sent += r.sent; out.failed += r.failed; guard++; } while (r.left && r.sent && guard < 5);
      out.campaigns++;
    } catch (e) { out.error = e.message; }
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.query && req.query.cron) {
      const secret = process.env.CRON_SECRET;
      const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!secret || (bearer !== secret && String(req.query.key || '') !== secret)) return res.status(401).json({ error: 'Unauthorized' });
      return res.status(200).json(await runCron());
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const user = await getUser(req, res);
    if (!user) return;
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const act = String(b.action || '');
    const uid = user.id;
    const needPro = () => { res.status(402).json({ error: 'Campaigns are a Paid-plan feature. Please upgrade.', upgrade: true }); return false; };

    if (act === 'verify') {
      const list = (Array.isArray(b.emails) ? b.emails : []).slice(0, 3000);
      const r = await verifyList(list);
      return res.status(200).json({ results: r, good: r.filter((x) => x.ok).length, bad: r.filter((x) => !x.ok).length });
    }
    if (act === 'sender_get') {
      return res.status(200).json({ senderName: user.prof.sender_name || '', replyTo: user.prof.reply_to || '', accountEmail: user.email });
    }
    if (act === 'sender_save') {
      const name = String(b.senderName || '').trim().slice(0, 80), rt = String(b.replyTo || '').trim().toLowerCase().slice(0, 120);
      if (!name) return res.status(400).json({ error: 'Enter a sender name.' });
      if (!(await verifyList([rt]))[0].ok) return res.status(400).json({ error: 'Reply-to email looks invalid.' });
      await sb('profiles?id=eq.' + uid, { method: 'PATCH', body: { sender_name: name, reply_to: rt } });
      return res.status(200).json({ ok: true });
    }
    if (act === 'issue') {
      const m = String(b.message || '').trim().slice(0, 3000);
      if (m.length < 5) return res.status(400).json({ error: 'Please describe the issue.' });
      await sb('issues', { method: 'POST', body: { user_id: uid, email: user.email, message: m, page: String(b.page || '').slice(0, 100) }, headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ ok: true });
    }
    if (act === 'skip_list') {
      const rows = await sb('skip_list?user_id=eq.' + uid + '&select=email,dot_number,reason,created_at&order=created_at.desc&limit=5000');
      return res.status(200).json({ rows: rows || [] });
    }
    if (act === 'skip_add') {
      const reason = String(b.reason || 'do not email').slice(0, 60);
      const v = (await verifyList((Array.isArray(b.emails) ? b.emails : []).slice(0, 2000))).filter((x) => x.reason !== 'invalid' && x.reason !== 'duplicate');
      if (v.length) await sb('skip_list?on_conflict=user_id,email', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: v.map((x) => ({ user_id: uid, email: x.email, reason })) });
      return res.status(200).json({ added: v.length });
    }
    if (act === 'skip_del') {
      await sb('skip_list?user_id=eq.' + uid + '&email=eq.' + encodeURIComponent(String(b.email || '').toLowerCase()), { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    if (act === 'list') {
      const camps = await sb('campaigns?user_id=eq.' + uid + '&select=*&order=created_at.desc&limit=100');
      const recs = camps.length ? await sb('campaign_recipients?user_id=eq.' + uid + '&select=campaign_id,status,sent_at,open_count&limit=50000') : [];
      const agg = {};
      (recs || []).forEach((r) => {
        const a = agg[r.campaign_id] = agg[r.campaign_id] || { total: 0, queued: 0, sent: 0, failed: 0, replied: 0, unsub: 0, opened: 0 };
        a.total++;
        if (r.sent_at) a.sent++;
        if (r.status === 'queued') a.queued++;
        if (r.status === 'failed') a.failed++;
        if (r.status === 'replied') a.replied++;
        if (r.status === 'unsub') a.unsub++;
        if (r.open_count > 0) a.opened++;
      });
      return res.status(200).json({ campaigns: camps.map((c) => Object.assign({}, c, { stats: agg[c.id] || { total: 0, queued: 0, sent: 0, failed: 0, replied: 0, unsub: 0, opened: 0 } })), dailyLimit: DAILY(), sentToday: await sentToday(uid) });
    }
    if (act === 'detail') {
      const rows = await sb('campaign_recipients?campaign_id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid + '&select=id,dot_number,mc,name,email,status,step,sent_at,next_at,open_count,error&order=created_at.asc&limit=3000');
      return res.status(200).json({ rows: rows || [] });
    }
    if (act === 'mark_replied') {
      await sb('campaign_recipients?id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid, { method: 'PATCH', body: { status: 'replied' } });
      return res.status(200).json({ ok: true });
    }
    if (act === 'pause' || act === 'resume') {
      await sb('campaigns?id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid, { method: 'PATCH', body: { status: act === 'pause' ? 'paused' : 'active' } });
      return res.status(200).json({ ok: true });
    }
    if (act === 'delete') {
      await sb('campaign_recipients?campaign_id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid, { method: 'DELETE' });
      await sb('campaigns?id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    if (act === 'create') {
      if (!user.pro && !needPro()) return;
      if (!user.pro) return;
      if (!user.prof.sender_name || !user.prof.reply_to) return res.status(400).json({ error: 'First set your sender name and reply-to email (Profile).', needSender: true });
      const subject = String(b.subject || '').trim().slice(0, 200), body = String(b.body || '').trim().slice(0, 8000);
      if (!subject || !body) return res.status(400).json({ error: 'Subject and message are required.' });
      const fd = Math.max(0, Math.min(30, parseInt(b.followupDays, 10) || 0));
      const fbody = String(b.followupBody || '').trim().slice(0, 8000);
      const people = (Array.isArray(b.recipients) ? b.recipients : []).slice(0, 2000);
      if (!people.length) return res.status(400).json({ error: 'No carriers selected.' });

      const ver = await verifyList(people.map((x) => x.email));
      const good = {}; ver.forEach((x) => { if (x.ok) good[x.email] = true; });
      const skips = new Set(((await sb('skip_list?user_id=eq.' + uid + '&select=email&limit=50000')) || []).map((x) => x.email));
      const unsubs = new Set(((await sb('unsubscribes?select=email&limit=100000')) || []).map((x) => x.email));
      const before = b.allowRepeat ? new Set() : new Set(((await sb('campaign_recipients?user_id=eq.' + uid + '&sent_at=not.is.null&select=email&limit=50000')) || []).map((x) => x.email));
      const sum = { queued: 0, invalid: 0, skipList: 0, unsubscribed: 0, alreadyEmailed: 0, duplicate: 0 };
      const seen = new Set(), rows = [];
      people.forEach((x) => {
        const e = String(x.email || '').trim().toLowerCase();
        if (!e) { sum.invalid++; return; }
        if (seen.has(e)) { sum.duplicate++; return; }
        seen.add(e);
        if (!good[e]) { sum.invalid++; return; }
        if (skips.has(e)) { sum.skipList++; return; }
        if (unsubs.has(e)) { sum.unsubscribed++; return; }
        if (before.has(e)) { sum.alreadyEmailed++; return; }
        rows.push({ dot_number: parseInt(x.dot, 10) || null, mc: String(x.mc || '').slice(0, 20), name: String(x.name || '').slice(0, 120), officer: String(x.officer || '').slice(0, 80), email: e });
      });
      if (!rows.length) return res.status(200).json({ ok: false, error: 'No emailable carriers left after checks.', summary: sum });
      const camp = (await sb('campaigns', { method: 'POST', headers: { Prefer: 'return=representation' }, body: { user_id: uid, name: String(b.name || 'Campaign ' + new Date().toISOString().slice(0, 10)).slice(0, 80), subject, body, followup_days: fd && fbody ? fd : 0, followup_subject: String(b.followupSubject || '').slice(0, 200), followup_body: fd && fbody ? fbody : '', status: 'active' } }))[0];
      const nowIso = iso(Date.now());
      for (let i = 0; i < rows.length; i += 500) {
        await sb('campaign_recipients', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: rows.slice(i, i + 500).map((r) => Object.assign({ campaign_id: camp.id, user_id: uid, status: 'queued', step: 0, next_at: nowIso }, r)) });
      }
      sum.queued = rows.length;
      return res.status(200).json({ ok: true, id: camp.id, summary: sum });
    }

    if (act === 'send') {
      if (!user.pro && !needPro()) return;
      if (!user.pro) return;
      const camp = (await sb('campaigns?id=eq.' + encodeURIComponent(b.id) + '&user_id=eq.' + uid + '&select=*'))[0];
      if (!camp) return res.status(404).json({ error: 'Campaign not found.' });
      const r = await sendDue(uid, camp, user.prof, user, 40);
      return res.status(200).json(r);
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Campaign request failed' });
  }
};
