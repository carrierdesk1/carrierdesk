// Bulk carrier search from the FMCSA Company Census File (free, no key).
// GET /api/bulk?mode=mc&from=500000&to=505000
// GET /api/bulk?mode=date&from=2026-11-05&to=2026-11-10
// Optional: min, max (power units), equip=Big Equipment|Power Only|Box Truck|Multi Trucks,
//           cargo=General Freight|Household Goods, match=any|all, auth=active|inactive, offset
// Debug:    /api/bulk?debug=1
const DATASET = 'az4n-8mr2';
const CENSUS = 'https://data.transportation.gov/resource/' + DATASET + '.json';
const META = 'https://data.transportation.gov/api/views/' + DATASET + '.json';
const PAGE = 1000;
const FREE_ROWS = 25;

const CARGO = {
  'General Freight': 'genfreight',
  'Household Goods': 'house',
  'Metal Sheets/Coils': 'metalsheet',
  'Motor Vehicles': 'motoveh',
  'Drive/Tow Away': 'drivetow',
  'Logs/Poles/Lumber': 'logpole',
  'Building Materials': 'bldgmat',
  'Machinery/Large Objects': 'machlrg',
  'Refrigerated Food': 'coldfood',
  'Beverages': 'beverage',
  'Paper Products': 'paperprod',
  'Construction': 'construct',
  'Intermodal': 'intermodal',
  'Oilfield Equipment': 'oilfield'
};

let keyCache = null;

// Optional: a free Socrata app token (set SOCRATA_APP_TOKEN in Vercel) avoids throttling.
let tokenBad = false; // set when Socrata rejects the token, then we continue without it
const cleanToken = () => String(process.env.SOCRATA_APP_TOKEN || '').replace(/["'\s]/g, '');
const tokenHeaders = () => {
  const t = cleanToken();
  return t && !tokenBad ? { 'X-App-Token': t } : {};
};

const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const qsOf = (params) => Object.keys(params)
  .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
  .join('&');

// At most 2 Socrata requests at the same time per function instance (keeps us under the rate limit)
let gateActive = 0;
const gateQ = [];
function gate(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      gateActive++;
      fn().then(resolve, reject).finally(() => {
        gateActive--;
        const nx = gateQ.shift();
        if (nx) nx();
      });
    };
    if (gateActive < 2) run(); else gateQ.push(run);
  });
}

// After a 429 every request in this instance waits (shared cool-down)
let coolUntil = 0;
async function socrata(url, ms, tries, label) {
  const max = tries || 4;
  const deadline = Date.now() + 22000; // give up fast: the page retries and shows progress itself
  let r;
  for (let i = 0; i < max; i++) {
    const cool = coolUntil - Date.now();
    if (cool > 0) await wait(Math.min(cool, 6000));
    try {
      r = await fetch(url, { signal: AbortSignal.timeout(Math.max(3000, Math.min(ms || 20000, deadline - Date.now()))), headers: tokenHeaders() });
    } catch (e) {
      // Socrata is slow on the first try (cold cache): the retry is usually much faster
      if (i < max - 1 && Date.now() < deadline) { await wait(300); continue; }
      throw new Error('Census server is slow right now (timeout). Please press Fetch again.');
    }
    if (r.status === 403 && !tokenBad && cleanToken()) { tokenBad = true; i--; continue; } // bad token: retry without it
    if (r.status !== 429 && r.status < 500) break;
    let pause = 600 * (i + 1) + Math.random() * 400;
    if (r.status === 429) {
      // exponential back-off: ~2s, 4s, 8s, 8s ... (or whatever Socrata asks for in Retry-After)
      const ra = Number(r.headers.get('retry-after'));
      pause = Math.min(ra > 0 ? ra * 1000 : 1500 * Math.pow(2, i) + Math.random() * 500, 6000);
      coolUntil = Date.now() + pause;
    }
    if (i < max - 1) {
      if (Date.now() + pause > deadline) break;
      await wait(pause);
    }
  }
  if (!r.ok) {
    if (r.status === 429) {
      throw new Error('Census server is busy (429 too many requests). Please wait about 30 seconds and press Fetch again.' + (cleanToken() ? '' : ' Tip: add SOCRATA_APP_TOKEN in Vercel to avoid this.'));
    }
    const t = await r.text().catch(() => '');
    throw new Error((label || 'Census') + ' API status ' + r.status + (t ? ': ' + t.slice(0, 200) : ''));
  }
  return r.json();
}

