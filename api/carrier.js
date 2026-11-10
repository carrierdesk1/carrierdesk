// Vercel serverless function: proxies FMCSA QCMobile API so the webKey stays secret.
module.exports = async (req, res) => {
  const key = process.env.FMCSA_WEBKEY;
  if (!key) return res.status(500).json({ error: "FMCSA_WEBKEY is not set on the server." });
  const { type, q } = req.query;
  if (!q || !["mc", "dot", "name"].includes(type)) return res.status(400).json({ error: "Use type=mc|dot|name and q=..." });
  const base = "https://mobile.fmcsa.dot.gov/qc/services/carriers";
  const path = type === "mc" ? `/docket-number/${encodeURIComponent(q)}`
             : type === "dot" ? `/${encodeURIComponent(q)}`
             : `/name/${encodeURIComponent(q)}`;
  try {
    const r = await fetch(`${base}${path}?webKey=${key}`);
    if (!r.ok) return res.status(r.status).json({ error: `FMCSA returned ${r.status}` });
    const data = await r.json();
    let list = data.content || [];
    if (!Array.isArray(list)) list = [list];
    const results = list.map(i => i.carrier || i).filter(c => c && c.dotNumber).slice(0, 50).map(c => ({
      dot: c.dotNumber, mc: type === "mc" ? q : "", name: c.legalName, dba: c.dbaName || "",
      city: c.phyCity, state: c.phyState,
      authorized: c.allowedToOperate === "Y", units: c.totalPowerUnits, drivers: c.totalDrivers,
      rating: c.safetyRating || "Not rated"
    }));
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).json({ results });
  } catch (e) {
    res.status(502).json({ error: "Could not reach FMCSA." });
  }
};
