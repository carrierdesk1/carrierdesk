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

// Census row for one DOT number. Optional: returns null if anything fails.
async function census(dot) {
  try {
    const url = CENSUS + '?$limit=1&dot_number=' + encodeURIComponent(String(dot));
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

// Census row by MC number (docket1/2/3), tolerant of leading zeros
async function censusByMc(digits) {
  try {
    const n = String(Number(digits));
    const vals = [n, n.padStart(6, '0'), n.padStart(7, '0'), n.padStart(8, '0')]
      .map((v) => "'" + v + "'")
      .join(',');
    const where = 'docket1 in (' + vals + ') OR docket2 in (' + vals + ') OR docket3 in (' + vals + ')';
    const url = CENSUS + '?$limit=1&$where=' + encodeURIComponent(where);
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
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

  try {
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
      if (type === 'mc') cs = await censusByMc(digits);
      else if (type === 'dot') cs = await census(digits);
      if (cs) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ results: [shapeFromCensus(cs)] });
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

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results: out });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'FMCSA request failed' });
  }
};