const soda = (params, ms, tries) => gate(() => socrata(CENSUS + '?' + qsOf(params), ms, tries, 'Census'));

// SODA JSON leaves out null fields, so read the full column list from the dataset metadata.
async function getKeys() {
  if (keyCache && keyCache.length) return keyCache;
  let keys = [];
  try {
    const r = await fetch(META, { signal: AbortSignal.timeout(6000), headers: tokenHeaders() });
    if (r.ok) {
      const m = await r.json();
      keys = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
    }
  } catch (e) { /* fall back to sampling */ }
  if (!keys.length) {
    const set = {};
    const batches = await Promise.all([
      soda({ $limit: 200 }).catch(() => []),
      soda({ $limit: 200, $where: 'docket1 IS NOT NULL' }).catch(() => [])
    ]);
    batches.forEach((rows) => rows.forEach((row) => Object.keys(row).forEach((k) => { set[k] = 1; })));
    keys = Object.keys(set);
  }
  keyCache = keys;
  return keys;
}

const yes = (v) => v != null && String(v).trim() !== '' && !/^(n|no|false|0)$/i.test(String(v).trim());
const num = (v) => Number(String(v == null ? 0 : v).replace(/[^0-9.]/g, '')) || 0;
const day = (v) => (v ? String(v).slice(0, 10) : '');
const fmtPhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(v || '');
};
const nextDay = (iso) => new Date(Date.parse(iso + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);

// ---- Login check via Supabase ----
// Returns the user, true (login not configured yet, so open), or null (a 401 was already sent).
const apCache = {};
async function requireUser(req, res) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!base || !anon) return true;
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) { res.status(401).json({ error: 'Please log in first.' }); return null; }
  try {
    const r = await fetch(base + '/auth/v1/user', {
      headers: { apikey: anon, Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) { res.status(401).json({ error: 'Session expired. Please log in again.' }); return null; }
    const u = await r.json();
    // Plan: team members and paid (not expired) users are Pro; everyone else is on the Free plan.
    let hit = apCache[u.id];
    if (!hit || Date.now() - hit.t > 60000) {
      let pro = true;
      try {
        const pr = await fetch(base + '/rest/v1/profiles?id=eq.' + encodeURIComponent(u.id) + '&select=approved,plan,plan_expires', {
          headers: { apikey: anon, Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(6000)
        });
        if (pr.ok) {
          const rows = await pr.json();
          if (rows.length) { const pf = rows[0]; pro = pf.approved === true || (pf.plan === 'paid' && !!pf.plan_expires && Date.parse(pf.plan_expires) > Date.now()); }
        }
      } catch (e) { /* profiles not set up: allow */ }
      hit = apCache[u.id] = { pro: pro, t: Date.now() };
    }
    u._pro = hit.pro;
    return u;
  } catch (e) {
    res.status(502).json({ error: 'Login check failed: ' + (e.message || e) });
    return null;
  }
}

// ---- Authority status (Active / Inactive) from FMCSA "Motus Carrier - All With History" ----
const MOTUS = 'https://data.transportation.gov/resource/inys-ebih.json';
const MOTUS_META = 'https://data.transportation.gov/api/views/inys-ebih.json';
let motusKeyCache = null;
const authCache = {}; // dot -> { t, rows }

const sodaAt = (base, params, ms, tries) => gate(() => socrata(base + '?' + qsOf(params), ms, tries || 3, 'Motus'));

async function getMotusKeys() {
  if (motusKeyCache && motusKeyCache.length) return motusKeyCache;
  try {
    const r = await fetch(MOTUS_META, { signal: AbortSignal.timeout(5000), headers: tokenHeaders() });
    if (r.ok) {
      const m = await r.json();
      const k = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
      if (k.length) motusKeyCache = k;
    }
  } catch (e) { /* ignore */ }
  return motusKeyCache || [];
}

// ---- Insurance (FMCSA "Insur - Active/Pending Insurance") ----
const INS = 'https://data.transportation.gov/resource/chgs-tx6x.json';
const INS_META = 'https://data.transportation.gov/api/views/chgs-tx6x.json';
let insKeyCache = null;
async function getInsKeys() {
  if (insKeyCache && insKeyCache.length) return insKeyCache;
  try {
    const r = await fetch(INS_META, { signal: AbortSignal.timeout(5000), headers: tokenHeaders() });
    if (r.ok) {
      const m = await r.json();
      const k = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
      if (k.length) insKeyCache = k;
    }
  } catch (e) { /* ignore */ }
  return insKeyCache || [];
}

const stripZeros = (v) => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');

// Returns { dot: {s:'On File'|'None'|'Unknown', amt:<thousands of $>} } or null when the data could not be used.
async function loadInsurance(pairs, warnings) {
  const keys = await getInsKeys();
  const dockCol = keys.find((k) => /^docket(_number)?$/i.test(k)) || keys.find((k) => /docket/i.test(k)) || '';
  const dotCol = keys.find((k) => /^(usdot|us_dot|dot)(_number)?$/i.test(k)) || '';
  const typeCol = keys.find((k) => /ins.*type|type.*desc|ins_class|mod_col/i.test(k)) || '';
  const amtCol = keys.find((k) => /max_cov/i.test(k)) || '';
  const useDock = !!dockCol;
  const col = useDock ? dockCol : dotCol;
  if (!col) { warnings.push('Insurance columns not found, insurance not shown. Open /api/bulk?debug=1.'); return null; }
  const vals = [];
  pairs.forEach((p) => {
    if (useDock) { if (p.mc) { vals.push("'MC" + p.mc + "'"); vals.push("'" + p.mc + "'"); } }
    else { const d = stripZeros(p.dot); if (d) { vals.push("'" + d + "'"); vals.push("'" + d.padStart(8, '0') + "'"); } }
  });
  if (!vals.length) return null;
  const select = [col, typeCol, amtCol].filter(Boolean).join(',');
  let rows;
  try {
    rows = await sodaAt(INS, { $select: select, $where: col + ' in (' + vals.join(',') + ')', $limit: 20000 }, 8000);
  } catch (e) { warnings.push('Insurance lookup failed (' + (e.message || e) + ').'); return null; }
  if (!rows.length) { warnings.push('Insurance data returned nothing for these carriers, so insurance is shown as Unknown. Open /api/bulk?debug=1.'); return null; }
  const m = {};
  rows.forEach((r) => { const k = stripZeros(r[col]); if (k) (m[k] = m[k] || []).push(r); });
  const isBipd = (r) => /bipd|primary|liab/i.test(String(r[typeCol] || ''));
  const useType = !!typeCol && rows.some(isBipd);
  const out = {};
  pairs.forEach((p) => {
    const key = useDock ? stripZeros(p.mc) : stripZeros(p.dot);
    if (!key) { out[p.dot] = { s: 'Unknown', amt: 0 }; return; }
    let list = m[key] || [];
    if (useType) list = list.filter(isBipd);
    const amt = list.reduce((mx, r) => Math.max(mx, amtCol ? num(r[amtCol]) : 0), 0);
    out[p.dot] = { s: list.length ? 'On File' : 'None', amt: amt };
  });
  return out;
}

async function loadAuthority(dots, warnings) {
  const out = { ok: false, map: {}, statusCol: '', typeCol: '' };
  if (!dots.length) return out;
  const keys = await getMotusKeys();
  const dotCol = ['usdot_number', 'dot_number'].find((k) => keys.indexOf(k) !== -1);
  out.statusCol = keys.indexOf('op_auth_status') !== -1 ? 'op_auth_status' : (keys.find((k) => /auth.*stat/i.test(k)) || '');
  out.typeCol = keys.indexOf('op_auth_type') !== -1 ? 'op_auth_type' : (keys.find((k) => /auth.*type/i.test(k)) || '');
  if (!dotCol || !out.statusCol) {
    warnings.push('Authority columns not found in Motus Carrier dataset, so authority is not shown. Open /api/bulk?debug=1.');
    return out;
  }
  const select = [dotCol, 'docket_number', out.typeCol, out.statusCol].filter((k) => k && keys.indexOf(k) !== -1).join(',');
  const uniq = Array.from(new Set(dots.map(stripZeros).filter(Boolean)));
  const now = Date.now();
  const need = [];
  uniq.forEach((d) => {
    const hit = authCache[d];
    if (hit && now - hit.t < 10 * 60 * 1000) out.map[d] = hit.rows;
    else need.push(d);
  });
  const groups = [];
  for (let i = 0; i < need.length; i += 120) groups.push(need.slice(i, i + 120));
  try {
    const results = await Promise.all(groups.map((g) => {
      const vals = [];
      g.forEach((d) => { vals.push("'" + d + "'"); vals.push("'" + d.padStart(8, '0') + "'"); });
      return sodaAt(MOTUS, { $select: select, $where: dotCol + ' in (' + vals.join(',') + ')', $limit: 5000 }, 8000);
    }));
    const fresh = {};
    results.forEach((rows) => rows.forEach((r) => {
      const k = stripZeros(r[dotCol]);
      if (!k) return;
      (fresh[k] = fresh[k] || []).push(r);
    }));
    Object.keys(fresh).forEach((k) => {
      out.map[k] = fresh[k];
      if (Object.keys(authCache).length > 5000) { for (const x in authCache) delete authCache[x]; }
      authCache[k] = { t: now, rows: fresh[k] };
    });
    out.ok = Object.keys(out.map).length > 0;
    if (!out.ok) warnings.push('No authority rows found in Motus Carrier dataset for these carriers, authority not shown.');
  } catch (e) {
    warnings.push('Authority lookup failed (' + (e.message || e) + '), authority not shown.');
  }
  return out;
}

function statusOf(list, mcDigits, statusCol, typeCol) {
  let rows = list;
  if (mcDigits) {
    const m = list.filter((r) => stripZeros(r.docket_number) === mcDigits);
    if (m.length) rows = m;
  }
  if (typeCol) {
    const carr = rows.filter((r) => !/broker|forwarder/i.test(String(r[typeCol] || '')));
    if (carr.length) rows = carr;
  }
  let a = false, p = false, i = false;
  rows.forEach((r) => {
    const s = String(r[statusCol] || '');
    if (/inactive|revok|cancel|terminat|dismiss|withdraw|expire/i.test(s)) i = true;
    else if (/active|grant/i.test(s)) a = true;
    else if (/pend/i.test(s)) p = true;
  });
  return a ? 'Active' : p ? 'Pending' : i ? 'Inactive' : 'Unknown';
}

// Equipment label worked out from the fleet counts in the Census file
function equipmentOf(tractors, trucks, trailers, units) {
  if (tractors > 0 && trailers > 0) return 'Big Equipment';
  if (tractors > 0) return 'Power Only';
  if (trucks > 1) return 'Multi Trucks';
  if (trucks === 1) return 'Box Truck';
  if (units > 1) return 'Multi Trucks';
  if (units === 1) return 'Box Truck';
  return 'Unknown';
}

module.exports = async (req, res) => {
  try {
    // Quick health check: open /api/bulk?mode=ping in the browser to see if Socrata is throttling us
    if (req.query.mode === 'ping') {
      const t0 = cleanToken();
      const probe = async (headers, q) => {
        const st = Date.now();
        try {
          const r = await fetch(CENSUS + '?' + q, { headers: headers, signal: AbortSignal.timeout(15000) });
          const body = (await r.text()).slice(0, 120);
          return { status: r.status, ms: Date.now() - st, body: r.ok ? 'ok' : body };
        } catch (e) { return { error: String(e && e.message), ms: Date.now() - st }; }
      };
      const out = {
        tokenSet: !!t,
        tokenLength: t.length,
        withToken: t ? await probe({ 'X-App-Token': t }, '$limit=1&$select=dot_number') : 'no token set in Vercel',
        withoutToken: await probe({}, '$limit=1&$select=dot_number'),
        dateQuery: await probe(t ? { 'X-App-Token': t } : {}, '$limit=5&$select=dot_number&$order=add_date&$where=' + encodeURIComponent("status_code='A' AND add_date >= '" + new Date().toISOString().slice(0, 8) + "01'"))
      };
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(out);
    }

    // Authority is looked up separately and in the background, so the carrier list shows up right away.
    if (req.query.mode === 'auth') {
      const who0 = await requireUser(req, res);
      if (who0 === null) return;
      const pairs = String(req.query.pairs || '').split(',').filter(Boolean).slice(0, 300).map((p) => {
        const a = p.split(':');
        return { dot: a[0], mc: (a[1] || '').replace(/\D/g, '') };
      });
      const warn0 = [];
      const au0 = await loadAuthority(pairs.map((p) => p.dot), warn0);
      const out0 = {};
      pairs.forEach((p) => {
        const list = au0.ok ? (au0.map[stripZeros(p.dot)] || []) : [];
        let status = 'Unknown', mc = '';
        if (list.length) {
          status = statusOf(list, stripZeros(p.mc), au0.statusCol, au0.typeCol);
          if (!p.mc) {
            const d = list.find((x) => /^MC/i.test(String(x.docket_number || '')));
            if (d) mc = String(d.docket_number).toUpperCase();
          }
        }
        out0[p.dot] = { status: status, mc: mc };
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ auth: out0, warnings: warn0 });
    }

    if (req.query.mode === 'ins') {
      const who1 = await requireUser(req, res);
      if (who1 === null) return;
      const pairs1 = String(req.query.pairs || '').split(',').filter(Boolean).slice(0, 200).map((p) => {
        const a = p.split(':');
        return { dot: a[0], mc: (a[1] || '').replace(/\D/g, '') };
      });
      if (!(who1 === true || who1._pro)) {
        const o1 = {};
        pairs1.forEach((p) => { o1[p.dot] = { s: 'Unknown', amt: 0 }; });
        return res.status(200).json({ ins: o1, warnings: ['Insurance check is a Pro feature.'] });
      }
      const warn1 = [];
      const ins1 = await loadInsurance(pairs1, warn1);
      const out1 = {};
      pairs1.forEach((p) => { out1[p.dot] = (ins1 && ins1[p.dot]) || { s: 'Unknown', amt: 0 }; });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ins: out1, warnings: warn1 });
    }

    // Newest add_date in the Census file (used by the New carriers button and alerts)
    if (req.query.mode === 'latest') {
      const who3 = await requireUser(req, res);
      if (who3 === null) return;
      const lr = await soda({ $select: 'max(add_date)' }).catch(() => []);
      const lv = lr && lr[0] ? Object.values(lr[0])[0] : '';
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ latest: day(lv) });
    }

    const keys = await getKeys();
    const has = (k) => keys.indexOf(k) !== -1;

    if (req.query.debug) {
      const sample = await soda({ $limit: 1, $where: 'email_address IS NOT NULL' }).catch(() => []);
      const motusColumns = await getMotusKeys();
      const motusSample = await sodaAt(MOTUS, { $limit: 2 }, 6000).catch((e) => String(e.message || e));
      return res.status(200).json({ columnCount: keys.length, columns: keys, sample: sample[0] || null, motusColumns: motusColumns, motusSample: motusSample, insColumns: await getInsKeys(), insSample: await sodaAt(INS, { $limit: 2 }, 6000).catch((e) => String(e.message || e)) });
    }

    // Login check (only enforced once SUPABASE_URL and SUPABASE_ANON_KEY are set in Vercel)
    const who = await requireUser(req, res);
    if (who === null) return;
    const isPro = who === true || !!who._pro;

    const mode = String(req.query.mode || 'mc');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const warnings = [];
    const stList = String(req.query.state || '').toUpperCase().split(/[^A-Z]+/).filter((x) => x.length === 2);
    const cityQ = String(req.query.city || '').toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim();
    const needEmail = req.query.hasemail === '1';
    const needPhone = req.query.hasphone === '1';

    let f = '', t = '';
    let order = 'dot_number';

    function buildWhere(useLen) {
      const where = [];
      if (has('status_code')) where.push("status_code='A'");
      if (mode === 'mc') {
        const parts = [];
        [1, 2, 3].forEach((n) => {
          const nk = 'docket' + n;
          if (!has(nk)) return;
          const pk = nk + 'prefix';
          parts.push('(' + (has(pk) ? pk + "='MC' AND " : '') + nk + " >= '" + f + "' AND " + nk + " <= '" + t + "'" +
            (useLen ? ' AND ' + nk + " like '" + '_'.repeat(f.length) + "'" : '') + ')');
        });
        where.push('(' + parts.join(' OR ') + ')');
      } else {
        where.push("add_date >= '" + from + "' AND add_date < '" + nextDay(to) + "'");
        // Carriers without an MC number have no operating authority: skip them (far fewer rows to scan and check)
        if (req.query.onlymc === '1' && has('docket1')) {
          const mcs = [1, 2, 3].filter((n) => has('docket' + n) && has('docket' + n + 'prefix')).map((n) => "docket" + n + "prefix='MC'");
          where.push(mcs.length ? '(' + mcs.join(' OR ') + ')' : 'docket1 IS NOT NULL');
        }
      }
      if (stList.length && has('phy_state')) where.push('phy_state in (' + stList.map((x) => "'" + x + "'").join(',') + ')');
      if (cityQ && has('phy_city')) where.push("upper(phy_city) like '%" + cityQ + "%'");
      if (needEmail && has('email_address')) where.push('email_address IS NOT NULL');
      if (needPhone && has('phone')) where.push(has('cell_phone') ? '(phone IS NOT NULL OR cell_phone IS NOT NULL)' : 'phone IS NOT NULL');
      return where.join(' AND ');
    }

    if (mode === 'mc') {
      f = from.replace(/\D/g, '');
      t = to.replace(/\D/g, '');
      if (!f || !t) return res.status(400).json({ error: 'Enter both From and To MC numbers' });
      if (f.length !== t.length) return res.status(400).json({ error: 'From and To must have the same number of digits (e.g. 500000 to 505000)' });
      if (t < f) return res.status(400).json({ error: 'To must be bigger than From' });
      if (!has('docket1')) return res.status(500).json({ error: 'No docket (MC) column in Census file. Open /api/bulk?debug=1' });
      order = 'docket1,dot_number';
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Use YYYY-MM-DD dates' });
      }
      if (!has('add_date')) return res.status(500).json({ error: 'No add_date column in Census file' });
      order = 'add_date,dot_number';
    }

    // Only ask Census for the columns we actually use: far smaller download, much faster.
    const sel = keys.filter((k) =>
      /^(dot_number|legal_name|dba_name|phone|cell_phone|email_address|company_officer_1|power_units|total_drivers|phy_city|phy_state|add_date|status_code|docket[123](prefix)?)$/.test(k) ||
      /^(crgo|cargo)/i.test(k) || /^(own|trm|trp)(tract|truck|trail)/i.test(k) || /(safety.*rating|^rating$|crash)/i.test(k)
    ).join(',');
    async function getPage(where, off) {
      const p = { $where: where, $order: order, $limit: PAGE, $offset: off };
      if (sel) p.$select = sel;
      try { return await soda(p); }
      catch (e) { if (!sel) throw e; delete p.$select; return await soda(p); }
    }
    async function getCount(where) {
      try {
        const r = await soda({ $select: 'count(*)', $where: where }, 12000, 1);
        const n = parseInt(r && r[0] ? Object.values(r[0])[0] : '', 10);
        return isFinite(n) ? n : null;
      } catch (e) { return null; }
    }

    // On the first request also ask how many records match in total, so the page can fetch all the rest in parallel.
    let raw, total = null, plain = req.query.plain === '1' || mode !== 'mc';
    if (!plain) {
      // MC mode: ask Census for exact-length MCs only; if that filter is not accepted, fall back to plain.
      const wLen = buildWhere(true);
      try {
        const jobs = [getPage(wLen, offset)];
        if (offset === 0) jobs.push(getCount(wLen));
        const out = await Promise.all(jobs);
        raw = out[0];
        total = out.length > 1 ? out[1] : null;
        if (!raw.length && offset === 0) plain = true;
      } catch (e) { plain = true; }
    }
    if (plain) {
      const wPlain = buildWhere(false);
      const jobs = [getPage(wPlain, offset)];
      if (offset === 0) jobs.push(getCount(wPlain));
      const out = await Promise.all(jobs);
      raw = out[0];
      total = out.length > 1 ? out[1] : null;
    }

    // Post filters
    const minUnits = parseInt(req.query.min, 10) || 0;
    const maxUnits = parseInt(req.query.max, 10) || 0;
    const equipWanted = String(req.query.equip || '').split('|').filter(Boolean);
    const wanted = String(req.query.cargo || '').split('|').filter(Boolean);
    const match = req.query.match === 'all' ? 'all' : 'any';

    const cargoKeys = keys.filter((k) => /^(crgo|cargo)/i.test(k));
    const cargoCol = {};
    Object.keys(CARGO).forEach((label) => {
      const k = cargoKeys.find((x) => x.toLowerCase().indexOf(CARGO[label]) !== -1);
      if (k) cargoCol[label] = k;
    });
    wanted.forEach((w) => {
      if (!cargoCol[w]) warnings.push('Cargo "' + w + '" not found in Census, filter ignored.');
    });
    const wantedOk = wanted.filter((w) => cargoCol[w]);

    const tractKeys = keys.filter((k) => /^(own|trm|trp)tract/i.test(k));
    const truckKeys = keys.filter((k) => /^(own|trm|trp)truck/i.test(k));
    const trailKeys = keys.filter((k) => /^(own|trm|trp)trail/i.test(k));
    if (equipWanted.length && !tractKeys.length && !truckKeys.length) {
      warnings.push('Fleet breakdown not found in Census, equipment filter ignored.');
    }

    const ratingKey = keys.find((k) => /^(safety_?rating|rating)$/i.test(k)) || keys.find((k) => /safety.*rating/i.test(k)) || '';
    const crashAll = keys.filter((k) => /crash/i.test(k));
    const crashKey = crashAll.find((k) => /total/i.test(k)) || '';

    const drop = { units: 0, equip: 0, cargo: 0, auth: 0 };
    const rows = [];
    raw.forEach((c) => {
      // Only the MC that is inside the requested range
      let mc = '';
      if (mode === 'mc') {
        for (let n = 1; n <= 3; n++) {
          const d = String(c['docket' + n] || '').trim();
          const p = String(c['docket' + n + 'prefix'] || 'MC').toUpperCase();
          if (p === 'MC' && d.length === f.length && d >= f && d <= t) { mc = 'MC' + d; break; }
        }
        if (!mc) return;
      } else {
        for (let n = 1; n <= 3; n++) {
          const d = String(c['docket' + n] || '').trim();
          const p = String(c['docket' + n + 'prefix'] || 'MC').toUpperCase();
          if (d && p === 'MC') { mc = 'MC' + d; break; }
        }
      }

      const tractors = tractKeys.reduce((s, k) => s + num(c[k]), 0);
      const trucks = truckKeys.reduce((s, k) => s + num(c[k]), 0);
      const trailers = trailKeys.reduce((s, k) => s + num(c[k]), 0);
      const units = num(c.power_units) || tractors + trucks;
      if (units < minUnits || (maxUnits && units > maxUnits)) { drop.units++; return; }

      const equipment = equipmentOf(tractors, trucks, trailers, units);
      if (equipWanted.length && (tractKeys.length || truckKeys.length) && equipWanted.indexOf(equipment) === -1) { drop.equip++; return; }

      const carried = Object.keys(cargoCol).filter((l) => yes(c[cargoCol[l]]));
      if (wantedOk.length) {
        const ok = match === 'all' ? wantedOk.every((w) => carried.indexOf(w) !== -1) : wantedOk.some((w) => carried.indexOf(w) !== -1);
        if (!ok) { drop.cargo++; return; }
      }

      rows.push({
        dot: c.dot_number,
        mc: mc,
        name: c.legal_name || c.dba_name || '',
        dba: c.dba_name || '',
        phone: fmtPhone(c.phone),
        cellPhone: fmtPhone(c.cell_phone),
        email: (c.email_address || '').toLowerCase(),
        officer: c.company_officer_1 || '',
        powerUnits: units,
        drivers: num(c.total_drivers),
        tractors: tractors,
        straightTrucks: trucks,
        trailers: trailers,
        equipment: equipment,
        cargo: carried,
        city: c.phy_city || '',
        state: c.phy_state || '',
        addDate: day(c.add_date),
        safety: ratingKey ? String(c[ratingKey] || '') : '',
        crashes: crashAll.length ? (crashKey ? num(c[crashKey]) : crashAll.reduce((sum, k) => sum + num(c[k]), 0)) : ''
      });
    });

    // Authority status per carrier
    // Skipped here when no authority filter is chosen: the page asks for it afterwards (mode=auth), so rows appear much faster.
    const authWanted = String(req.query.auth || '').toLowerCase();
    let outRows = rows;
    if (authWanted || req.query.noauth !== '1') {
      const au = await loadAuthority(rows.map((r) => r.dot), warnings);
      rows.forEach((r) => {
        const list = au.ok ? (au.map[stripZeros(r.dot)] || []) : [];
        r.authority = list.length ? statusOf(list, stripZeros(r.mc), au.statusCol, au.typeCol) : 'Unknown';
        if (!r.mc && list.length) {
          const d = list.find((x) => /^MC/i.test(String(x.docket_number || '')));
          if (d) r.mc = String(d.docket_number).toUpperCase();
        }
      });
      if (authWanted) {
        if (au.ok) { outRows = rows.filter((r) => r.authority.toLowerCase() === authWanted); drop.auth = rows.length - outRows.length; }
        else if (rows.length) warnings.push('Authority filter ignored because authority data could not be loaded.');
      }
    }

    if (mode === 'mc') outRows.sort((a, b) => a.mc.localeCompare(b.mc));
    let nextOff = raw.length === PAGE ? offset + PAGE : null;
    if (!isPro) {
      outRows = offset > 0 ? [] : outRows.slice(0, FREE_ROWS);
      nextOff = null;
      warnings.push('Free plan: only the first ' + FREE_ROWS + ' carriers are shown. Upgrade to see all.');
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      rows: outRows,
      scanned: raw.length,
      total: isPro ? total : null,
      plain: plain,
      pageSize: PAGE,
      dropped: drop,
      nextOffset: nextOff,
      warnings: warnings
    });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Bulk request failed' });
  }
};
