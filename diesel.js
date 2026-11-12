// GET /api/diesel -> weekly US on-highway diesel prices from EIA (free). Needs env var EIA_API_KEY.
let cache = null;
const AREAS = ['NUS', 'R10', 'R20', 'R30', 'R40', 'R50'];
const NAMES = { NUS: 'U.S. average', R10: 'East Coast', R20: 'Midwest', R30: 'Gulf Coast', R40: 'Rocky Mountain', R50: 'West Coast' };

module.exports = async (req, res) => {
  const key = process.env.EIA_API_KEY;
  if (!key) return res.status(503).json({ error: 'Diesel prices are not set up yet (EIA_API_KEY missing on the server).' });
  if (cache && Date.now() - cache.t < 6 * 3600 * 1000) { res.setHeader('Cache-Control', 's-maxage=21600'); return res.status(200).json(cache.d); }
  try {
    const qs = ['api_key=' + encodeURIComponent(key), 'frequency=weekly', 'data[0]=value', 'facets[product][]=EPD2D']
      .concat(AREAS.map((a) => 'facets[duoarea][]=' + a))
      .concat(['sort[0][column]=period', 'sort[0][direction]=desc', 'length=60']).join('&');
    const r = await fetch('https://api.eia.gov/v2/petroleum/pri/gnd/data/?' + qs);
    if (!r.ok) throw new Error('EIA HTTP ' + r.status);
    const j = await r.json();
    const rows = (j.response && j.response.data) || [];
    const by = {};
    rows.forEach((x) => {
      if (x.series && !/^EMD_EPD2D_PTE_/.test(x.series)) return;
      const v = parseFloat(x.value); if (!Number.isFinite(v)) return;
      (by[x.duoarea] = by[x.duoarea] || []).push({ period: x.period, v });
    });
    const areas = AREAS.filter((a) => by[a] && by[a].length).map((a) => {
      const l = by[a]; // newest first
      return { area: a, name: NAMES[a], price: l[0].v, period: l[0].period, change: l[1] ? +(l[0].v - l[1].v).toFixed(3) : null };
    });
    if (!areas.length) throw new Error('No diesel rows returned');
    const d = { areas, source: 'U.S. EIA, weekly retail on-highway diesel ($/gal)' };
    cache = { t: Date.now(), d };
    res.setHeader('Cache-Control', 's-maxage=21600');
    return res.status(200).json(d);
  } catch (e) {
    return res.status(502).json({ error: 'Diesel lookup failed: ' + (e.message || e) });
  }
};
