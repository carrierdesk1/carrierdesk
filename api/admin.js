// POST /api/admin { action:'delete_user', userId }  -> admin only. Deletes the login account and the user's data.
const { sb, getUser, SB_URL, SB_KEY } = require('./_mail');

// tables that have a user_id column (missing tables are ignored)
const USER_TABLES = ['campaign_recipients', 'campaigns', 'skip_list', 'issues', 'team_targets', 'activity_daily', 'user_leads'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const me = await getUser(req, res);
    if (!me) return;
    if (!(me.prof.role === 'admin' && me.prof.approved === true)) return res.status(403).json({ error: 'Admins only.' });
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    if (b.action !== 'delete_user') return res.status(400).json({ error: 'Unknown action.' });
    const id = String(b.userId || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Bad user id.' });
    if (id === me.id) return res.status(400).json({ error: 'You cannot delete your own account.' });

    const rows = await sb('profiles?id=eq.' + id + '&select=id,role,approved,email');
    const target = rows && rows[0];
    if (target && target.role === 'admin' && target.approved) return res.status(400).json({ error: 'This user is an admin. Make them a member first, then delete.' });

    // 1) user data
    const failed = [];
    for (const t of USER_TABLES) {
      try { await sb(t + '?user_id=eq.' + id, { method: 'DELETE' }); } catch (e) { if (!/42P01|404|does not exist/i.test(e.message)) failed.push(t); }
    }
    try { await sb('team_leads?owner=eq.' + id, { method: 'DELETE' }); } catch (e) { /* table or column missing */ }
    // 2) login account
    const key = SB_KEY();
    const r = await fetch(SB_URL() + '/auth/v1/admin/users/' + id, { method: 'DELETE', headers: { apikey: key, Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(15000) });
    if (!r.ok && r.status !== 404) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Could not delete the login account (' + r.status + '). ' + t.slice(0, 150) });
    }
    // 3) profile row (may already be gone if the database cascades)
    try { await sb('profiles?id=eq.' + id, { method: 'DELETE' }); } catch (e) { failed.push('profiles'); }
    return res.status(200).json({ ok: true, failed });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Admin request failed' });
  }
};
