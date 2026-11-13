// GET /api/track?r=<recipient id> -> 1x1 gif, counts an "open" (approximate: some mail apps block or pre-load images)
const { sb } = require('./_mail');
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
module.exports = async (req, res) => {
  const id = String((req.query && req.query.r) || '');
  try {
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      const rows = await sb('campaign_recipients?id=eq.' + id + '&select=open_count');
      if (rows && rows[0]) await sb('campaign_recipients?id=eq.' + id, { method: 'PATCH', body: { open_count: (rows[0].open_count || 0) + 1, opened_at: new Date().toISOString() } });
    }
  } catch (e) { /* ignore */ }
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).end(GIF);
};
