// GET /api/refresh-census  -> pulls NEW / UPDATED carriers from the FMCSA Company Census File
// (data.transportation.gov, dataset az4n-8mr2) and upserts them into your Supabase "census" table.
// Runs daily by Vercel Cron (see vercel.json). Manual run: /api/refresh-census?key=YOUR_CRON_SECRET
// Optional: &days=10 (how far back to look, default: 3 days before the newest add_date you have)
// Needs in Vercel: SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET. Optional: SOCRATA_APP_TOKEN.
const CENSUS = 'https://data.transportation.gov/resource/az4n-8mr2.json';
const PAGE = 1000;
const MAX_PAGES = 12;          // up to 12,000 rows per run
const BATCH = 400;             // rows per Supabase request

const SB_URL = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = () => String(process.env.SUPABASE_SERVICE_KEY || '').replace(/["'\s]/g, '');
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
let tokenBad = false;
const cleanToken = () => String(process.env.SOCRATA_APP_TOKEN || '').replace(/["'\s]/g, '');
const socHeaders = () => Object.assign({ 'User-Agent': 'CarrierDesk/1.0', Accept: 'application/json' }, cleanToken() && !tokenBad ? { 'X-App-Token': cleanToken() } : {});

const isoDay = (v) => {
  const t = String(v || '').trim();
  if (/^\d{8}$/.test(t)) return t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6, 8);
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : '';
};
const n = (v) => parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10) || 0;
const clean = (v) => { const s = String(v == null ? '' : v).trim(); return s || null; };

const CARGO_LBL = { crgo_genfreight: 'General Freight', crgo_household: 'Household Goods', crgo_metalsheet: 'Metal Sheets/Coils', crgo_motoveh: 'Motor Vehicles', crgo_drivetow: 'Drive/Tow Away', crgo_logpole: 'Logs/Poles/Lumber', crgo_bldgmat: 'Building Materials', crgo_mobilehome: 'Mobile Homes', crgo_machlrg: 'Machinery/Large Objects', crgo_produce: 'Fresh Produce', crgo_liqgas: 'Liquids/Gases', crgo_intermodal: 'Intermodal', crgo_passengers: 'Passengers', crgo_oilfield: 'Oilfield Equipment', crgo_livestock: 'Livestock', crgo_grainfeed: 'Grain/Feed', crgo_coalcoke: 'Coal/Coke', crgo_meat: 'Meat', crgo_garbage: 'Garbage/Refuse', crgo_usmail: 'US Mail', crgo_chem: 'Chemicals', crgo_drybulk: 'Commodities Dry Bulk', crgo_coldfood: 'Refrigerated Food', crgo_beverages: 'Beverages', crgo_paperprod: 'Paper Products', crgo_utility: 'Utilities', crgo_farmsupp: 'Farm Supplies', crgo_construct: 'Construction', crgo_waterwell: 'Water Well', crgo_cargoothr: 'Other' };
const cargoOf = (r) => Object.keys(CARGO_LBL).filter((k) => r[k] != null && String(r[k]).trim() !== '').map((k) => CARGO_LBL[k]);

// !!! GUESSED RULES: change these to match how you classified equipment when you first imported the table !!!
function equipmentOf(tractors, trucks, trailers, units, cargo) {
  if (cargo.indexOf('Machinery/Large Objects') !== -1 || cargo.indexOf('Metal Sheets/Coils') !== -1 || cargo.indexOf('Logs/Poles/Lumber') !== -1) return 'Big Equipment';
  if (units >= 2) return 'Multi Trucks';
  if (tractors > 0 && trailers === 0) return 'Power Only';
  if (trucks > 0 && tractors === 0) return 'Box Truck';
  return 'Unknown';
}

function shapeRow(r) {
  const mcPrefixOk = (i) => !r['docket' + i + 'prefix'] || /^MC$/i.test(String(r['docket' + i + 'prefix']).trim());
  let mc = null;
  [1, 2, 3].forEach((i) => { if (mc == null && r['docket' + i] && mcPrefixOk(i)) { const d = n(r['docket' + i]); if (d) mc = d; } });
  const tractors = n(r.owntract) + n(r.trmtract) + n(r.trptract);
  const trucks = n(r.owntruck) + n(r.trmtruck) + n(r.trptruck);
  const trailers = n(r.owntrail) + n(r.trmtrail) + n(r.trptrail);
  const units = n(r.power_units) || tractors + trucks;
  const cargo = cargoOf(r);
  return {
    dot_number: n(r.dot_number),
    legal_name: clean(r.legal_name),
    dba_name: clean(r.dba_name),
    phone: clean(r.phone || r.telephone),
    cell_phone: clean(r.cell_phone),
    email: clean(String(r.email_address || '').toLowerCase()),
    officer: clean(r.company_officer_1),
    power_units: units,
    drivers: n(r.total_drivers),
    tractors: tractors,
    trucks: trucks,
    trailers: trailers,
    cargo: cargo,
    city: clean(r.phy_city),
    state: clean(r.phy_state),
    add_date: isoDay(r.add_date) || null,
    mc_n: mc,
    _equip: equipmentOf(tractors, trucks, trailers, units, cargo)
  };
}

async function soc(params) {
  const qs = Object.keys(params).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  let r;
  for (let i = 0; i < 4; i++) {
    try { r = await fetch(CENSUS + '?' + qs, { headers: socHeaders(), signal: AbortSignal.timeout(20000) }); }
    catch (e) { if (i < 3) { await wait(800); continue; } throw new Error('Census server timeout'); }
    if (r.status === 403 && !tokenBad && cleanToken()) { tokenBad = true; i--; continue; }
    if (r.status !== 429 && r.status < 500) break;
    await wait(Math.min(1500 * Math.pow(2, i), 8000));
  }
  if (!r.ok) throw new Error('Census API status ' + r.status);
  return r.json();
}

async function sb(path, opts) {
  const key = SB_KEY(), o = opts || {};
  const r = await fetch(SB_URL() + '/rest/v1/' + path, {
    method: o.method || 'GET',
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, o.headers || {}),
    body: o.body,
    signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Supabase ' + r.status + ': ' + t.slice(0, 200)); }
  return r;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET is not set in Vercel.' });
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (bearer !== secret && String(req.query.key || '') !== secret) return res.status(401).json({ error: 'Unauthorized' });
  if (!SB_URL() || !SB_KEY()) return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY are not set.' });

  const started = Date.now();
  try {
    // 1) cutoff date: a few days before the newest add_date we already have (FMCSA backfills late)
    let cutoff;
    const days = parseInt(req.query.days, 10);
    if (days > 0) cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    else {
      const lr = await sb('census?select=add_date&add_date=not.is.null&order=add_date.desc&limit=1');
      const lrows = await lr.json();
      const latest = lrows && lrows[0] ? String(lrows[0].add_date).slice(0, 10) : '';
      cutoff = latest ? new Date(Date.parse(latest + 'T00:00:00Z') - 3 * 86400000).toISOString().slice(0, 10)
                      : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    }

    // 2) read the census file newest-first until we pass the cutoff
    const fresh = [];
    let pages = 0, reachedCutoff = false;
    for (let p = 0; p < MAX_PAGES && !reachedCutoff; p++) {
      if (Date.now() - started > 40000) break;
      const rows = await soc({ $order: 'add_date DESC', $limit: PAGE, $offset: p * PAGE });
      pages++;
      if (!rows.length) break;
      for (const r of rows) {
        const d = isoDay(r.add_date);
        if (d && d < cutoff) { reachedCutoff = true; continue; }
        if (n(r.dot_number)) fresh.push(shapeRow(r));
      }
    }
    // de-duplicate by DOT
    const byDot = {};
    fresh.forEach((x) => { byDot[x.dot_number] = x; });
    const all = Object.keys(byDot).map((k) => byDot[k]);

    // 3) upsert: NEW carriers get an equipment guess; EXISTING ones keep their equipment/safety/crashes
    let added = 0, updated = 0;
    for (let i = 0; i < all.length; i += BATCH) {
      const chunk = all.slice(i, i + BATCH);
      const er = await sb('census?select=dot_number&dot_number=in.(' + chunk.map((x) => x.dot_number).join(',') + ')');
      const have = {};
      (await er.json()).forEach((x) => { have[x.dot_number] = true; });
      const strip = (x) => { const o = Object.assign({}, x); delete o._equip; return o; };
      const newRows = chunk.filter((x) => !have[x.dot_number]).map((x) => Object.assign(strip(x), { equipment: x._equip }));
      const oldRows = chunk.filter((x) => have[x.dot_number]).map(strip);
      const hdr = { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
      if (newRows.length) { await sb('census?on_conflict=dot_number', { method: 'POST', headers: hdr, body: JSON.stringify(newRows) }); added += newRows.length; }
      if (oldRows.length) { await sb('census?on_conflict=dot_number', { method: 'POST', headers: hdr, body: JSON.stringify(oldRows) }); updated += oldRows.length; }
    }

    const dates = all.map((x) => x.add_date).filter(Boolean).sort();
    const withMc = all.filter((x) => x.mc_n).length;
    return res.status(200).json({ ok: true, newestAddDate: dates[dates.length - 1] || null, oldestAddDate: dates[0] || null, withMc, cutoff, pagesRead: pages, reachedCutoff, checked: all.length, added, updated, ms: Date.now() - started });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e.message || String(e), ms: Date.now() - started });
  }
};
