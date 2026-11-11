// Bulk carrier search from YOUR Supabase 'census' table (imported from the FMCSA Company Census File).
// Needs in Vercel: SUPABASE_URL, SUPABASE_SERVICE_KEY (secret key), SUPABASE_ANON_KEY (for login).
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

// Cache: the same query is answered from memory for 10 min (page load, retries and alerts no longer hit Socrata again).
const qCache = {};      // url -> { t, data }
const qInflight = {};   // url -> promise (identical requests at the same time share ONE call)
const Q_TTL = 10 * 60 * 1000;
function cached(url, ms, tries, label, ttl) {
  const hit = qCache[url];
  if (hit && Date.now() - hit.t < (ttl || Q_TTL)) return Promise.resolve(hit.data);
  if (qInflight[url]) return qInflight[url];
  const p = gate(() => socrata(url, ms, tries, label)).then((data) => {
    if (Object.keys(qCache).length > 300) { for (const k in qCache) delete qCache[k]; }
    qCache[url] = { t: Date.now(), data: data };
    return data;
  }).finally(() => { delete qInflight[url]; });
  qInflight[url] = p;
  return p;
}
const soda = (params, ms, tries, ttl) => cached(CENSUS + '?' + qsOf(params), ms, tries, 'Census', ttl);

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

const sodaAt = (base, params, ms, tries) => cached(base + '?' + qsOf(params), ms, tries || 3, 'Motus');

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


