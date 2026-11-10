// Bulk carrier search from the FMCSA Company Census File (free, no key).
// GET /api/bulk?mode=mc&from=500000&to=505000
// GET /api/bulk?mode=date&from=2026-11-05&to=2026-11-10
// Optional: min, max (power units), equip=Big Equipment|Power Only|Box Truck|Multi Trucks,
//           cargo=General Freight|Household Goods, match=any|all, offset
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
      order = 'docket1';
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return res.status(400).json({ error: 'Use YYYY-MM-DD dates' });
      }
      if (!has('add_date')) return res.status(500).json({ error: 'No add_date column in Census file' });
      order = 'add_date';
    }

    let raw;
    if (mode === 'mc') {
      // Ask Census for exact-length MCs only; if that filter is not accepted, fall back and filter here.
      try {
        raw = await soda({ $where: buildWhere(true), $order: order, $limit: PAGE, $offset: offset });
        if (!raw.length && offset === 0) raw = await soda({ $where: buildWhere(false), $order: order, $limit: PAGE, $offset: offset });
      } catch (e) {
        raw = await soda({ $where: buildWhere(false), $order: order, $limit: PAGE, $offset: offset });
      }
    } else {
      raw = await soda({ $where: buildWhere(false), $order: order, $limit: PAGE, $offset: offset });
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

    if (mode === 'mc') rows.sort((a, b) => a.mc.localeCompare(b.mc));

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
