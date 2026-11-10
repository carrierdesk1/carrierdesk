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
const tokenHeaders = () => (process.env.SOCRATA_APP_TOKEN ? { 'X-App-Token': process.env.SOCRATA_APP_TOKEN } : {});

async function soda(params) {
  const qs = Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  const r = await fetch(CENSUS + '?' + qs, { signal: AbortSignal.timeout(9000), headers: tokenHeaders() });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Census API status ' + r.status + (t ? ': ' + t.slice(0, 200) : ''));
  }
  return r.json();
}

// SODA JSON leaves out null fields, so read the full column list from the dataset metadata.
async function getKeys() {
  if (keyCache && keyCache.length) return keyCache;
  let keys = [];
  try {
    const r = await fetch(META, { signal: AbortSignal.timeout(6000) });
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
    return await r.json();
  } catch (e) {
    res.status(502).json({ error: 'Login check failed: ' + (e.message || e) });
    return null;
  }
}

// ---- Authority status (Active / Inactive) from FMCSA "Motus Carrier - All With History" ----
const MOTUS = 'https://data.transportation.gov/resource/inys-ebih.json';
const MOTUS_META = 'https://data.transportation.gov/api/views/inys-ebih.json';
let motusKeyCache = null;

async function sodaAt(base, params, ms) {
  const qs = Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  const r = await fetch(base + '?' + qs, { signal: AbortSignal.timeout(ms || 8000), headers: tokenHeaders() });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Motus API status ' + r.status + (t ? ': ' + t.slice(0, 150) : ''));
  }
  return r.json();
}

async function getMotusKeys() {
  if (motusKeyCache && motusKeyCache.length) return motusKeyCache;
  try {
    const r = await fetch(MOTUS_META, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const m = await r.json();
      const k = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
      if (k.length) motusKeyCache = k;
    }
  } catch (e) { /* ignore */ }
  return motusKeyCache || [];
}

const stripZeros = (v) => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');

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
  const groups = [];
  for (let i = 0; i < uniq.length; i += 120) groups.push(uniq.slice(i, i + 120));
  try {
    const results = await Promise.all(groups.map((g) => {
      const vals = [];
      g.forEach((d) => { vals.push("'" + d + "'"); vals.push("'" + d.padStart(8, '0') + "'"); });
      return sodaAt(MOTUS, { $select: select, $where: dotCol + ' in (' + vals.join(',') + ')', $limit: 5000 }, 8000);
    }));
    results.forEach((rows) => rows.forEach((r) => {
      const k = stripZeros(r[dotCol]);
      if (!k) return;
      (out.map[k] = out.map[k] || []).push(r);
    }));
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

    const keys = await getKeys();
    const has = (k) => keys.indexOf(k) !== -1;

    if (req.query.debug) {
      const sample = await soda({ $limit: 1, $where: 'email_address IS NOT NULL' }).catch(() => []);
      const motusColumns = await getMotusKeys();
      const motusSample = await sodaAt(MOTUS, { $limit: 2 }, 6000).catch((e) => String(e.message || e));
      return res.status(200).json({ columnCount: keys.length, columns: keys, sample: sample[0] || null, motusColumns: motusColumns, motusSample: motusSample });
    }

    // Login check (only enforced once SUPABASE_URL and SUPABASE_ANON_KEY are set in Vercel)
    const who = await requireUser(req, res);
    if (who === null) return;

    const mode = String(req.query.mode || 'mc');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const warnings = [];

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
      }
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
      /^(crgo|cargo)/i.test(k) || /^(own|trm|trp)(tract|truck|trail)/i.test(k)
    ).join(',');
    async function getPage(where, off) {
      const p = { $where: where, $order: order, $limit: PAGE, $offset: off };
      if (sel) p.$select = sel;
      try { return await soda(p); }
      catch (e) { if (!sel) throw e; delete p.$select; return await soda(p); }
    }
    async function getCount(where) {
      try {
        const r = await soda({ $select: 'count(*)', $where: where });
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
      if (units < minUnits) return;
      if (maxUnits && units > maxUnits) return;

      const equipment = equipmentOf(tractors, trucks, trailers, units);
      if (equipWanted.length && (tractKeys.length || truckKeys.length) && equipWanted.indexOf(equipment) === -1) return;

      const carried = Object.keys(cargoCol).filter((l) => yes(c[cargoCol[l]]));
      if (wantedOk.length) {
        const ok = match === 'all' ? wantedOk.every((w) => carried.indexOf(w) !== -1) : wantedOk.some((w) => carried.indexOf(w) !== -1);
        if (!ok) return;
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
        addDate: day(c.add_date)
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
        if (au.ok) outRows = rows.filter((r) => r.authority.toLowerCase() === authWanted);
        else warnings.push('Authority filter ignored because authority data could not be loaded.');
      }
    }

    if (mode === 'mc') outRows.sort((a, b) => a.mc.localeCompare(b.mc));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      rows: outRows,
      scanned: raw.length,
      total: total,
      plain: plain,
      pageSize: PAGE,
      nextOffset: raw.length === PAGE ? offset + PAGE : null,
      warnings: warnings
    });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Bulk request failed' });
  }
};
