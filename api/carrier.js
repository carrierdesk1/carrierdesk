const BASE = 'https://mobile.fmcsa.dot.gov/qc/services';
// FMCSA Company Census File (free, no key): data.transportation.gov dataset az4n-8mr2
const CENSUS = 'https://data.transportation.gov/resource/az4n-8mr2.json';

async function get(path, key) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(BASE + path + sep + 'webKey=' + encodeURIComponent(key));
  if (r.status === 404) return null;
  if (!r.ok) {
    const e = new Error('FMCSA returned status ' + r.status);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// ---- Socrata helpers (app token + retries + 429 handling) ----
const MOTUS = 'https://data.transportation.gov/resource/inys-ebih.json';
const MOTUS_META = 'https://data.transportation.gov/api/views/inys-ebih.json';
const INS = 'https://data.transportation.gov/resource/chgs-tx6x.json';
const INS_META = 'https://data.transportation.gov/api/views/chgs-tx6x.json';
const cleanToken = () => String(process.env.SOCRATA_APP_TOKEN || '').replace(/["'\s]/g, '');
let tokenBad = false;
const tokenHeaders = () => {
  const t = cleanToken();
  return t && !tokenBad ? { 'X-App-Token': t } : {};
};
const stripZeros = (v) => String(v == null ? '' : v).replace(/\D/g, '').replace(/^0+/, '');
const metaCache = {};

// Simple in-memory cache (works while the Vercel function instance stays warm)
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
const cacheGet = (k) => {
  const h = cache.get(k);
  if (h && Date.now() - h.t < CACHE_MS) return h.v;
  if (h) cache.delete(k);
  return null;
};
const cacheSet = (k, v) => {
  if (cache.size > 300) cache.clear();
  cache.set(k, { t: Date.now(), v });
};

const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

// until = absolute timestamp (ms) after which we stop retrying (Vercel Hobby limit is 10s)
async function sodaAt(base, params, ms, tries, until) {
  const qs = Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  const max = tries || 3;
  let r;
  for (let i = 0; i < max; i++) {
    const left = until ? until - Date.now() : 99999;
    if (i > 0 && left < 1500) break;
    const timeout = Math.min(ms || 8000, Math.max(left, 1500));
    try {
      r = await fetch(base + '?' + qs, { signal: AbortSignal.timeout(timeout), headers: tokenHeaders() });
    } catch (e) {
      if (i < max - 1) continue; // first try is often slow (cold cache): retry
      throw new Error('Census server is slow right now. Please press Search again.');
    }
    if (r.status === 403 && !tokenBad && cleanToken()) { tokenBad = true; i--; continue; }
    if (r.status !== 429 && r.status < 500) break;
    if (i === max - 1) break;
    let pause = 400 * (i + 1);
    if (r.status === 429) {
      const ra = Number(r.headers.get('retry-after'));
      pause = ra > 0 ? ra * 1000 : 900 * (i + 1);
    }
    const left2 = until ? until - Date.now() - 1500 : 2000;
    pause = Math.min(pause, 2000, left2);
    if (pause <= 0) break;
    await wait(pause);
  }
  if (!r) throw new Error('Census server is slow right now. Please press Search again.');
  if (!r.ok) {
    const e = new Error(
      r.status === 429
        ? 'Census rate limit (429). Thori dair baad dobara Search karein (SOCRATA_APP_TOKEN lagana behtar ha).'
        : 'Census API status ' + r.status
    );
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// Census row for one DOT number (used for the contact details on QCMobile results). Optional.
async function census(dot) {
  try {
    const rows = await sodaAt(CENSUS, { $limit: 1, dot_number: String(dot) }, 6000, 2, Date.now() + 6500);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

async function metaKeys(url) {
  if (metaCache[url] && metaCache[url].length) return metaCache[url];
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000), headers: tokenHeaders() });
    if (r.ok) {
      const m = await r.json();
      const k = (m.columns || []).map((c) => c.fieldName).filter((n) => n && n.charAt(0) !== ':');
      if (k.length) metaCache[url] = k;
    }
  } catch (e) { /* ignore */ }
  return metaCache[url] || [];
}

// Census row by MC number. Columns are tried ONE BY ONE (docket1 first) to save requests.
// Returns null if not found, THROWS if Census is down/slow/rate-limited.
async function censusByMc(digits, until) {
  const n = String(Number(digits));
  const vals = [n, n.padStart(6, '0'), n.padStart(7, '0'), n.padStart(8, '0')].map((v) => "'" + v + "'").join(',');
  let lastErr = null;
  for (const col of ['docket1', 'docket2', 'docket3']) {
    try {
      const rows = await sodaAt(CENSUS, { $limit: 1, $where: col + ' in (' + vals + ')' }, 8000, 3, until);
      if (rows && rows.length) return rows[0];
    } catch (e) {
      lastErr = e;
      if (e.status === 429) break; // other columns will be limited too
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

// Authority status (Common / Contract / Broker) from the Motus dataset. Optional.
async function authorityFor(dot, until) {
  try {
    const keys = await metaKeys(MOTUS_META);
    const dotCol = ['usdot_number', 'dot_number'].find((k) => keys.indexOf(k) !== -1);
    const statusCol = keys.indexOf('op_auth_status') !== -1 ? 'op_auth_status' : keys.find((k) => /auth.*stat/i.test(k));
    const typeCol = keys.indexOf('op_auth_type') !== -1 ? 'op_auth_type' : keys.find((k) => /auth.*type/i.test(k));
    if (!dotCol || !statusCol) return null;
    const d = stripZeros(dot);
    const vals = "'" + d + "','" + d.padStart(8, '0') + "'";
    const rows = await sodaAt(MOTUS, { $select: [dotCol, typeCol, statusCol].filter(Boolean).join(','), $where: dotCol + ' in (' + vals + ')', $limit: 50 }, 5000, 1, until);
    if (!rows.length) return null;
    const stat = (re) => {
      const list = rows.filter((r) => !typeCol || re.test(String(r[typeCol] || '')));
      if (!list.length) return 'None';
      return list.some((r) => !/inactive|revok|cancel|terminat|dismiss|withdraw|expire/i.test(String(r[statusCol] || ''))) ? 'Active' : 'Inactive';
    };
    return { common: stat(/common/i), contract: stat(/contract/i), broker: stat(/broker|forwarder/i) };
  } catch (e) {
    return null;
  }
}

// BI&PD insurance on file (thousands of dollars) from the Active/Pending Insurance dataset. Optional.
async function insuranceFor(mcList, until) {
  try {
    const mc = stripZeros((mcList && mcList[0]) || '');
    if (!mc) return null;
    const keys = await metaKeys(INS_META);
    const dockCol = keys.find((k) => /^docket(_number)?$/i.test(k)) || keys.find((k) => /docket/i.test(k));
    const typeCol = keys.find((k) => /ins.*type|type.*desc|ins_class|mod_col/i.test(k)) || '';
    const amtCol = keys.find((k) => /max_cov/i.test(k)) || '';
    if (!dockCol) return null;
    const vals = "'MC" + mc + "','" + mc + "'";
    const rows = await sodaAt(INS, { $select: [dockCol, typeCol, amtCol].filter(Boolean).join(','), $where: dockCol + ' in (' + vals + ')', $limit: 200 }, 5000, 1, until);
    if (!rows.length) return { bipdOnFile: 0 };
    const isBipd = (r) => /bipd|primary|liab/i.test(String(r[typeCol] || ''));
    const list = typeCol && rows.some(isBipd) ? rows.filter(isBipd) : rows;
    const amt = list.reduce((mx, r) => Math.max(mx, amtCol ? kNum(r[amtCol]) : 0), 0);
    return { bipdOnFile: amt };
  } catch (e) {
    return null;
  }
}

const AUTH = { A: 'Active', I: 'Inactive', N: 'None' };
const authText = (v) => AUTH[v] || (v ? String(v) : 'Unknown');
const kNum = (v) => Number(String(v == null ? 0 : v).replace(/[^0-9.]/g, '')) || 0;
const day = (v) => (v ? String(v).slice(0, 10) : '');
const fmtPhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(v || '');
};

const OPER = { A: 'Interstate', B: 'Intrastate (Hazmat)', C: 'Intrastate (Non-Hazmat)' };

function shape(c, mcList, cs) {
  const bipd = kNum(c.bipdInsuranceOnFile);
  const cargo = kNum(c.cargoInsuranceOnFile);
  const bond = kNum(c.bondInsuranceOnFile);
  cs = cs || {};
  return {
    dot: c.dotNumber,
    mc: mcList || [],
    name: c.dbaName || c.legalName,
    legalName: c.legalName,
    dba: c.dbaName || '',
    // allowedToOperate is the real "authorized" flag: "Y" or "N"
    authorized: c.allowedToOperate === 'Y',
    statusCode: c.statusCode,
    common: authText(c.commonAuthorityStatus),
    contract: authText(c.contractAuthorityStatus),
    broker: authText(c.brokerAuthorityStatus),
    insurance: {
      bipdOnFile: bipd, // in thousands of dollars
      bipdRequired: kNum(c.bipdRequiredAmount),
      cargoOnFile: cargo,
      bondOnFile: bond
    },
    drivers: kNum(c.totalDrivers),
    powerUnits: kNum(c.totalPowerUnits),
    operation: (c.carrierOperation && c.carrierOperation.carrierOperationDesc) || '',
    operationClass: cs.classdef || '',
    businessOrg: cs.business_org_desc || cs.business_org || '',
    mileage: cs.mcs150_mileage || '',
    safetyRating: c.safetyRating || '',
    crashTotal: kNum(c.crashTotal),
    address: [c.phyStreet, c.phyCity, c.phyState, c.phyZipcode].filter(Boolean).join(', '),
    oos: !!c.oosDate,
    oosDate: c.oosDate || '',
    // From the Census file (may be empty if FMCSA has none on file)
    email: (cs.email_address || '').toLowerCase(),
    phone: fmtPhone(cs.phone),
    cellPhone: fmtPhone(cs.cell_phone),
    officer1: cs.company_officer_1 || '',
    officer2: cs.company_officer_2 || '',
    mcs150Date: day(cs.mcs150_date),
    censusAddDate: day(cs.add_date),
    censusFound: !!cs.dot_number
  };
}

// Build the same result shape from a Census row alone (new carriers not yet in QCMobile)
function shapeFromCensus(cs) {
  const mcs = [1, 2, 3]
    .filter((n) => cs['docket' + n])
    .map((n) => (cs['docket' + n + 'prefix'] || 'MC') + cs['docket' + n]);
  // cargo flags such as crgo_genfreight = "X"
  const cargo = Object.keys(cs)
    .filter((k) => /^crgo_/.test(k) && k !== 'crgo_cargoothr_desc' && String(cs[k]).trim())
    .map((k) => k.replace(/^crgo_/, ''));
  const active = String(cs.status_code || '').toUpperCase() === 'A';
  return {
    dot: cs.dot_number,
    mc: mcs,
    name: cs.dba_name || cs.legal_name,
    legalName: cs.legal_name,
    dba: cs.dba_name || '',
    authorized: active,
    statusCode: cs.status_code,
    common: active ? 'Active' : 'Unknown',
    contract: 'Unknown',
    broker: 'Unknown',
    insurance: { bipdOnFile: 0, bipdRequired: 0, cargoOnFile: 0, bondOnFile: 0 },
    drivers: kNum(cs.total_drivers),
    powerUnits: kNum(cs.power_units),
    operation: OPER[String(cs.carrier_operation || '').toUpperCase()] || cs.carrier_operation || '',
    operationClass: cs.classdef || '',
    businessOrg: cs.business_org_desc || cs.business_org || '',
    mileage: cs.mcs150_mileage || '',
    cargo: cargo,
    safetyRating: '',
    crashTotal: 0,
    address: [cs.phy_street, cs.phy_city, cs.phy_state, cs.phy_zip].filter(Boolean).join(', '),
    oos: false,
    oosDate: '',
    email: (cs.email_address || '').toLowerCase(),
    phone: fmtPhone(cs.phone),
    cellPhone: fmtPhone(cs.cell_phone),
    officer1: cs.company_officer_1 || '',
    officer2: cs.company_officer_2 || '',
    mcs150Date: day(cs.mcs150_date),
    censusAddDate: day(cs.add_date),
    censusFound: true,
    fromCensusOnly: true
  };
}

module.exports = async (req, res) => {
  const key = process.env.FMCSA_WEBKEY;
  if (!key) return res.status(500).json({ error: 'FMCSA_WEBKEY is not set' });

  const type = String(req.query.type || 'mc');
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing query' });

  // Vercel Hobby = 10s max; stop retrying around 8.5s
  const until = Date.now() + 8500;

  try {
    const ck = type + '|' + q.toLowerCase();
    const hit = cacheGet(ck);
    if (hit) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(hit);
    }

    let data;
    const digits = q.replace(/\D/g, '');
    if (type === 'dot') {
      if (!digits) return res.status(400).json({ error: 'DOT must be a number' });
      data = await get('/carriers/' + digits, key);
    } else if (type === 'mc') {
      if (!digits) return res.status(400).json({ error: 'MC must be a number' });
      data = await get('/carriers/docket-number/' + digits, key);
    } else {
      data = await get('/carriers/name/' + encodeURIComponent(q), key);
    }

    // QCMobile has nothing (new carrier) -> fall back to the Census file
    if (!data || !data.content || (Array.isArray(data.content) && !data.content.length)) {
      let cs = null;
      if (type === 'mc') cs = await censusByMc(digits, until);
      else if (type === 'dot') cs = await sodaAt(CENSUS, { $limit: 1, dot_number: digits }, 8000, 3, until).then((r) => r[0] || null);
      if (cs) {
        const shaped = shapeFromCensus(cs);
        const [au, ins] = await Promise.all([authorityFor(cs.dot_number, until), insuranceFor(shaped.mc, until)]);
        if (au) {
          shaped.common = au.common;
          shaped.contract = au.contract;
          shaped.broker = au.broker;
          shaped.authorized = au.common === 'Active' || au.contract === 'Active' || au.broker === 'Active';
        }
        if (ins && ins.bipdOnFile > 0) shaped.insurance.bipdOnFile = ins.bipdOnFile;
        const payload = { results: [shaped] };
        cacheSet(ck, payload);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(payload);
      }
    }

    const content = data && data.content;
    const list = !content ? [] : Array.isArray(content) ? content : [content];
    const carriers = list
      .map((x) => (x && x.carrier) || x)
      .filter((c) => c && c.dotNumber)
      .slice(0, 10);

    const out = await Promise.all(
      carriers.map(async (c) => {
        const mcPromise = (async () => {
          try {
            const d = await get('/carriers/' + c.dotNumber + '/docket-numbers', key);
            const arr = d && d.content ? (Array.isArray(d.content) ? d.content : [d.content]) : [];
            return arr
              .map((x) => x.docket || x)
              .filter((x) => x && x.docketNumber)
              .map((x) => (x.prefix || 'MC') + x.docketNumber);
          } catch (e) {
            return []; /* MC list is optional */
          }
        })();
        const [mcs, cs] = await Promise.all([mcPromise, census(c.dotNumber)]);
        return shape(c, mcs, cs);
      })
    );

    const payload = { results: out };
    if (out.length) cacheSet(ck, payload);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(502).json({ error: e.message || 'FMCSA request failed' });
  }
};
