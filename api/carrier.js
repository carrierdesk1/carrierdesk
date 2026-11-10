const BASE = 'https://mobile.fmcsa.dot.gov/qc/services';

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

const AUTH = { A: 'Active', I: 'Inactive', N: 'None' };
const authText = (v) => AUTH[v] || (v ? String(v) : 'Unknown');
const kNum = (v) => Number(String(v == null ? 0 : v).replace(/[^0-9.]/g, '')) || 0;

function shape(c, mcList) {
  const bipd = kNum(c.bipdInsuranceOnFile);
  const cargo = kNum(c.cargoInsuranceOnFile);
  const bond = kNum(c.bondInsuranceOnFile);
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
    safetyRating: c.safetyRating || '',
    crashTotal: kNum(c.crashTotal),
    address: [c.phyStreet, c.phyCity, c.phyState, c.phyZipcode].filter(Boolean).join(', '),
    oos: !!c.oosDate,
    oosDate: c.oosDate || ''
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

    const content = data && data.content;
    const list = !content ? [] : Array.isArray(content) ? content : [content];
    const carriers = list
      .map((x) => (x && x.carrier) || x)
      .filter((c) => c && c.dotNumber)
      .slice(0, 10);

    const out = [];
    for (const c of carriers) {
      let mcs = [];
      try {
        const d = await get('/carriers/' + c.dotNumber + '/docket-numbers', key);
        const arr = d && d.content ? (Array.isArray(d.content) ? d.content : [d.content]) : [];
        mcs = arr
          .map((x) => x.docket || x)
          .filter((x) => x && x.docketNumber)
          .map((x) => (x.prefix || 'MC') + x.docketNumber);
      } catch (e) {
        /* MC list is optional */
      }
      out.push(shape(c, mcs));
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ results: out });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'FMCSA request failed' });
  }
};
