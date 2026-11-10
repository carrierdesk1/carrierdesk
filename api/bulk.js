// Bulk carrier search from the FMCSA Company Census File (free, no key).
// GET /api/bulk?mode=mc&from=181036&to=191036
// GET /api/bulk?mode=date&from=2026-11-05&to=2026-11-10
// Optional: min, fleet=straight|tractor, cargo=General Freight|Household Goods, match=any|all, offset
// Debug:    /api/bulk?debug=1  (shows the real column names of the Census file)
const DATASET = 'az4n-8mr2';
const CENSUS = 'https://data.transportation.gov/resource/' + DATASET + '.json';
const META = 'https://data.transportation.gov/api/views/' + DATASET + '.json';
const PAGE = 1000;

// Label shown on the site -> text found inside the Census cargo column name
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

async function soda(params) {
  const qs = Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  const r = await fetch(CENSUS + '?' + qs, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Census API status ' + r.status + (t ? ': ' + t.slice(0, 200) : ''));
  }
  return r.json();
}

// The SODA JSON API leaves out null fields, so a single row does NOT show every column.
// Read the full column list from the dataset metadata instead.
async function getKeys() {
  if (keyCache && keyCache.length) return keyCache;
  let keys = [];
  try {
    const r = await fetch(META, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const m = await r.json();
      keys = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
    }
  } catch (e) { /* fall through to sampling */ }

  if (!keys.length) {
    // Fallback: union of keys over many rows, including rows that have a docket
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

module.exports = async (req, res) => {
  try {
    const keys = await getKeys();
    const has = (k) => keys.indexOf(k) !== -1;

    if (req.query.debug) {
      const sample = await soda({ $limit: 1, $where: 'email_address IS NOT NULL' }).catch(() => []);
      return res.status(200).json({ columnCount: keys.length, columns: keys, sample: sample[0] || null });
    }

    const mode = String(req.query.mode || 'mc');
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const warnings = [];
    const where = [];

    if (has('status_code')) where.push("status_code='A'");

    let order = 'dot_number';
    if (mode === 'mc') {
      const f = from.replace(/\D/g, '');
      const t = to.replace(/\D/g, '');
      if (!f || !t) return res.status(400).json({ error: 'MC from aur to dono number likhein' });
      if (f.length !== t.length) return res.status(400).json({ error: 'From aur To ke digits barabar hon (jaise 181036 se 191036)' });
      if (t < f) return res.status(400).json({ error: 'To number From se bara hona chahiye' });
      const parts = [];
      [1, 2, 3].forEach((n) => {
        const nk = 'docket' + n;
        if (!has(nk)) return;
        const pk = nk + 'prefix';
        parts.push('(' + (has(pk) ? pk + "='MC' AND " : '') + nk + " >= '" + f + "' AND " + nk + " <= '" + t + "')");
      });
      if (!parts.length) {
        return res.status(500).json({ error: 'Census file me docket (MC) column nahi mila. /api/bulk?debug=1 ka screenshot bhejein.' });
      }
      where.push('(' + parts.join(' OR ') + ')');
      order = has('docket1') ? 'docket1' : 'dot_number';
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Date YYYY-MM-DD format me do' });
      }
      if (!has('add_date')) return res.status(500).json({ error: 'Census file me add_date column nahi mila' });
      where.push("add_date >= '" + from + "' AND add_date < '" + nextDay(to) + "'");
      order = 'add_date';
    }

    const raw = await soda({ $where: where.join(' AND '), $order: order, $limit: PAGE, $offset: offset });

    // Post filters
    const minUnits = parseInt(req.query.min, 10) || 0;
    const fleet = String(req.query.fleet || '');
    const wanted = String(req.query.cargo || '').split('|').filter(Boolean);
    const match = req.query.match === 'all' ? 'all' : 'any';

    const cargoKeys = keys.filter((k) => /^(crgo|cargo)/i.test(k));
    const cargoCol = {};
    Object.keys(CARGO).forEach((label) => {
      const k = cargoKeys.find((x) => x.toLowerCase().indexOf(CARGO[label]) !== -1);
      if (k) cargoCol[label] = k;
    });
    wanted.forEach((w) => {
      if (!cargoCol[w]) warnings.push('Cargo column "' + w + '" Census me nahi mila, is filter ko ignore kiya.');
    });
    const wantedOk = wanted.filter((w) => cargoCol[w]);

    const tractKeys = keys.filter((k) => /^(own|trm|trp)tract/i.test(k));
    const truckKeys = keys.filter((k) => /^(own|trm|trp)truck/i.test(k));
    if (fleet && !tractKeys.length && !truckKeys.length) {
      warnings.push('Straight truck / tractor ka data Census me nahi mila, fleet filter ignore hua.');
    }

    const rows = [];
    raw.forEach((c) => {
      const units = num(c.power_units);
      if (units < minUnits) return;
      const tractors = tractKeys.reduce((s, k) => s + num(c[k]), 0);
      const trucks = truckKeys.reduce((s, k) => s + num(c[k]), 0);
      if (fleet === 'straight' && (tractKeys.length || truckKeys.length) && !(trucks > 0 && tractors === 0)) return;
      if (fleet === 'tractor' && (tractKeys.length || truckKeys.length) && !(tractors > 0)) return;
      const carried = Object.keys(cargoCol).filter((l) => yes(c[cargoCol[l]]));
      if (wantedOk.length) {
        const ok = match === 'all' ? wantedOk.every((w) => carried.indexOf(w) !== -1) : wantedOk.some((w) => carried.indexOf(w) !== -1);
        if (!ok) return;
      }
      const mcs = [1, 2, 3]
        .map((n) => (c['docket' + n] ? (c['docket' + n + 'prefix'] || 'MC') + c['docket' + n] : ''))
        .filter(Boolean);
      rows.push({
        dot: c.dot_number,
        mc: mcs,
        name: c.dba_name || c.legal_name || '',
        legalName: c.legal_name || '',
        phone: fmtPhone(c.phone),
        cellPhone: fmtPhone(c.cell_phone),
        email: (c.email_address || '').toLowerCase(),
        officer: c.company_officer_1 || '',
        powerUnits: units,
        drivers: num(c.total_drivers),
        tractors: tractors,
        straightTrucks: trucks,
        cargo: carried,
        city: c.phy_city || '',
        state: c.phy_state || '',
        addDate: day(c.add_date)
      });
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      rows: rows,
      scanned: raw.length,
      nextOffset: raw.length === PAGE ? offset + PAGE : null,
      warnings: warnings
    });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Bulk request failed' });
  }
};