// ================= Census data now comes from YOUR Supabase "census" table =================
const SB_URL = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = () => String(process.env.SUPABASE_SERVICE_KEY || '').replace(/["'\s]/g, '');
const EQUIP_OK = ['Big Equipment', 'Power Only', 'Box Truck', 'Multi Trucks', 'Unknown'];
const SELECT = 'dot_number,legal_name,dba_name,phone,cell_phone,email,officer,power_units,drivers,tractors,trucks,trailers,equipment,cargo,city,state,add_date,mc_n,safety,crashes';

async function sb(path, opts) {
  const key = SB_KEY();
  if (!SB_URL() || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY are not set in Vercel.');
  const o = opts || {};
  let r;
  for (let i = 0; i < 3; i++) {
    try {
      r = await fetch(SB_URL() + '/rest/v1/' + path, {
        headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + key }, o.headers || {}),
        signal: AbortSignal.timeout(o.ms || 25000)
      });
    } catch (e) {
      if (i < 2) { await wait(400); continue; }
      throw new Error('Database is slow right now (timeout). Please press Fetch again.');
    }
    if (r.status < 500) break;
    await wait(500 * (i + 1));
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Census database error ' + r.status + (t ? ': ' + t.slice(0, 200) : ''));
  }
  return r;
}

// Builds the filter part of the query (everything except paging)
function censusFilter(q, mode, f, t, from, to) {
  const p = [];
  if (mode === 'mc') {
    p.push('mc_n=gte.' + f, 'mc_n=lte.' + t);
  } else {
    p.push('add_date=gte.' + from, 'add_date=lt.' + nextDay(to));
    p.push('mc_n=not.is.null');
  }
  const stList = String(q.state || '').toUpperCase().split(/[^A-Z]+/).filter((x) => x.length === 2);
  if (stList.length) p.push('state=in.(' + stList.join(',') + ')');
  const cityQ = String(q.city || '').toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim();
  if (cityQ) p.push('city=ilike.' + encodeURIComponent('*' + cityQ + '*'));
  if (q.hasemail === '1') p.push('email=not.is.null');
  if (q.hasphone === '1') p.push('or=' + encodeURIComponent('(phone.not.is.null,cell_phone.not.is.null)'));
  const minU = parseInt(q.min, 10) || 0, maxU = parseInt(q.max, 10) || 0;
  if (minU) p.push('power_units=gte.' + minU);
  if (maxU) p.push('power_units=lte.' + maxU);
  const eq = String(q.equip || '').split('|').filter((x) => EQUIP_OK.indexOf(x) !== -1);
  if (eq.length) p.push('equipment=in.(' + eq.map((x) => encodeURIComponent('"' + x + '"')).join(',') + ')');
  const cg = String(q.cargo || '').split('|').filter((x) => CARGO[x]);
  if (cg.length) {
    const arr = '{' + cg.map((x) => '"' + x + '"').join(',') + '}';
    p.push('cargo=' + (q.match === 'all' ? 'cs.' : 'ov.') + encodeURIComponent(arr));
  }
  return p.join('&');
}

const rowOut = (c) => ({
  dot: String(c.dot_number),
  mc: c.mc_n ? 'MC' + c.mc_n : '',
  name: c.legal_name || c.dba_name || '',
  dba: c.dba_name || '',
  phone: fmtPhone(c.phone),
  cellPhone: fmtPhone(c.cell_phone),
  email: (c.email || '').toLowerCase(),
  officer: c.officer || '',
  powerUnits: c.power_units || 0,
  drivers: c.drivers || 0,
  tractors: c.tractors || 0,
  straightTrucks: c.trucks || 0,
  trailers: c.trailers || 0,
  equipment: c.equipment || 'Unknown',
  cargo: c.cargo || [],
  city: c.city || '',
  state: c.state || '',
  addDate: day(c.add_date),
  safety: c.safety || '',
  crashes: c.crashes == null ? '' : c.crashes
});

module.exports = async (req, res) => {
  try {
    if (req.query.mode === 'ping') {
      const st = Date.now();
      try {
        const r = await sb('census?select=dot_number&limit=1');
        return res.status(200).json({ ok: true, ms: Date.now() - st, sample: await r.json() });
      } catch (e) { return res.status(200).json({ ok: false, error: e.message }); }
    }

    // Authority status (still from FMCSA Motus data, small requests, loaded in the background by the page)
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

    // Newest add_date in your census table
    if (req.query.mode === 'latest') {
      const who3 = await requireUser(req, res);
      if (who3 === null) return;
      const r = await sb('census?select=add_date&add_date=not.is.null&order=add_date.desc&limit=1');
      const rows = await r.json();
      const lv = rows && rows[0] ? rows[0].add_date : '';
      res.setHeader('Cache-Control', lv ? 'private, max-age=3600' : 'no-store');
      return res.status(200).json({ latest: day(lv) });
    }

    if (req.query.debug) {
      const r = await sb('census?select=' + SELECT + '&limit=1');
      return res.status(200).json({ source: 'supabase census table', sample: (await r.json())[0] || null });
    }

    const who = await requireUser(req, res);
    if (who === null) return;
    const isPro = who === true || !!who._pro;

    const mode = String(req.query.mode || 'mc');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const warnings = [];
    let f = '', t = '', order = 'mc_n.asc,dot_number.asc';

    if (mode === 'mc') {
      f = from.replace(/\D/g, '');
      t = to.replace(/\D/g, '');
      if (!f || !t) return res.status(400).json({ error: 'Enter both From and To MC numbers' });
      if (Number(t) < Number(f)) return res.status(400).json({ error: 'To must be bigger than From' });
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Use YYYY-MM-DD dates' });
      }
      order = 'add_date.asc,dot_number.asc';
    }

    const filter = censusFilter(req.query, mode, f, t, from, to);
    const url = 'census?select=' + SELECT + '&' + filter + '&order=' + order + '&limit=' + PAGE + '&offset=' + offset;
    const headers = offset === 0 ? { Prefer: 'count=exact' } : {};
    const r = await sb(url, { headers: headers, ms: 28000 });
    const raw = await r.json();
    let total = null;
    if (offset === 0) {
      const cr = String(r.headers.get('content-range') || '');
      const n = parseInt(cr.split('/')[1], 10);
      total = isFinite(n) ? n : null;
    }

    let rows = raw.map(rowOut);
    const drop = { units: 0, equip: 0, cargo: 0, auth: 0 };
    let outRows = rows;

    // Authority filter (optional): only when the user picked Active / Inactive
    const authWanted = String(req.query.auth || '').toLowerCase();
    if (authWanted || req.query.noauth !== '1') {
      const au = await loadAuthority(rows.map((x) => x.dot), warnings);
      rows.forEach((x) => {
        const list = au.ok ? (au.map[stripZeros(x.dot)] || []) : [];
        x.authority = list.length ? statusOf(list, stripZeros(x.mc), au.statusCol, au.typeCol) : 'Unknown';
      });
      if (authWanted) {
        if (au.ok) { outRows = rows.filter((x) => x.authority.toLowerCase() === authWanted); drop.auth = rows.length - outRows.length; }
        else if (rows.length) warnings.push('Authority filter ignored because authority data could not be loaded.');
      }
    }

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
      plain: true,
      pageSize: PAGE,
      dropped: drop,
      nextOffset: nextOff,
      warnings: warnings
    });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Bulk request failed' });
  }
};
