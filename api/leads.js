// POST /api/leads { action, ... }
// Admin:  assign { userId, leads:[lead objects] }   -> copies leads into that member's own list (existing ones are kept)
// Owner:  team_list { member?, status?, q?, offset? } -> read-only view of everybody else's leads
const { sb, getUser } = require('./_mail');
const UUID = /^[0-9a-f-]{36}$/i;

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
    const isOwner = isMember && user.prof.is_owner === true;
    const team = async () => (await sb('profiles?approved=eq.true&select=*&limit=1000')) || [];

    if (act === 'assign') {
      if (!isAdmin) return res.status(403).json({ error: 'Admins only.' });
      const to = String(b.userId || '');
      if (!UUID.test(to)) return res.status(400).json({ error: 'Choose a member.' });
      const t = await team();
      const target = t.filter((x) => x.id === to)[0];
      if (!target) return res.status(400).json({ error: 'That user is not in your team.' });
      const now = new Date().toISOString();
      const rows = (Array.isArray(b.leads) ? b.leads : []).slice(0, 500).filter((l) => l && l.dot != null && l.dot !== '').map((l) => {
        const d = Object.assign({}, l); delete d.owner; delete d.ownerName;
        d.assignedBy = user.prof.name || user.email; d.assignedAt = now;
        return { user_id: to, dot: l.dot, data: d, updated_at: now };
      });
      if (!rows.length) return res.status(400).json({ error: 'No leads to assign.' });
      const ins = await sb('user_leads?on_conflict=user_id,dot', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: rows });
      const added = Array.isArray(ins) ? ins.length : 0;
      return res.status(200).json({ ok: true, added, skipped: rows.length - added, name: target.name || target.email });
    }

    if (act === 'team_list') {
      if (!isOwner) return res.status(403).json({ error: 'Only the owner can open Team Leads.' });
      const members = (await team()).filter((x) => x.id !== user.id).map((x) => ({ id: x.id, name: x.name || x.email, role: x.role || 'member' }));
      if (!members.length) return res.status(200).json({ members, rows: [], total: 0 });
      const byId = {}; members.forEach((m) => { byId[m.id] = m; });
      let q = 'user_leads?select=user_id,dot,data,updated_at&order=updated_at.desc&limit=200&offset=' + Math.max(0, parseInt(b.offset, 10) || 0);
      if (b.member && UUID.test(String(b.member)) && byId[b.member]) q += '&user_id=eq.' + b.member;
      else q += '&user_id=in.(' + members.map((m) => m.id).join(',') + ')';
      const st = String(b.status || '').replace(/[^\w \-]/g, '').slice(0, 30);
      if (st) q += '&' + encodeURIComponent('data->>status') + '=eq.' + encodeURIComponent(st);
      const term = String(b.q || '').replace(/[^\w .@\-]/g, '').trim().slice(0, 40);
      if (term) q += '&or=' + encodeURIComponent('(data->>name.ilike.*' + term + '*,data->>mc.ilike.*' + term + '*,data->>phone.ilike.*' + term + '*,data->>email.ilike.*' + term + '*)');
      const r = await sb(q, { raw: true, headers: { Prefer: 'count=exact' } });
      const rows = await r.json();
      const total = parseInt(String(r.headers.get('content-range') || '').split('/')[1], 10);
      return res.status(200).json({ members, total: isFinite(total) ? total : rows.length, rows: (rows || []).map((x) => ({ userId: x.user_id, member: (byId[x.user_id] || {}).name || '', dot: x.dot, data: x.data, updatedAt: x.updated_at })) });
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Leads request failed' });
  }
};
