// GET/POST /api/unsub?r=<recipient id>  -> adds the address to the global unsubscribe list
const { sb, esc } = require('./_mail');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String((req.query && req.query.r) || '');
  let email = '';
  try {
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      const rows = await sb('campaign_recipients?id=eq.' + id + '&select=email');
      email = rows && rows[0] ? rows[0].email : '';
      if (email) {
        await sb('unsubscribes?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: { email } });
        await sb('campaign_recipients?email=eq.' + encodeURIComponent(email) + '&status=eq.queued', { method: 'PATCH', body: { status: 'unsub' } });
      }
    }
  } catch (e) { /* show the page anyway */ }
  if (req.method === 'POST') return res.status(200).end('ok');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).end('<!DOCTYPE html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px Arial;max-width:480px;margin:60px auto;padding:0 20px;color:#0f172a"><h2>' + (email ? 'You are unsubscribed' : 'Link not valid') + '</h2><p>' + (email ? esc(email) + ' will not receive any more emails from us.' : 'This unsubscribe link is not valid or has expired.') + '</p></body>');
};
