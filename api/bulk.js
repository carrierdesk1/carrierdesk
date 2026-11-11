<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CarrierDesk</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
:root{--bg:#eef2f8;--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--navy:#0a1830;--navy2:#0f2a57;--acc:#1a5fe0;--amb:#f59e0b;--ok:#16a34a;--bad:#dc2626;--head:#0b1424}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.45}
select,input,button{font:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
input{flex:1;min-width:150px}
input:focus,select:focus{outline:2px solid var(--acc);outline-offset:-1px;border-color:var(--acc)}
button{cursor:pointer;font-weight:600;transition:.15s}
button:hover{background:#f1f5f9}
button:disabled{opacity:.45;cursor:default}
.go{background:var(--acc);color:#fff;border-color:var(--acc)}
.go:hover{background:#154dbb}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.wm{font-style:italic;font-weight:800;letter-spacing:-.02em;color:#fff}.wm span{color:var(--amb)}
.logo{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.14);display:grid;place-items:center;font-size:21px;flex:none}

/* ---------- login / signup ---------- */
#auth{display:none;min-height:100vh;align-items:center;justify-content:center;padding:20px;background:radial-gradient(1200px 500px at 85% -10%,#f59e0b55,transparent 60%),linear-gradient(135deg,#071328 0%,#0f2a57 60%,#1a5fe0 140%)}
.authbox{background:#fff;border-radius:22px;max-width:430px;width:100%;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.abrand{display:flex;align-items:center;gap:12px;justify-content:center}
.abrand .wm{font-size:30px;color:var(--navy)}
.abrand .logo{background:var(--navy)}
.asub{text-align:center;color:var(--mut);margin:6px 0 18px;font-size:14px}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f1f5f9;padding:5px;border-radius:12px;margin-bottom:16px}
.tabs button{border:0;background:transparent;color:var(--mut)}
.tabs button.on{background:#fff;color:var(--ink);box-shadow:0 1px 4px rgba(15,23,42,.12)}
.aform{display:flex;flex-direction:column;gap:10px}
.aform label{font-size:12px;font-weight:600;color:var(--mut);margin-bottom:-4px}
.aform input{width:100%}
.aform .go{padding:13px;margin-top:6px}
#amsg{margin-top:12px;font-size:13px;min-height:18px;text-align:center}
.notice{background:#fef3c7;color:#92400e;border-radius:12px;padding:12px 14px;font-size:13px;margin-bottom:14px}
.linkbtn{background:none;border:0;padding:0;color:var(--acc);font-weight:600;font-size:13px}

/* ---------- app shell ---------- */
#app{display:none;min-height:100vh}
.side{width:236px;flex:none;background:linear-gradient(180deg,#081428,#0c2147 70%,#0a1830);color:#cbd5e1;padding:22px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh}
.sbrand{display:flex;align-items:center;gap:10px;padding:0 6px 22px}
.sbrand .wm{font-size:22px}
.side nav a{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;color:#cbd5e1;font-weight:600;font-size:14px;margin-bottom:6px;text-decoration:none}
.side nav a:hover{background:rgba(255,255,255,.07)}
.side nav a.on{background:linear-gradient(90deg,#1a5fe0,#2a74f5);color:#fff;box-shadow:0 6px 18px rgba(26,95,224,.4)}
.side nav svg{width:19px;height:19px;flex:none}
.bd{margin-left:auto;background:var(--amb);color:#111827;border-radius:99px;font-size:11px;padding:1px 8px;font-weight:800}
.sp{flex:1}
#helpbox{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;text-align:center;margin-bottom:14px}
#helpbox b{display:block;color:#fff;font-size:17px}#helpbox p{margin:4px 0 12px;font-size:12px}
#helpbox a{display:block;background:var(--acc);color:#fff;padding:10px;border-radius:10px;font-weight:700;font-size:13px}
.content{flex:1;min-width:0}
.hero{position:relative;height:176px;padding:26px 32px 0;overflow:hidden;color:#fff;background:radial-gradient(600px 220px at 78% 100%,#f59e0b66,transparent 70%),linear-gradient(110deg,#071328 0%,#0f2a57 55%,#1d4ea8 120%)}
.hero .wm{font-size:44px;line-height:1}
.hero .tag{font-style:italic;font-weight:600;margin-top:8px;color:#e2e8f0}
.hero .truck{position:absolute;right:190px;bottom:52px;height:128px;width:auto;filter:drop-shadow(0 10px 14px rgba(0,0,0,.35))}
.um{position:absolute;top:14px;right:22px;z-index:5}
.umbtn{display:flex;align-items:center;gap:10px;background:rgba(7,19,40,.7);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 14px}
.umbtn:hover{background:rgba(7,19,40,.9)}
.av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);display:grid;place-items:center;font-weight:800;font-size:13px}
.umenu{display:none;position:absolute;right:0;top:52px;background:#fff;color:var(--ink);border-radius:14px;box-shadow:0 16px 40px rgba(15,23,42,.25);min-width:220px;padding:8px}
.umenu .em{padding:8px 12px;font-size:12px;color:var(--mut);word-break:break-all}
.umenu button{width:100%;text-align:left;border:0;background:transparent;padding:10px 12px}
.pad{padding:0 28px 40px;margin-top:-54px;position:relative;z-index:2}
.panel{background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,.12);padding:14px}
.searchbar{display:flex;gap:10px;flex-wrap:wrap}
.searchbar .go{padding-left:22px;padding-right:22px}
#msg,#bmsg{margin:12px 4px;color:var(--mut);font-size:14px}.err{color:var(--bad)!important}
.bulkgrid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;margin-top:22px;align-items:start}
.bpanel{position:relative;padding:0;overflow:hidden}
.ptitle{display:inline-block;background:var(--navy);color:#fff;font-weight:800;font-size:18px;padding:12px 40px 12px 22px;border-radius:0 0 40px 0}
.bform{display:flex;gap:10px;flex-wrap:wrap;padding:16px}
.chips{width:100%;display:flex;flex-wrap:wrap;gap:8px 14px;font-size:13px;align-items:center}.chips label{display:flex;align-items:center;gap:6px;cursor:pointer;flex:0 0 auto}
.chips .lbl{margin-right:4px}
.chips input{flex:none;min-width:0;width:16px;height:16px;padding:0;margin:0}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sc{background:#fff;border-radius:16px;box-shadow:0 6px 20px rgba(15,23,42,.08);padding:14px 14px 0;overflow:hidden}
.sc .row{display:flex;align-items:center;gap:12px}
.ic{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:20px;flex:none}
.sc .n{font-size:28px;font-weight:800;line-height:1}.sc .t{font-size:13px;color:var(--mut);margin-top:4px}
.sc svg{display:block;width:calc(100% + 28px);margin:6px -14px 0;height:38px}
.strip{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px}
.stripstats{display:flex;gap:12px;flex-wrap:wrap;flex:1}
.ss{background:#fff;border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,.06);padding:12px 18px;min-width:150px}
.ss .lbl{font-size:11px}.ss .v{font-size:24px;font-weight:800}
.tools{display:flex;gap:8px;flex-wrap:wrap}
.btn-o{border-color:var(--acc);color:var(--acc)}
.btn-g{border-color:#16a34a;color:#15803d;background:#f0fdf4}
.bw{overflow-x:auto;margin-top:14px;border-radius:14px;box-shadow:0 6px 20px rgba(15,23,42,.08)}
table{width:100%;border-collapse:collapse;background:#fff;font-size:14px}
.bw table{min-width:1100px;font-size:13px}
.bw th{background:var(--head);color:#fff;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
th,td{padding:12px;border-bottom:1px solid var(--line);text-align:left}
.bw tbody tr:nth-child(even) td{background:#f8fafc}
tr:last-child td{border-bottom:0}
td select{padding:6px 8px;border-radius:8px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#pager{display:flex;gap:8px;justify-content:center;margin:18px 0 0;flex-wrap:wrap}
.pg{min-width:40px;padding:9px 12px;border-radius:10px;background:#fff;border:1px solid var(--line)}
.pg.on{background:var(--acc);border-color:var(--acc);color:#fff}
.eq,.au{display:inline-block;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:700;white-space:nowrap}
.eq-Big{background:#dbe7ff;color:#1e40af}.eq-Power{background:#fef3c7;color:#b45309}.eq-Box{background:#ccfbf1;color:#0f766e}.eq-Multi{background:#dcfce7;color:#15803d}.eq-Unknown{background:#f1f5f9;color:#64748b}
.au-Active{background:#dcfce7;color:#15803d}.au-Inactive{background:#fee2e2;color:#b91c1c}.au-Pending{background:#fef3c7;color:#b45309}.au-Unknown{background:#f1f5f9;color:#64748b}
h3{margin:6px 4px 12px;font-size:20px}

/* ---------- single carrier card ---------- */
.card{background:#fff;border:1px solid var(--line);border-radius:16px;margin:16px 0;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.05)}
.top{padding:18px 20px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.top h2{margin:0;font-size:21px;letter-spacing:-.01em}
.sub{font-size:13px;color:var(--mut);margin-top:4px}
.badge{display:inline-block;padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;margin:2px 0 2px 4px}
.ok{background:#dcfce7;color:#15803d}.bad{background:#fee2e2;color:#b91c1c}.warn{background:#fef3c7;color:#b45309}
.auth{margin-top:8px;font-weight:700;font-size:14px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);background:#f8fafc;border-bottom:1px solid var(--line)}
.stats div{padding:16px 20px;border-right:1px solid var(--line)}.stats div:last-child{border:0}
.lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:600}
.val{font-size:18px;font-weight:700;margin-top:4px}.small{font-size:12px;color:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:20px}
.grid .val{font-size:15px;font-weight:500}
.contact{border-top:1px solid var(--line);background:#fbfcfe}.contact .small{padding:16px 20px}
.act{padding:0 20px 20px}
.act button{background:var(--navy);color:#fff;border-color:var(--navy)}

.cbox{width:100%}
.cbtn{width:100%;display:flex;justify-content:space-between;align-items:center;text-align:left}
#cpanel{display:none;margin-top:8px;border:1px solid var(--line);border-radius:12px;background:#f8fafc;padding:10px}
.ctools{display:flex;gap:8px;margin-bottom:8px}
.ctools input{flex:1;min-width:0;padding:8px 10px}.ctools button{padding:8px 12px}
#bcargo{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;max-height:200px;overflow-y:auto;padding-right:4px}
#bcargo label{padding:7px 10px;border-radius:8px;background:#fff;border:1px solid var(--line);font-size:13px}
#bcargo label:hover{border-color:var(--acc)}
.psz{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut)}.psz select{padding:8px 10px}
.au-wait{background:#f1f5f9;color:#94a3b8}
th.s{cursor:pointer;user-select:none;white-space:nowrap}
th.s:hover{background:#16233b}
.ib{padding:2px 6px;border-radius:6px;font-size:12px;border:1px solid var(--line);background:#fff;cursor:pointer;margin-left:5px;line-height:1.3;text-decoration:none;display:inline-block;color:var(--ink)}
.ib:hover{background:#eef2ff;text-decoration:none}
.bw input[type=checkbox]{min-width:0;width:16px;height:16px;padding:0;margin:0}
.ins-On{background:#dcfce7;color:#15803d}.ins-None{background:#fee2e2;color:#b91c1c}.ins-Unknown{background:#f1f5f9;color:#64748b}
.pre{display:inline-flex;gap:6px;margin-left:6px;vertical-align:middle}.pre button{padding:8px 10px;font-size:12px}
.lt input{min-width:0;width:100%;padding:6px 8px}
tr.due td{background:#fef9c3!important}
.mo{position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;z-index:50;padding:16px}
.mbox{background:#fff;border-radius:18px;max-width:780px;width:100%;max-height:92vh;overflow:auto;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.mbox h3{margin:0 0 10px}
.mbox label.fl{display:block;font-size:12px;font-weight:600;color:var(--mut);margin:12px 0 4px}
.mbox input[type=text]{width:100%;min-width:0}
.mbox textarea{font:inherit;width:100%;min-height:210px;padding:11px 13px;border:1px solid var(--line);border-radius:10px;resize:vertical}
#eprev{white-space:pre-wrap;background:#f8fafc;border:1px dashed var(--line);border-radius:10px;padding:12px;font-size:13px;max-height:200px;overflow:auto}
.mrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center}
.mrow label{display:flex;align-items:center;gap:6px;font-size:13px}.mrow input[type=checkbox]{min-width:0;width:16px;height:16px;padding:0}
.tc{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;margin:12px 0;box-shadow:0 2px 10px rgba(15,23,42,.05)}
.tc .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.tc .where{font-size:22px;font-weight:800}
.tc .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tc .acts button,.tc .acts a.btnlike{padding:8px 12px;font-size:13px}
.tc .upd{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tc .upd input{min-width:0;padding:8px 10px}
a.btnlike{border:1px solid var(--line);border-radius:10px;background:#fff;font-weight:600;color:var(--ink);display:inline-block}
.fresh{background:#dcfce7;color:#15803d}.stale{background:#fef3c7;color:#b45309}.old{background:#f1f5f9;color:#64748b}
@media(max-width:560px){#bcargo{grid-template-columns:1fr}}
@media(max-width:1100px){.bulkgrid{grid-template-columns:1fr}.hero .truck{display:none}}
@media(max-width:820px){
  #app{flex-direction:column}
  .side{width:100%;height:auto;position:static;flex-direction:row;align-items:center;gap:8px;padding:10px 12px;overflow-x:auto}
  .sbrand{padding:0 8px 0 0}.side nav{display:flex;gap:6px}.side nav a{margin:0;white-space:nowrap}.sp,#helpbox{display:none}
  .hero{height:150px;padding:20px 16px 0}.hero .wm{font-size:32px}.pad{padding:0 12px 30px}
  .um{top:10px;right:10px}.stats,.grid{grid-template-columns:1fr}.stats div{border-right:0;border-bottom:1px solid var(--line)}
}
</style>
</head>
<body>

<!-- ================= LOGIN / SIGN UP ================= -->
<div id="auth">
  <div class="authbox">
    <div class="abrand"><div class="logo">🚚</div><div class="wm">Carrier<span>Desk</span></div></div>
    <p class="asub">Find. Book. Keep Moving.</p>
    <div class="notice" id="setup" style="display:none">
      Login is not set up yet. Put your Supabase URL and anon key in <b>CONFIG</b> at the top of the script in index.html.
      <div style="margin-top:8px"><button type="button" id="guest" class="go" style="padding:8px 14px">Continue without login</button></div>
    </div>
    <div class="tabs"><button type="button" id="tabLogin" class="on">Log in</button><button type="button" id="tabSignup">Sign up</button></div>
    <form id="fLogin" class="aform">
      <label for="lEmail">Email</label><input id="lEmail" type="email" autocomplete="email" required>
      <label for="lPass">Password</label><input id="lPass" type="password" autocomplete="current-password" required>
      <button class="go" type="submit">Log in</button>
      <div style="text-align:center"><button type="button" class="linkbtn" id="forgot">Forgot password?</button></div>
    </form>
    <form id="fSignup" class="aform" style="display:none">
      <label for="sName">Full name</label><input id="sName" type="text" autocomplete="name" required>
      <label for="sEmail">Email</label><input id="sEmail" type="email" autocomplete="email" required>
      <label for="sPass">Password (min 6 characters)</label><input id="sPass" type="password" minlength="6" autocomplete="new-password" required>
      <button class="go" type="submit">Create account</button>
    </form>
    <div id="amsg"></div>
  </div>
</div>

<!-- ================= APP ================= -->
<div id="app">
  <aside class="side">
    <div class="sbrand"><div class="logo">🚚</div><div class="wm">Carrier<span>Desk</span></div></div>
    <nav>
      <a href="#" data-view="dash" class="on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Dashboard</a>
      <a href="#" data-view="leads"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>My Leads<span class="bd" id="leadBadge">0</span></a>
      <a href="#" data-view="track"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>Carrier Tracker</a>
      <a href="#" data-view="docs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>Documents</a>
      <a href="#" data-view="pipe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></svg>Pipeline</a>
      <a href="#" data-view="team" id="navTeam" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/></svg>Team</a>
      <a href="#" id="navLogout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>Logout</a>
    </nav>
    <div class="sp"></div>
    <div id="helpbox" style="display:none"><b>Need Help?</b><p>Our team is here to help!</p><a id="helplink" href="#">Contact Support</a></div>
  </aside>

  <div class="content">
    <header class="hero">
      <div class="wm">Carrier<span>Desk</span></div>
      <div class="tag">Find. Book. Keep Moving.</div>
      <img class="truck" alt="" src="data:image/webp;base64,UklGRnhlAABXRUJQVlA4WAoAAAAQAAAAuAEA9QAAQUxQSDobAAAB/yckSPD/eGtEpO4TriRJqiIKFd2guP+B32LEfkf0fwLCWruANNP8CkcZfe9wFaTwqpMTwHdgkfMr4FxgnF8Dac5dgJnMPjw9c/bYSIfygZ8QvqBU+7as2btRykdsbxbj/6JHI/+qHIO79BuP0e28IsQQtishRHAzUb35QPu+IYTYf+N5Gr/OdVUn5T3A0eM4Wj7VUeycjdxTcJF30btZxaq4GEYeTSklldqUEriu3SjJbmOS1RWkpDLa4N0QGIrbto1k7b917wT9R8QE8DaAKlLU4+izTO76CN8+eaxdANugXQAFl4NliJtDZbOnDQJYCWaUd6DjwFdVe9CJooK7FN6g2u5gPQkqxU2IoZxk7vjIw9TQqGYkIRdnmjnOc99lQDDrWa67mWNM5I6HZ1e9vWHY4bE3bPsPOdq2bf/9UerqThrJzGQytu2ZU6PT9nnZtm3btm3btgc5j7Ey6XRaVV31/31IGkeuI13/+hYRE+DZtm3ZdiNJ6mNDqLnq/3+jlawqIoo9C+fcByhISYoRMQGWZNtWHUk678uzuFXdmk3NoSbB02DGZjIzM2MwMzvLxZJ/eO/dcxqiD5J7NCNiApB9CQQiFAJEBCIh2EhHO46WLJXW2pn5QKnlvC+yIkZSlPBQnYQQZIR2HMfRSivXVVr7//rbnw4iqaSQvq/iJCgHhaKAMEiZW4whIMI5H/1wfzBI03w83p9kRVFkelhFJIQQ2vFc13VLtVrga1cppYQkIoZJTZpEp7wSCBAEBgkiwkglkhQZB5PDLG2feHtblklqpVQ4WZ6YDN2wHDiKhIkaS904ZbyksvPE37fskJBK+4VibVMpDMJAM/earajbSxkv2dr7+786lkcqvzpRKU9NTxcloueRwZp58Zd/ZSwNKRWEtT3r1pcCmTYbnZ5hrK35c9/53xERARBF6eGIU5w99fqP3zYzmTYN1m4/97tPPF85iNnh+GCUTjzi1GYIXa7smJ2dCJJ6Zljz++v3FRAthpC1N29dPr8/pI0Qfm3rnj2z7lKKcZXZ/uWPry3Fxi6I4rrDuzfo513GeBsnByXzsMPWwK3uPXKk2mKMx5Ud03K+aWwATew8utuvJxifSU3Q/KN21pNT5y4ddNuGMV4Lf+MGs9hKs1zlVd/+9/WEMYaTLrnRQivNaFS9/lO3ewbjuvA3bi2l870s5h25VuthvNfh7ZfevJJmLb3jLVtixtjP9NaLSwtppvL2HW8yMqHG5XajnmQmKu7a4yEz6tLGXmMxyUasp0OFDEleWEmbi1mIdOgwMqaemAmv1ETWYcdXhMxJbvnW91wuU6apa5iRSU37v7/nNTMqw+z6xSGOr3H/xGufP7BjSvmdPR1jgND+9onTu3YcKb5e4rir9vlXvrxZHD9O7zXHHiD2Lj7/yWaeMXa8JcbxeHz3g0+nZJbwX95AVla68x2XixniyF7OTACSez9wvSYzQvi6BrI0c+s/vvU105QF5MUNnKkAyA7Ovfjplj/y1c4bZHBrn3j9swfhiHeggkwuTq4+//nlQmOcOF7PZgA0uPTMFzfHuKnzaWYDOLr++tmSGNeOdJHtR//4NS8vjmfu5mbGQ9r8j2+8VBJjFjlB+fDTTtZj5s5/fu2lybFHEJETuK7vlcob1gWOK+dhA01n7o9fuNGNRxXhudXausmCP7PBFcJ0292UYRHjrW/f/GonHkXE9MVj0x5azW4UpwwbqbB/4pWvN+PYIU98oGtgPdW99OIXzphBu3+yw7ChsX/p9CY1Vkx9QxPW9PiHve1okcaH194w9gTFPW+8ticYF9zvTdmiQFROfehHXN7kjAXeDljXdPvbNz/fW3/+BzbtC8T+iae/3I5rbupAamEAhN2vnjuxt7atm2A7A9nBuReiZrqGecxIemxhANjBdLK0mKxZ//WXexb/73cadgbwp2adVj3hten5j/2jcj/3720NhBdWTHt+beJmHSCHbQ0APbEO50piDVruXbpjcwA0b7771sXRWjq4swvLy/TWRy9fHnPt+FeesO0BkN356O3zba6ZA7UENpj5g1Mvn9qN60QfX4At5t6FV76+na2PyvaONQJi99pbH1/N1oozKrVIANLNN96r0JogL9RhmTW587XnirQGrN+WrEAKtNz+INz/+P3v9uKKE6dewPI4ToOEdBxXS7I/ULbzxStf9VZb6Xi0zDp7XgBIaDfwGp04YbsDiO13/5ystC1T6bKsV2C+EO+fm7u/aCwPgOGjrZV2tM0ArJ9i4c5S/fGjxP5oM1ll4eUOAISxLQaAE7Y/yPorQnm+74uhTiUMgMMUywthgfLTq4DKVz/2y7/yK7/8qjuEe6EDAGFgJUiyQL0XVoA49p7JZmzA//pJfzvYxlkDgKsaVkr3/98KqHxYFytu3yLMQIdTBpCUaRTKBu1uBexczyvJgDCouNIGgK6HEZK0QAiaT7u7WFk4GHh6nwFgWnIUkLC/4mmeqnIfooHo9AIAJB2MkgTZHzjNlz76iYGKZ2IA3OWRgGCBk60APYAcaEuVAZi2NxISNshpvnD6CU2DnK0v63ULI4EVWoWk+pHEgOpyQAC6HZRKsMFqBch+KdMA6887AEwzsVineUL0IzXIkVAASJpmNCAb5DRfyQGCAQrXSwC41cFoBaxQzZNiAF/0W7dHAjDNZERkh6yUgPrQxcMAELfNiCTboPitec4gnugjT5WWJQlsluZLOYryKWcZC+LRCCvEPwAMUlB9Dixgue8NKViAJC5CsMHcE80zLPuF7krh1c4KMEJgdIwWs9xH0wyZWiBEqnkpBgj0SluqGFqCWZFlPtKwlMYGOUnziNDPVSvIc/PDzZRkRsCksMBUegkIuR8cvcLWV6Yjmi0IVphKveZNmH4UFJfNvKcHGy7Q+DweoHJQs7/z2iJsOEeyeYZlH4TvfcvM4bDNVszMlRvHsVT9kLZ8BUtum27jyO/ByltwmiYKOxcsXaEbRXrDqQP3UjsXC9UcPbH52LnZJsPSW5BNcXeePV6a7zGsvUCNKOz94O+/0WWG1U+4AdXTX/r7T2ODnFUW95y4pBID++9qpqqnjq9fYOSCLknrQ4U9F470YkZe6Lg24e5L2xcM8kNR1kNVzlyYahrkiQqrQlQvnijGyBljFNWpqUsnRcTIG0OgqqjyyrM6RQ7pA6ql4Ox7zxFyyfRFUrve+6YAOaWkpIqJq+/dhNyyWHpYntjy0deQY/rlx6Xpkx+5lfMMEqYs/wM+HPlmnOiSnHf+e5JzPH9K5Yg3/XeKnPM+Rlx+ew955ziUE7y3hdwzYznbDprcQwGl0uUl5B8FS/HPcf7BVKXMhshBDkuhkws5iHKWoWbjPKQoRQZJHpKMRHlpDgKBMrVnchAqiDI8Nw8RoSwjKHAOQkVRRkHlIorLCBPkoBwlZThpHgJGmV6Sh8iQynDSPASEMt1chFqmDMm5SIQydZqHmDgpw4/zEPLSMgrdPCS+gzLDTh7SfmEkXpyH9BojCXt5SNQehagam8NgNUNw9eBlBHBrcRTOJCwsmyRJ016v1203txpR+Nb3VIf0nnQFSwM13xjFpGtRVIy6abfbiR42Gs04JdNN3dLvQwN45v+Dn+d1mP/0/5RSEOlTB9ojCF/VtCg2PPWfe3EqtKcFYUXa+JfYAJ1+bfizW3VofOCvMwDQmx9Hw8l3bmOLonD/318uSEJ/Ud79lg6aQIGDOphv+eImAPfUK3+xMZS++r8MqxpuXUq7zdZ/z3UnAurR4Vdv7aGJDg4/DXXAn37U/wHivW/++r/AsHTqZQa2lb0kjv/v1+6+fqNspHt2CWoEdw3CpBb61nOgev4jJYYV+94Zw9ImqYv/176GTGuhnt0Cqu2/w9Czb45g58X5j3pw2NcC0T8byDaGLn5AA7bu0BdCfK8WpO+V/dLtJ8PI8zPG1qH7V639qIdz6KvFnf8aatvrGLae57/vHz68qAWA0GvcCIdwX7sAa0+1z7x3KKlH/BMfvuSvk0PsPsr2DuFZJlcP83M/1n2KIZ0LLVh8AqGmyU8cht50lG3eKpbD0Pp8Hfmolps+0bN5vUbgr5rAoQ4GsPGc9hwJXvq3X73wJqqJ9TVMcCGxcPGNF9r/fGlXdOfvlvTkNacmxQ6GpK2zsPA3PvOPO+nM1hgE/E10KnGCqy7dXcY7t2Djfvej7qD//e/w9vofXZz4ysbDZbYcTS1c8uePMXh1Jqhd/qRf7lRjHobDHElg4eu/QkOs6FydUyXJTWcI71jXwtm//TVGuuuvWUn7thiiuI0t3OjXotGUf6SaR4sYnI4uwsJ/9UdSjMT51LySf6Uh1IyN8/9+4IBAw4nXdquI/0MP4W6K7Jtd+V1FgwXTUJg6r/LM7X/DkP5kz7apuPbyq2UQgYhOfc39Mi2v9WfuMNtrbK2Uh+TUqcfs3hu3l548WTh27rfd77v7DhCQ5n3f/a2vdEcgsvfs9w2GPVGHtY4ZKSfu/X7/969//ctf4iTREwemnd3t++5kIAT1Rl/59DOBGEh+3O4P+g8eVcQw/qGevSJaGON+v+4WUvu+0mTMdu8M5qIgn/X2KwdmQ6XWBgVmw+37l+8eFoUrMXS1ZuwV4PCcu+Q4RxAEEZFm7mQiYewTIH3fU0oS0bHICx9R8gzDeo9LjiNBAgIkTjSTaDDC+rRaRa1jtThltvQKAQEhiFMQoChR0i+lNjYtlphgj+0mioCAIFDfSoEgR7EOiXnVuOtjqyWYPbFvKxYEAaJUJwkEQOpJhnm1FMupvWJjiLXMllYkHZWjowTbvfZdftVKge0VEjDGtCymM2cpR6WOCtvu/MKesFlpSjCmQY3skJRKJ4LZNftFfNjqpEvEDuN1hIkdq5Uz6UiH6Dszv6hjq7jQYhSKAjNhebZW2/E8i3J2op1ds34NkKVKlxwYRxPHoK24ZWqaSCvJ0bSZXzOGY6fa5BoCMUyMmJhMFixpR1G6m2WuugaXyEbF254igLHiwsjEMk2WhbOzlNxdm1+x02TYSIFUk5Kf6D/axDQTLEbTdkzLQjuir8JVtnDfKggiSRnZ6x9ag1rfi/82GW3KJrbDaBm0LC1KkMSh8uiJsQQSSYskCUHwwStpjPse4p/axGQT0xqZpmla1o6dpTXIrxg/44wngDKLZqIgLCq1GtNCzm7ZZGKyW4yGHcuiNS3tsLF+hd79JMNJNDMaTUKZbLmmbBTRZHM22WKcjUaTZcFahGwz8yumt+tZTKCJZpEUhHIlUU1hnpo1O5uMZrGYTJZpWbQs2rnbxuAqw9ydrCUxmFmUhOW1yDThaqEpN0tgSLujIN50YzK0ZTLaarIsbWda7Wy7D3WY/9c4Owky84GUsLRmLK1IVedzLwjTQjS7ffXWgafZmZ1NtmPoyi2T0bSwurUzsVnza779zU4WEmTT0YRF94WfOvz2756iF4Xj//+X8/3a9/t9u+rbv//Xf31b3ZjctJ1ZLKbJIMvOZDNIftntr53MNIIk0mIkJczWnB/cD8zrcVxHCqJRcdz49h+nNtqcrWOa5rVZ3ZiMpq0sy+rW7CmofhFRnjBZRJBA0mhGSqhyP7A39kAkpdJKnaMfS6MF539OzY5pczZNQ8PSlcVa02Q7ljnXsbNrzMd+DVDyP08SSdlAMNvdtWgSJTmh5H0aDPb4OF8lIvntt9/+dE7pZcxJ3IqLhT+51JbJNM1zoS2WaWg7W7k12TGtbfvKL5v+3+/+2pltRW9cEwVAShQNfB9htsOibkpLDOZ17LEfAwNTfevbwbabpgmCMKCJkWW0tlhel8mtock9tmOyzLHazO8x+tutB04en6kFigAas1SklJOQ0CTY/Libs7Aw72OMMQZjP8Bs8/1u7JB0tQCQkdFkzNlksSzusZ15rm65x3asTNxt+z3AACKsbN+23zhKGoYzRtkwBYT588uOYV8ZM+9jbwyAsQ8YIjATMaY2Z5Zlcsu0HctWV93azjx33Oo6o6Ztfh99lfef/3Xj5s33d4/E41PsZ1h47EWzXEmaN8YY9jaG2ScG2GwbZ7rERMxA3MNNy2TZanKzNCyT1XbWLVNT22kv2++Hdr3e6LbvEYuxiSYA+jCG+b8cjDHPMczrNL0Yxsxokq2FEaOthsWyPCerYXGPydRNViPT2TIYNWdFMv+yLaRxyQIB4XWMYR/2M16/sMestR4NZswwDKYhzI5ZWCyWybJMLNN2LO5hsRqZw4rVbPP7J+CBKIvVJbi15SMF6MWY52M+7it7GWaM8fAc1qLZ28yslXlOdMW0JvesxbIs2xmZ3Kzcs5a2w8qU1xqz3xuBKG7NOKtJxVhwLnHriEUUhLkzxgz7kXnO+9jbHmv5PDPDjM0YxBqNhZ1BN3YYy2KxLGi0mDSHKWs59vgjJJboLGpaTZ0HWVYYjaxTp5OI/vAs5axhxsyY93nOczDsMTPesGU1r4+9jJmGCSYsLNNa3IixY5pYdkZGmcPNwVIWs98fAUTk1yNBq8VtfD96yQrvvYd2dE7nfPt2TomE/oC8txnDzHiZMdgXBvM6M7M9psmY12Y2ZrPJgu2sNV9uO+vmR5duwmoE6eawSJZl/ggJxOTS3cVVI0iCME2u7d5y4nSccjqdTiUp9EMMIah2nHhNyXM2e8zMczAMw9gns9lsrDCNjZmZzbbaoy3WwmJa07wNMWFpaoSsJU1I02r+GAlE8INkbrG3KkQajXAzQNZKSZSQlCDnZ2mvdj41QRDGbN5sjzGGYV5fZmazjc1zk9e1GTObbSxMa5qvLix7Ectr0NRIUz6W1qL5Y8zKc+5P9+8L6EWLh1s9g/DcC4W855nXIV/uS+hfWbd0/4K1BrHGvGZN81zGNM9YJpteMJkMJpaJ+bx8HpqdWV4bjVg9Moclts3YjFmtEYD5zl/UDvvixeGovTUxCCB9ID+xB9KXfjC+qWYc/ek3Q2uNaQhrBsuiYVlrbQQLW28s78t8nBga7cNirTU0zbMlgqygWIyZedhKaWdigLH494+l1EQ0Ik67jdZBIQDCxyHox+iRRz8Jx2rmB/9+YMwzi42sZa1h1tK8LmtLBu2TZY/nZMK8rp2raTTPZZyrpRFBO8ROC6q9mLc/1DxHTMzoPrw9V19KGUjcYsycRu1m5EyYph32SD73EwhJvtiPKFQrTcb/YbCYNo0wmFhrXrc0NI3lffQylteJYRCzdLMwmUxrTSxqIemWNFEY4+2PtmktBgNMzJ0nd+7efuEhIEk0MBuTJkkUGVUoBQoQAKnH1ycMMzMzIfqULwdvtYp9++Z9mJjMwmKT9zVtwjKyD1iPz/PDm5axmjm2Go1GS8jDQZ4prNaHP+bWADMAZiGYO63602632x+OxyMhCCS0dguBqwUAARKwT9mLITYzMzPJay+f+xRz1Ujj/gbMNNrI0Mg8t14s03xxWp8YmmZCM0YGy9CQcbawWloiUkykYLX80a95ZWYQgUAgyGjBFxGQSgoSAiAsFwQnIPO+DzNiX5EEfe2ZsNxqFA+iMzvjhmGCsXyczPto2kNrX1hGXRq5nrE1sTnDamSh1SKiPFOECfmbOIwZAIghQCBAguQkCGYQMTEBAGlKwJjnNmxjxmywzayIvPaFHsQiV2006G5Idp2x1WBYzBcHGTQMwbw3r22xmIbG2tmmXNFwhlCIWqi0LM/8Le0c77fuua11iLyOZSSSDDGNmtGSJBKST3mPhQC8UK4Sjp6XXNp2uBrTGDSsl9EwyHx1XmMNWWOHsbI1MTJkLXUj0YpQ0bTIHms0MXPRdM+65ygyDWYWktfMkmGS1x9I5Ks95NnCEJ5Pq6P3SFfBrdtYbJnXZRkmjUGGIeY9G/KcaBO5mjNrzlhZWlBLrTmSRjJ/k8tka5blvQiZhs3I0Jq0yevQJAmJJHrpgV7mswo1rYb0WVxTwKybYSxrnguDzPTYi9hLsZEYdjCCyY7R6krInCU0OYKW5m/8zG7r1j23nSsZMzM2Nq8zhthjxZikJBJED/SQJGsPKF9Tdb1H7Q0emMZgC8YyaNYcl+U5hAvFRsIl6SIashqh1UKEJaW1kPm7cLs2awh6MDZsY8MeszB5n2ce8ZJIfijPJgEYpHztKlJ43JkOGGQam5g1NCaDbFmN0ZopXCQMPS69tDzzsR3yXoKmpfl7Mdvc7prn2knTGDZs8zqzhsweZRorJUnkmfcgksVgMIGF00pcBbLhJmZ8JgYz2VhdNFO3tTNDDDGIIZqRtyloDXkm8l4io0Xm787NtcGE1bKGjWsM28vC0MOWJSkJicgz75G89sIMAK3EuZJkk/ZOb0oDYGDaWGMtI0brtmKIIV+MyWuNWLQIwqJVS9NE83fr3Lm2+RzJMtvYNtvY3ayb9yHPFXokeujxHkLyagwzmJlWRDPT7BHGbiiGvd5hXkgGGIw2bU2jTVgNYggW+ZxF69GkCS1rkVqWRkvz9+/abLslCS2ykMn7amtamOWLW7GIiPxolM9hB9+///l/r1Onzql2//LXv/71z//7p//8r9++dZu1bjOtrcbZWg2yLHlmZ4/QmJkxM8Y8x2Awr8JRenblC+T5sNqjeV0YS6M9Ju9LRH78C5l8XGz+995t3+/3e7fq22//8ttpjDVrre3cmlhirSykIbTyjBljXgfDPOd9/j7f3aYXPdA9E1qTmwwNlsk0De1FhNCP+NBkspbP2diu21k7a2saa6214x4rqBtq+ZggLC0xL5jX+Tx/5w/3oqWhobUaLQuGBssyTRPzMYT8eCJGjIb2WJOZc7nnel2WnXtuO2tFTaIJIWItUgvNc764xz+U27yGWdOiybTskTXPtmBZI2sv8sxPUT5m5NLQ5v2ybtZoIZSdFbVC9DJRCBqayPzDu0UwNl9uGg3O9TFba1preZ3X/NwktLXayG64MtPWGoOW1I52UiuFeKjVMjIh8w91Pm6M6WZaa2LYYVgWrQ1rTdPbT45iLWwxt2bY7Ow610SLQyUnPaJFtVomi5h/6PcyY9DWyBXzjLHWIK/LtJ+xtzxrLYY1Y2atcZdFk6TK0eEkKpHJIvOPf163uRvrmpZLbmgqJUkQQr68T4Mmpc+qqLC2TDt25CjVUTnU8ZxXhl0czGwzy7WMnZnpKV5EyE/cT5GKhySRx1jsrLNTjlOOSiXU/LMyxja2mbbFbZamlB4iz69p1uu+lBeSRL44ZGmncso3OSohzT9DZ8NcbXYuZiVB5Jkf1iI2jEhC7G1vipK+7TjrJKT552jG2LUMG9OQR8j/pT78aD4+nnvxaOiI03oizT9dR2ObtdYYIs+fJ1Tb4/PbWDtERULNPwMBVlA4IBhKAAAw7gCdASq5AfYAPjEWiUMiISEUOU3QIAMEpu4WpQzyFdUTHvtP9J+VXtA8i9onqz8D/jv9z/g/nf/kdrHx3/C8r3oP/gf4D8rPl7/r/+X/ff8p8NPzd/t/8Z+930Efql/uP8X+THxh/tV77/7p/xPUn/Q/8P/7/9X7wH/R9aP+L/2n5HfIl/Y/89//+xu9CPy3/2z+In9z/3R9rP//5qx+Fv6U/LHyy/c/WH6z+T319+8/5P/j/4L3TspfaX/veiH80/DP6z/D/uR+bHzJ/yv9D5C/FX/M9Q78f/nf+P/vP7i/4P94/sf/B7wHbP9V+ynsKe0/07/Sf4L95/898Bn4n/Z9J/sz/3fcD/VX/Jfml++32f/w/El/D/732Bf5X/a/+j/lf3M/3X04f4H/n/0H5U+8j6g/8P+j+A3+Xf2T/c/4H96P8l////N5NP3b///u0fsB/zDtSJJBthr4zi1Z+T1zNsNAnxZsFc9gLOADa0mAODP1v7K4v1A4Cj2sR7gSgJF14MkVNjWGy3tzKnh0mYAq+fw5qnVVmPCqRavKOJIzwkkG5DeRU/oFeZPFZulHWjfO1v7/byi5iNN3OeCfKmMoX0Uq2yx4+vyzdm0/k36kPuJ/ExYySWvknbZyajwHd6CxRd57jJDQVJIrPhH12MlQj8P2EpEfmnFMkwpfBnCkOp4zkSOqcu13zVecxaZpUs0rZso9M1DFacI1qLZGTp4uQhEyRxbfEC5mcFn6yATdbwfud/HuMILlz84aj9PiPae09fW317GI2j0KQ8eMpPIwoxyKTNKjMOxBCfZXc+N9NU4by9NW9MKeYtX2IPO4az6oBgzSJzGcNX6xUDTNC4JdtCZNcdKFA9yE91oII0YbPPhkNIHgRK4a48MxL5dgmB/29WZNnNHxoWr8uIUop3fBQjaPk6Fya91sLuNG6WAU2vX5hdoQ/qPin+5ZKmkJ5MRnzAohzh+5M03aKlNPL6L3NSYn08e/HqEBxOA0a7dc2ik9O+BH5oyw9EvstVIxuY86M73iqrU5U0oTivdEdjwg9GmHoQeLaj3kRXt5skbl8MaCFSbGZnpj4tWYkd4dN4Nhg6DSKO/HBOx0SH3QWAB2PaNATPOYAt/FrlHYORAyA8OQR86y0uSZ7B6tcFAc6QOXNKThV506Y/NS4HnAx5JSd9pSJuYKksP1ww7nleFEe04OvP+lazf1tOtFYf1Jf8lWPS7rY7WFVNC3vJ7gJP7KV+Oj5xZ81iLpdXEKqVsjYJwbPGERu1E6hH784AS7FanQTupAyE5zlYwGrsnhQeoMD9WVoRKpOXsBZyAWPNV4KyBErv7BTKISlQf9ds9PbbRNEkBf5veps3D9m8ar56v2VK+e39PknvfE4WBC0VVxk1/4zv157TQjL8PnbbBA7+iLmFUfuP8OM3pYX++zx336F36XNoN8EzMHK+1hTlTR8Qiz/w5QTSwEF5v/I/nfHZuVGpCIpjuK1GRm7jzp2C8jiwISGNROqJH5mwVBYC/9mgzI2Rb6Yb/9hmlW8yzVbfSwAnRbQi9qhdUQvZ6WrEYW/4+91X+PJdWx2AuaH0K4Xc2VAzo5CECC+J0/l0Ov4mvm20sYGG7RaDE9ZptjpzwVAnmkmUe2DMSMttTPEASOLnKOtMXCMBvQOu8i6lp/eXGe6laZ6EyHs/WU+ErDZQDzeBGauU3LFsVKsu/xCm5UO9M83u4EpNkkPLc2RyIcEubSeE5AM1+TsKGZBQqCJ4Cvu8lo03+JZbNg2lrQl2XFTO+ji/5Wbkw+403rr6K7apLYLWvnH1yzb/jNFuglcfo5vkVs20NssMLGgSNGlfr1WNVljuON0YtqjwTYS8TksNxZ3kqEuDVx5Cwh8jJYKCP4nRkDa7M9QNkNb4YtGpJIgIt165oHmoqz5y/S2NMiSO+c4NKhx4OEuFMxKBUHx7qqmxDPVAiEy4/fH8dkAgvT5kUON28AmnoLMvgvd1JzmriVp4gXJmtPxRJrGSCMMDiF5KGYPu14llJ2z0UWC0lImbZ9Y2IzlV4WwmahnLysT+oml17LfC3lvJW2+hjF5XMlRf67080jgkocYFY9jnOyBL0CtWiNv1ZoCVDvg9+zMuoO77w3q9XRkNfJrY4fc4KKJtQMKZoN8zjC9GPTbe46wMPJ+PPHUMV9pfY1OuHFpf2ImV6qQVd2qnv+0UruVwjaywrO1AEl24gVtlze1MCkL5/7XeDQuIceek0G71/bf0xMGXndRY7Bu9cfJ8LqN7eIpZcwIyx9u6mZBreHTbSN1e2HSQH3wyz6KvXECJ6bn7cxQVVgPI81iLIVnH2UXR/b3w4wvk+pvfMEjj3/v8SFi9bA+cBx/NQcSGWEEw/+iXKTnkdwYAsDa4sD4uGSNqGH2EZ9+WyXqVCMADfk6Gnn3LceUvblzRmVouGDR3qUrikKqxBOdHxS1WLFUGI37BNEzq6ljmieyeNMHUGbNypenVRXFXygip//ftcKRJHL/3qbErfbKbdYZZ5ubWra4UiSQbkN5FT/+/a4UiSQbkN5FT/+/a4UPAAA/v+RdgBt/1OjWLkctDVbpJua9U/UtIGuG2TqVkZYKgS7kMDYedzgTzTCQ/EIp2S0Pagti7fZtVhXJ+P/f7I637QRK30s9QYh5dThVw5HGVwyTIfVX0XzURsQgd4rXk+L4QHlpoDITzYszg4rvrpCa4E0uvUDuQOAPjZ/Fbv+1IzvXK+bo6i7d3bUFG6fvn//haKGMOvgQmuBNQRFG4RpK6DEi1eRd5NlNo/KK0yYXd0ZtOwMiM63F/LvbLtcOMkPSSm7hCugmTBrXD9V7wp1adO1zO3tTJ9yOxdXeSSSbBF1WYYbwjxk7Yia9gqgq+L+pi6f+Ztrw71B0Ky+Irtv8bdkVQ5n50FvrkfySS+iBTEbB5GGKxLRgyTVgUAl2MSBmTc8/skuPIJClXkktQ4jQptCQTp23QLrtOGDvYqEs8+QtSM9KBl2Zu3AfNJVhqW9JQO7OqGV16HNQhHeqGk4WYZGuAft/WdjbbfBZ2PYRo8teeD0s29zfBxCmN+IwoKxh6xrnebKuxcMhlGJCFqFWMbPbfHdZerzaoTIgYDpDKaQOXGt60QfU+QKRuxwbi+chvUrGV6q/KMswXDQvojysZtctJ8BEoodANEtKNdQlDHKlIM8Cz5XQ/y9eIo0PaV0P//SzUit136TeCgbd6h/DXAKjfoIL3fxH0u9gxhv3aMlxkdi6M4kyo5IAiy72m8DfdUHGQaHiMbgwUQCkV2PxqgAL/4Hrmpe2p9ZCvx1KC+ZsC/EWSowl+nPWsKmsMTQlpjPsbaSiNCR15VmYtdbttfVaew8EyZKEviObLNO8ADa1Up33IDPvU95tbsSvScbuoyMtEA8kzzUh7CoIOYrtfBYQmngDDQiA/lXKUHzeHsbTYXCFJxnEVMAuD55pceHfU7FHZThmOZgsq8I0wcUnljV4kVfksSuDJlLyujyMR6EG8imn3BJEAmnCLqjcI3mwSmBJTIw6sP40IabRQfqSKngLiugz2cQCt7KOKUsaK4EAycD/kuQBO4n6qWOYYOabHU0WXtvAo4gozFym5FY1h+w/OZdOLwqC+TVVZlup+eHA6gOxn0v/9YNes6AAED/t2xsODOxVusEUy9PJ++Iod1Ie8deDjZT7pkj2dZYQfSB/kQYS+cu6O86tKR4rltoxvwwzoq7J+1GFrELqJt7WRMVBofsXAO/o4u89B4QbQCHstJHp8PRKZPt/D09W5R8JFOfVBWzC2mkPyjiuJ5d3uYQem1oE5hXmK+jGpAELb1R4H1T2RPBYNCGJrRccFPNBc1YhhzTrflMY10vti8rgLtQI8o5tiHLt9n2NmSX53j91sYxg3/EXql6Rx7IxDXWpEgSfIpXXKbTHmTVGKy6DsccCBvIxpjcpNLCyIQKPHoAOtWRAvWKVyX/j+tCEFxn2N43afQC8KwE8ca/QnM+v3DlUMMaZb+FORNNG8gc0dApoBuKyrOT4eETcxSRVpKIJ/W1cJZbYiDGINRBXzLh+rnnWTkxQ2V/r1HfJRb2Jp2HfVpFu5Kr/D5N1nb96rVdCaWhZ1uW8L/EWXORhqZ41ck2dtUMmHKuV/K5foQAB8BuDoFm4em+q0qsayhxnl6GOOgprFntSr4XxhXx+sQzwfl0zoTAqG7TAxp+drPM0ouLc92G1r7ruJQTGVR+E0OD17N0izSiszrCzZkgYrS3o3fenJnNNMwshNxtghLSPCZ0YGFhFwUjjsq2lgqBd4UEjOIRJOvKutDOYfpiobmNKDb++WFWtAQd2lEvb937elqV4hTBQF9zXEauxY5q1SFHORSG3HaOy/DdoeDlVOn0EAmroG+JgeM7hwNGB7DePiuiYbpXLh4bliway99CNPLDfC4q+RDS6TK2fP1B6gFHMQ8su1+P3bnDkko/nWD2vVG68tqIrRAtoOK/lkct9kd1YNfgoUMfWLPixyqTVOwDEsJeBxZh4ZDK6iuuXAQbFjhuijI+MOg/jr+geAFzN/hQb6EAAJH+WvjUdh6MkmGjpWtOWIP5AFmtvD2y8bPoedPqxpfaWlmnzdJV8K7YAvwqW+bjy/4Y3+8c74/nIi283NStSbntHXjmysVsGeHE8Zk35pv3M9tUVEZHBCf/x8F/4C3HJ3b6a4pQxmrzukmZ0T3zt7bX/KJ922lFdBrpoj4XKreLzQjxBrvZpbXEv4usC6Sf6jubNpJDOsz01dnVFFGrdA8WEh3XIkSD3veqSM+OkGyi+ZLYbPhbCzXWdO/ThjrwvJwgL0k/w8GFTMputSNB1768ITSiKajnfQQykHve0K2A3QkEc2sydrIEPJK6PWg14Am9qT5tu5eFyO0RTlo3nbQ354jXRHKKWy1V8dPhKXfaF0rN6zimJOKluYvb6+N5Y+WLsxYnzhy/dA6WOhwgaShdsT7oys4RONlXbl5QYJ0dHuS26AciZLuhXk0wYkOQkFrUe4gMKEAol4enbO35YFKkdqwCi3vl9WUVGdW+1H+GNQHjDhcOLav3xMubPZnjgAJHbtnJX7dbv5R27WowE6uC5r6PWAnLdh4OgObWmOJ5emMCM+If6IAouhxJSem0a8fPoAY7RFOfeJdLP47WIud0VhtO88GCVV0w8YsAUY3cwW88MdDu1CbDjKzAnBeVpIqK/0ncqOwR56JTUbSEQaPgM1G5AjMIagESsPEYX+2erL3jznL/ZQHGJiTWC/9SXHvTX5RFBFkHMPwkEtRo+KyzQ+Mq6Ul/cpO9C3dn3FzmDU0PTKo2iL0EctrKV1Nhbb3RadhLVFMbNwpUymWx21qKzqy/AaCbbCHAIvjpxwaooujqhjaz1LQxayA7zAIJsBwsnC1M3IQLbCu5Pna1K7FblHGeYSMH0jXUEnhKecMOj+YtLSMjce6NVR/aE3ViyNreR2q1rxBjIwtTYA4ENVlTvN/wZaK7kulaGDIUaDqauveprHVjHYrGvQQ/PpECkuXi3xF4sLhoKC1bDqnOelNqBPNCID4G8jAV3Q7SP/zXR7s4XY8YagLkVK5gzuyQGhiqAGzSpZRItT9fK7tsPy+r20sqDfTbR6okV8+yksd+o63pMyM212Nk9WKkWhTf3qRHPL9b5Cg2o5jQj8UBamedMKHSozOv9hf6QOhPMRpSZ0Wv8kVBl4OSZYzHaGxhi/PL0ICdc9D/45Ou8eEBwLt80PqRFxvzYzRL+1FLhzA2+SGkqwWeOefSBEAai63flLn1PkgKTulGhiVsHFBSzUphZEC9M9OXXLGpwkM8Zgciw3lUGZltnDHq6vjj9AezqGY55JyZ0D7bjuJBt/j28RfyB53kZYvYAcA0QERUVAXvNHPn/fLd0p0IVSUpqm7DnouXL/U3/8r0udWfNhRkYp7kj7mGI9NNHWX4EIq/90BTIFhZg12WVkR0N7qB/hDFIqsKIc4GIAABCcV3tKsJwpAyMIYGfub3cp7RgL5IhB/dSuo8h8CuKryZ3PCJCF9pO+930k3+QsxJdDEaVBpeSwzMEmCRF4VNAnj1D1KgVatmYQP041g2PPNoWHLn+eD5R/+2J92xdCujqeDVUcakAOYYplzxR/+Zm4jSKSth4GfjBFeF1xujusXMDOD3fnLNgrM+7xDtkSF66f8Kop30yP65J5r/oe+sa8KYIyBrtsWtOEfDVUG+t2tUq3JF/39dhGecZBvtNGiqUxVSZgbeF2l8dgladoLg9fXeFxhc0wX0Rvpk2HV/FEQmRyKzzAnZY/gYl3GE6Q1qot/FisedAvs07UUckvsIaOWn0mB/O7vazDC66T4oJB7/JrkixeiCSS8U58hFYwbZPnrE/hwtdqI/iy4vkCPlHuo5lRzUbXve3XYiwcEXH0SshMpmWdUid5Y6995dTeYF4IhHT1uTjwJb3zrAZFvsY398FLHkxq4Q6kMEXIitQS/cWyD6hhjGfuzZO18Mc+ewuRgIzGJieD+9jbTSkQSQpyJpVb+ski/HBe3CIb3k1gFtCxve/C8pEPXwAjjsKCasp/7MblFAAoxjjsfUFRFGoxPWwdInzJGiuh1ugsA3A3PXyfecD0Ny8mEB6GS4cO5UQfZsYPY8HxMw+8qeh2WceE6cM0zGslbhlSsSdhjSEX7meGPRk55Fue7MrIsJjlx+JFcGCWmVzwjS3ffsYJ2rGoOKgnTrxv4hTFulVyZcBgOpMlkVFNiRNhpwLl6L6qwrMA4hNj49vvmyHrb90xIAia1z3YaOpXTxHNB/qDvRJEfzDpe8uuTkqXsHLUoE1/YMnH5+NtiJyM71jTIojvFAxc6AXIzmpEcIvKkyL96RRccWDhuku6OHnaLIfPMi9VShDaM850TUF+8WLr8Xr3Ptu2PNQItxWl2wIQ5csemDXTgRxQEu15b1vhf60ukQDHnusugJCFM4HqoV/Fm9t8JuvtqkF9fWPhaFmjAf1u4vJnw+uIe6PhCutuya6C+0pvZa4a7q0g1H8w+7IC+Q/Qg/8DtMCS1zyDFKMCK4/9zmpL0XchD+v/eBUTld0fif9L66LANNwdswCH0cLKGCyZuVU5bIvy3jWRVBF7TiF+DfaU2meBCOuTEeQWtpkBweLPju47d6VnFOHqm+e+kRE5JwW+ZMf1ozV4tchdPK7T/8ENUFX3cTrJ1RN6FebvxmKlIUqXoT88wpukp3xCIX8nIDx/XEiYe9rA2kq0B8jbWaJmWmqM6rWBOPX4MTC1WfGPUvWs5n/Yof4yYhNejC5uBOlDG4NDLuOtsAsUb2JRm2U17CfZB0g152iv7avtZQxs05kX3bVWf3PfD4gIgwX4S7jj0ut5/SBNLLY3b2g+uYXMm9r02uU90+S9uCrc+3+6VfsYlIeKNFje1ZHPtLe1v93qb9D2fz7HSLTaJR1xwNO4mQw/v+Cqj/CNKNj+dDurQiHOReWGApfRtUdUOhsGYdmt35OsEk4TB1nMgLlz4VDDvvq0PuFMlmv575HeiCfik0nYZkN0rIUTjQQQd3jHUgG4xUpn2TpAqzOMB0UDKwIXlzPLiAAYKjEo7ay9Ds8JirjVb4c5tiV0Thnc6zxqLWdhsZVw9qZK6HOA/wvPzBp8lVrmfWTLDrWMMrPKVqrArxaYcpPQiBSnEyctm6uZXcXGqrCPG5I4L4CskqoC7GxCsmt0fngUourvduuWUTP7KqSi0F5AbpDcCmcv/u8WU2+9FjGjg/XQwd6n/7KpMISLbxwvfe0O60eSRPp4QT01VpkrGAO4RhhGG/akFheNz3aDfAFSSrG+pWa6m2hYSRlQNcU9Fr7Z8cpZEWqFqTIC85U16gEOjxvBwBrs11CrvW6iUBmA+R83e6QPgHS3ed8/00VtPVIz2IiQo2TTiuGsAflrPrblNrPGy/joFulfItJJXHTOIegr4U0wbpPYgDoTBmApLQXKwiJjuZ8B3Yt6ncOO+XtyFM9szesq2rJL7MqQGBvcncts1Fuu/M5TrAInGIWXLIWBPianas1BQ56x/f97f2cEYmwBQZYl59OMEP/LDG2ce8qU233m7IsnW6qrdvxwcmC1mzz8w9Bo4QYk7MN3buywq0AA8lg9dLw3Xt5QLArTtaZjOOYDY4ZZCHbJ5eO5hEdp8j6r+8fRq9ag1t7WBuzW/lPhHS4X0dGXO+fyj7j6Ces2ItGtF3/btiCUIr+w0BBeHux8bUvDNoMna+T2q1spcYNiL1nRMqmZYmT2Jo/MYM5YAf88mhn4huHRlqOJbXgWSBfgj+y5PjcoW54sDttTlxGlGtGqGECPZiK0/yZx8H2s/3zDnisKlIcAIfd9Zqtq41NAcinAqz/Jt8SgOFju/jVgPZyQp1pa7/0DTnwAx8iryZW/4MovLXhn+fzru7T2KO6Z8kAVNKdPQuGrWaSzHOIZogMe0zTwbe1jeBMdMl1/x3WCmTXjoQnqi+L3x9LVBbL4XyOMlm/QjNRXlk8wpKADgjZ2cuMwYmqEPrsRkXfs31j97nnH29pLwDd+xaacmyxLVMGTJl7PDuA1qt72pvk/l3G5sXBFqOgRVj8XsI59MMO+HQplfBuA7srYlpet22YkCdmlNWYamD1yf3SExtv68ns3+ez89r4dZ5loCT6oNXNmVZXKq3gwxcFB5D7fy5kVeq0WV/6c7EpHx4aN6ziWqjChCv9bWnS0DvNXdyjbsy/DKmjN1Wi/dV5MVWVwtWztLwbxG+1dsgu6tLRmYnKB4zOrmMJPHUD6tH2A1Diaea8wlkP1xBahTNWDVaijWFQbHQ2gyC5wpgiCRPk7Si3RqSow6oGaBf0CatYkwRrhNFTMtfuf6mTiPmCgNZgDbJervFjP+TN1sM8lQympQjn+f2/tGEKd/T9Gpnj+EJsdwKjYIt2nuAxil16dL90Oyr6Olc9qedSRqYNBpxHkzjdLSXuFEHiWhltaKogzTR/jwcw83dqQbtYCGotirb2nz5FcdVr4cfJZmw91ejI3vNXzRy/8xAR89dJ3vvbBvSRaTJsgUMHdcPIjFxDEfzWGfU5KU8UurekprAMMIXQg/jHA6UavZmU+uQE7EUcZrZ6slkrp5qwrY3Pv9s00/a3JOAIk8o+vVA3tTdxV+GH1e1sBkkABFh2evycjxoInwI2omBaDQcy+u4XIiWDnaYKX5fV2XR1TWY9GqXnVmURC1AByqzDJMLAyjSsBYaaEEy3UcawhHXi2CobR+IBAHO2cMpyx3FMZjjxZ2EE1mSoZQF0LzpvIVf9sq6rJ2Z6HVXxzYoblf7oHQgEiQppRRXO2HQzBJCb9cQo7JjoIYMbLx/Cr9G4MC4ZdbsxDrHEeeguH93QP3/8YeNvytINJ/8TTfprkTPHa2SLU/QZNu+1n43KuiYQH73ayteu/5B/c/IpZcHsy8uV1uZZ2uym+zYYx7JbXMRoC312yv8GKKOm5yaTPII6o56mjxcv2ZOjx/0pATezEpvgRn8oO3NWbG/uPbumQVyhJ3gpYvUrzgnj1oM6H96xauK8wEB6VRxwNnOgG0bHYsrfuo+RLwu0xV7Nr58tjQVgvpzZ5K2HFMYbQ4L5/O+zoBVBLATwiyG82/bOqd2EMHwUM1iOxKSPf5UdIbC5HY26aBaW5RqS1K2xRUHtyWwWgTBWkA94gk0pyKYJFBXmodqJVHiLmtseYIzvDB0l9MgOfdxP8UXmhgx+clv8GrE/xMZ7gZQUd7eqg1G4H3rKd/aiaD3r8jdb0PBKSw9ZWi+d/Jpg5CBxUpLqylvj5Sbu5R8dXfy3OKwAzHFPmWpoAR4nGaKbXqWKcUCGx6p2CH0pKl+eOKWxcgy0trgFhCADSxCj30gVfvywy3AfDPCydT6s9c/9pATDvRvpUcqFz3d7Zm/Sz6EdXCvb6Yoe88l52quiecnBDMf+AMHIPu5wlTzLZbIbLolJipgRuxQzdMbBrvcutHwTdb+o6xfTCA+pKMh0kKhHPapc4pdws3QpbL47qtdIWn+UFkEUUXi/y0boZerM2pNALX/KLVq7hdAr/iQwWn+xie0A4JUppuiIEvgF/tbnYDHpLFEC8o7Ke1TZe/huPvjERiNtmssRcvS2z8aAkHer4dWpgixmtOaA/EvMXq8uPINS7YfL2mGpG8uXJ5OL2dc2mYJBa5CyLPoS5vl72h5CNT+WqTPFIj+5HquUEMB6lpu90OI8oN4X8+TxbvNmhSvwW7WJyohrX0lVe257186jZZsJOPxyvB4wlk09ErXvodIbw57xPxdBvaDfSW79R7WdaPEkzeSw9q7o4tOSM8SMgO58FaKbJXLeMrDu2a0/ShgUnX7NEM59HzIvGn3kr2xso2gORRt9HGHzdBkEsVeJ4bp1ZnjUKIgHmI1w+x/olJ59DGZZJEXDdJM3aCrkpiXybXEyfpljJJ8Ci78bhrYEEMx3S3me5Hm3QcsYJbDMQHqXCMEgxLUGzNSDLkpZm2smpbEIMC9tVdgpoN0nwEorWXv/Id86tjLaDARoO7pcMnEYaRo4JvelHjYuJKJB+nT8nIH8SPTnfL3LDG9bKgkVLT2PvL9WWAG9phzdOGXv0CxM4raQyq3dEo4LybYHloTpxk2G+X7nkYdB3u2vAZa/OZydYkt3TvoOBmsVktcpeebfIs/30ZANAgyQsJeV1QCFXpzYk84rRaGyHH/Uv+UpElbXDNW3ireTOmzYgQy1vdD+NXtz0OoX9FjJ2/9FdFMmEP/CbjAfdNoKJZDsnxDukDG7qWR0zoMP+FDrgdhca4uBkcez6Yae+UXFmtEcsqZ+GkgzBmMiYJTJVxXOjPjfjTiMb0lUgDqJNGN+wAAAErhtDZayCCbkrX/gwJB9u68UMxpWpsTCeh0GcU+V6ibeuH7q2Ck2ew2skNSNtZDMNcB9AvPkimdnolBqx+ombP2XSvDYF81+fbR7P+RaW0cKLqrTTgUhDgx8Mj+I6FEdHR/vALxA/NDiFq7hoxkJrv60139yuOvSKZE3jdHyhgN0HU5OIqT89eR17A7+fko+vhvjEaYsDrneHtaalaacnjyjJyeGesqqYZ/f1x7NMI/WU2iQaJcu1LI/R/DONzns5tfMOfmRLLrXXloQN6YF3CaMqiNM4TLbTR1FaN47Eg/J4Pbn3pF7li0Q23jP4m6patlFKGJ/cNSexHyFH1sSsjO+l0sIaWtpBaXjTi50aXBlrO0cZ1rNG0phdsKligCViM3Iw+GSmWz1Vw9wJDWCtvbhHWvN8OPjKvEQmTog66DSlSFts2ItpEEdSy1vCklBuDaU8Cr2FHVCxLoM6MP3oQXaeSTYr1l9shcNu/qNKqldFnKPy02V41D1Thu555V+2yoybhpOckxw3/uNiCUQXZ8nLcYCzo5wZ24FktxNwol2ywFYbbreb6Bh/SrSuCDY1qQIlEph4VgLNLr+dkvn35BxpshLDRG2xXXoqE3kjZPXxLA0P2s/acGq0NT66ulh+nlENwnguoDuzCj0eux1ROacUnutXAHBhMetKir2Wd8lCWC3YdNtu2626N8vemjzrjP1Tliszx98oxPfH3GTm0IRgEuk/PzqPA4BNZwVlpfEiWq95Br9JE2YnKTLeNOvlmw9ABk15VJGPvx/4EBBdYa/DmNoHWbEYAF7fRmdYuU0Fa2PwzKqFIyQSmGtKxYtJOzJWm/3OF/GlFH6gJvUy8PhDkovDZltwfsV3VvGz/ilv2toli4ebavZm2RHEP64Wkr6pGRUTRmCAL1KxQT9y1vUZaZ3pMX4mb+GgAklOpx6vw3ANtBLhv4GRJbEJd5m+m7dr3+qOWiq6ad41IBecIIp98ycmYV5PVcjVi9GgJbs8v3rfvzzbw5Rl+Q4bfMUxVpORMl1oonoZSh2uuLsb6667HyG3AbaQoAbZQj8ucomAoYfmqU/kTz1TY5M90gTb7ryEwpOGmsqrN5NqpHJCyWaxPS7LBqSSmG+qmeZyTMfY/ajQUVtUEPriGE88kkPtyU0s8PORyrkuBwiPzQz5gWrLo73LW6HRVbDTTK71R8ynsPsqGsmcsxEo15D2yRmQZZrtrQuDe4CHenT4spxkpOSfYNq9YPNK6OD1HYCnq1OcIBMhHvTKPWuCs82KSODm/0meirrlr6Zt995zlSItCvbYf+xHoY0CPDMyxSXlY6F4Dxzlhz1tws6o2S//C4mxrTn1ntDJF7IHa87clMNITxYkePxWcQGwCfQIPJy0729HaLMwjGFcf+5zSFZisf1LG4kSDEQlrTC8ds/lt9Aueo8xWAUMZHbmgXIBKJzRijR1W32BgTnPNaL+vdGNmtgi7OgsdJYvvQI92rIyjeGPKwhEdbbvuluLiT7upLW/fkzZYTfiHvszmat1Az1TWqp9fGVDYkjpqhnf1b3b4AJN09tG6oH7MLvHELqDGp+sY/bd6WCyciIu39b3zulv418g0DT4bQgSAHq2M9CKp2khmPKGjiupHwPsDhEF2m57y5qsTa3h83xhkprFWyQiVwgzQVVtAhK35lFmvbPC6p86z4ZWLwguKZfAyMUWpKDDFzGXVruiQYiW+xiibHXkZGH8mtte1YW6BEM3NHyb5rdjDoJgyJJFscbmGJusrTkvHYKLdqjBxy9gu4ohkaHYNJZ4MZ56CLA2WnKb+MYk193QXiF9JaAhNWanb2yQX5GKiOxmClFkusq9uiGVGN+sgT9a2YagHFTvlvldqb1lyZpgQkf/5lQx0uIgRqsLMV5QaLCQ/+Fho58fWGtWcRzVaWiPDapo+34iHP2kYTu9g12jymYqngiJsQ5M/lDYGIh/EGF1NdYb9h4M0P1H4LCsfanaGA0dm8ZXAiQU6oc14x3BO4WF3tr2HuAWVa7LKzBOu8cGqnHNkc5W8ykeZYEs53g/s8tGP734Vv+Mzqph1jSWDfr+wVP2scxr2xKkYgen4c4N3hzH4bIVWC2JUHUhYszVGHpNDpPdCBYfdqaKgH/ml3Ixf+0QZr3WqJnBIKLAgv/PTHIDWMc8n4TQ9quyDE/H68TJ/xZeaztkO5VtU/xa1ZXlAbcU0Waa2mh4V65MBbOf4DjfcVFXz+CpCRFrn2RcYx+OqRxarLht4zIe2S8Lq6VGxnSd3l+AYmrGMOsTUAzWKvqqNWvZ9uha7mtmj7E16z83cJH6iRYvHa8IVo16R5Dt7YaKKQij7QYQXkrHwvmsbVaRRD2qM2UVyPuJea347AZ/9Uo/RRu0N7i3jcIBlreK/4u+d+lZz7UmhXzpSfwuRl2egMzFe+n9CeF2HxJ2FGQ8BeDG2vDgNR3OI790c2cOlCq0r0gTLSW4/tJ7Uej60DpL79OT4ID0M+/JmzLIJflma4X7PxBqXr3blqvs4y2mIVXcG9Yg91Ij9I3GcnK1AkH0rd+hGOfkONkVefcihZsvvvTXbOopK7Es5WkW4ndGpf90Z0b9B8zy7Bf5AwmhxdeF3Jj78jwC4JYNrowRZzaSA3RgWlmg3VLtVELwLAB97/VlVQ8qOcmtgRCbV9q8JNL05b+XXb76DqPskywfM2WG2mu8Vz0VDUFP/ujRKBC/H/dPYfCBTwqbsxVcuy//n7/dAp2fZ69KLfgHB+nxbVwob+wA0CmtzC4LNZD9CB2UZ7aSi/QRlUivttNxFGTkjcqjlIoAdNlWyIQUuouwaXnZeZR0bDKksjbV4evXC6BInEbNkAuljD3Dk7P2xFVikqhvMILcQpNhTOiCKqi8DM5NAs1KITMgF4ByjBhsK1aHcWGEv1Re/xR/QPRSvbMcLaH0XPlsDmaS1T9ZAcwM2JMdlFHcqmW8oNjhlDQ3vgHsqJ9BPJLdxGph3M7py5iOpKWYbFByK+Tql8KrxbFIv3NfNRKjyafRTz5TrMHZKx9k3NnESg8ul5aivu2C2IidzBn/McbllvvrCCxqvOlHJWyta2g8R14LAF3208vsLP/a4Hkkwtflc7OMX0VOeqBBdESiX6CKuSBAB7vatUkoFVYRUW8FgkA7TkINtecKL6/gM/ViUJdVL4EpUDWx7HEAlGtsvq7lBXVHqTGyCUA6FUkVtOt2DAtRlO/p5CS+eWE6pFc64CHGzvBtLzXNwtPVz66RcsIdBnkvO3JxkPTQXBb5g77QTWU9xSBocZ0jDg2Bzz9sqd9rRFBMEbHiHOfxNzH4RJXTyxT6QcCCcuhFz8imFXrjXP5LxaLn+JbZI31ef7IOjquhZFO5ESMVHHsY9OkzJuXc+H/AfB1v2k2Jvka0QW0fWcVRTQkA1KnMalDsmAWveTk4Du9n7omfJgguMCH6xCNApxiuenzY7dfYm5yU3LfqZ5bIg0kr4RoC35ANDUW40g1xy6vio7lri6ZtVeX/SIknb4lbrW9S3yjdT34saf3j+J7/zTdXVvkPxwcmSXoQ+ntwrBgyh/cVTJiJkxaL71p7COS1a3hJ2O52H8Wflkzf+bXe5ybbwkajKIZQ0BZGbPVJPt4se67xRvVpez800rcTJQnUlvHRABKNX+2tj4Z4Rx+ekZRxJ7eoU06Myg0hBr6OBmU0Wq2WKK7b55xQys4CRP+GNosurvP5b4xWFINmGlQNBe4efOKkAfipjLoQBWp08+2+ar2b1LzHIqKXtQSfx9cxEJ1DLhtbEoQTkHWGa20LpWTeUVMG+ezWtALR0/HUlhkKbd+9YvdmVOPeC959w2Rtu62UXuPhd9BnwT+G42je8utT9//TeHd6sjHPxn6FRWGW6u8eWmhORe8tqsmrp6KeBi4n3QwHbz25GdPzfbON0KkUgD32yIpnaQh+Mtu0e65y7a1rQypxfzuLUe1oX6HZNCkmOSbjYztda/GHeUiZKf7od27crNv880mjOaW9moEdudqiE7C6i8QHJbYO4TrjSpqYB1vMNiOaLxMLQmfEqR1ItjLn2ANpcz+ErV7zKZI2T1JOesCHRf77eAKQoKqs8QT1x7qryqWQaljLbbSabtPPyhmPQ7I8TCDq9xMOMIbdkuCV7rKxfCDK+i5Aa0sWcFI0jJR0rM5X+qp4/iQZVKL8s5MOqa69zl7WVXqFevBFJWGpHQmxcm+p0pKVTpjb2PPToCmuITnJOCCCxgPs2Kpfx5hVZeUp9LGMNYGxCQXAZxGxzD57hu89Hgsu8S1AQjE17C63h9fEAnZqXSYdwLYdQQKlY9oLmGOASnP9bP2MJUjpZOSc/1XV2xlAKUT4ov0p1hGYfaMeqwRtnyIfgOghZR2ZYEk8Tl4TVWsB1/UUF5uX3MNkcguPde28a2oSOscLxcTSiOAsXFxpPke0RhTM+iV/mjuKiy00gL21ZCiwoxkvsM++mMprcywsrh3+EJprGzNnZSqF43pcG1uM/X7pWggqhKNV1Jyltqc94ooAYN9nOY22Ah9UQEmFdnvHTEHTN4/RxcPVWSxCnfxBcxPEfYLTIhUmeiciy07AjeOEv2teYZNTTpnNKpWncHZgIFUNxsL0/HtE0hZEIG381Ckng+/lG2LRI8T+nLqRjepiRM/t+y3E46pSGEPdWz+tf+wlqbua8EQEB20hcCxuE4Y9jI9nFw04yxQI8KC5shYtNMqs10AysOGC0MvB0kHIGpGX5tDK1W9cs3EONj/MBbWBHwFdzTqXUX6ntkgT1AAZOzAuhvk9sTr9aoMW9yRUwtLKUKViraY3sXxBIhB1fg40acbGJozNPAOO+JsO7wNmsdrAtd4jJLQaiTikR53F9od1BzfVmU/HCcCdu0HHT54WlXdAKpkzh9hwWwhPgXghej5bFBW2o2CH0vfjfmN0NTyg+3P1YGCjWFuqgDov0CDzQCwo/j96pZtoDXC9doToMO11URpWhzSEtKhfRH5PmmFPYnHHsITuYk+UHGiaMxPYkmeBBZ8Vmbq9lnMTDWXo0fKZDBXTnicBjSA/6j5sD4wurkYNOBfCib34UmOy27nunGZiVHVGnlRXm8Pb5c9wFGVPGgZIcoGTZfNHRM3m3CJFgAjAfaFxNF/TijzCVUX0XxhL94uunWO5/H8l2OZNANNYbVpTuF+AOFT5kWMV8XrNvRNPn5j3d4Mno3DeqGdxMlTMxekIyMj5mdmkLSvfRZ0AHyu1S9mcbdmPKJoIyZcaTlKyQko6DsWLOM+2kZt5M/VBFAWfHC9CgX6Bv9Witojfp4ToFyC7ZxXPfD2ZV7m1uRjT9b28Zl4mTRhhs7llpDdaBPQ/yAr0PVztY3d4PGocxgje9AQXSzNCAkpjpxVc0ckMgyUlPxaB1CwhpqRnuoDyYgAItNbZ2HsgqafK0EVGMxE0MUgO9DL7zOayzNboxZKiPh+5VUcMRHocp3oR/p8rwC/AcHWhsQDEhJY2kcbRGdxFOZGv4IY3MEtMmFYtyQrh4aNQgHoaT8EOmobQIV/llQEt2+RVnkz7pxZNuPxATFjbLjsdLFz0latSnN/NNd1/Mng+2WiogIvChUubNL0Dsi/y8ucI7g/3T35K+Uteml8v2Rx/zRfpxxQk/4Kl6tR5iyNpGmV+hF7Hj8oKJIsnRMvKqoi7psSAUEAiI13GrYvmjQAv3Dha3JILChtNz97jspb1loi2OSKzcq0zI5ml9qOJJuDgqFZ3q7If5SeswhYtzS+NIrz+HFFch12Tn+go29ZcJDnXLv6iVmiz/5IsBjeqJMBSBjm4us1kr/ckJcOI4Jm/UQ/enjO6AY1wkQJAZ3QxJ0C561+q5MY4ughXw7Kbx7ZMjZeWgBUweCEVcxcCyQk7dLQ2D0xQT2i/K/5R+3zyXnHesZwz3jeYE+KRP9uoaTqQhEtJDZQm4ftU2irfOO1uXNWJ/EfLiHfh9d+pM+aHx5S1Ghs0f7eaGxjbxaitBrjNwVsV7xPua8Xqgqm4cbKROWMzzDsX3596/T1ZOCPVTaup7qqIFbHVff16vLdnP8gY132n2smGNmjyWm283qHdzo61/tf3h6aymoI01BEhh9cAqNaOHySONNoIk50QaccDMQ8wCzpKH8nwawavauFBq8gcmTdAZO09KPTG5lIZlFZzPBrUWWwdHbFqDtMDWDR6FQfCNSjsBJbYrVoMUAUzyOAb15O47RwW4PH1ma8zUYtf4ViYc6d/yv3tWH9lv6GtUl766Z0JYpf5JruxcDp07+kySTGXJvGN+rixLZsuEoN9yuL3Y0+22X76uqmEGF9+tA+jZs4fytV7M3c/cmNlrhfyPqbSXb6eoBvaUQzVGFuLdjhmYZplY78woMWuHrOmuLTqvl9PMVGgqKYk/leAnGy3NI2DVaB/TfqIU+03AsReQGYb/d7cY3h+0gCCJ1BtT2eewPjr/dLcvEP4K/x4mhtPL8s3riAd2KaiZOliJGXrqdYhvjBYDleGadetreqrUoBlPtNMhJaFT6bLQrGzSU85K6ptudfTozoEPPhAfKdKeOO8EKemeb0kioOTAetMC8Ahq7GKYbXwQtQNQ4RZs3nIuSqWmgXjIGVcW6Wew/dKokef89bFIHIHtpf0IppCIhNVXQ7LamxPGQFwcqedbzg5djcvtNlD0iWt0IyJwy3jNWDTxekhHDJRw2zqHBx6es1TdgyfoPQid94isQ8O6mSlGUlhkLHs4WeT6xlpIc0vjVZ0DtELUaVV9KMp1AqoHEx/Or1JfEP8I81APtkfJG6BwH2ZzH9LkiYcTQrhZNPzLvJ6DypMUwf8Fvmc3F5jl2GcdghsMxJZEGJKnkx/WFIZye77QQoaomxsqLwcfs2+ZhJI6U+E1t4ZE2A0+4Zsc/cszcuUHDvNpJ7LGRhmvm7LtujSltjmrUxzE2oPsVyQzUciD6d2rRwZiS1h5ej+1qsN3hIHrnjf4MIjymtFbf1krRatlVuWlEq0Qcpcf6xY3FPhH17lWMxXMzl3367rUTKfle3a25ghXX9SIRK84cydqD0QWs4h8EspjwotuFwx5RAFPnlPNJfDk0kq7rvsHQdwIv9SUFoTiJW4C55gUIX5baHdK3iwUVzeUBz3yF+l7kRdGUPRkIAckwoVj2CLBaxWoN/eYx9H5nwEgK+pTZS41LNd6hG9o8PcxyMsZfB1fNfgt+g+dHC12+xHGWY70XWZuoPuhNWSufrDD4Y+LBm2sU6eUHu8PZcCuyTUbTuElv23z9pAH/Z/xIWamh9JBRXrbnlEM9iDKqJj2jxlh8wu9PpftAkav9ANLMbvYQjXZufeU6jCj8UoFw85rtHT2At8PzAe7Bpg9Qjv7pSFYLV9LmQrvjGNHEA4JlkBccQYmtwgHafCUKJoBnFsofdHsNuh69irztHJvaRWDsxw/4IR5apfu4Kwcloa2FOqLv3y+42Qpz187E6dc7h+tfu5cK7o9ZGGqFAmI5x8vA8peWL34HP11UR6cEf2K8vua0h5wIGgr4XYOP4MUJSCWNDuz1ktw7Ya5ivGt6pYWOyyU2kDspGmYfDPmfQuP/ylZ6qdsimayZnmfKxreap09g7T6gJxjnEb3nawTQ3cYIpMxos9syc6uULRTZ6wBIE6uMlCRlERDR7PbazX5ED8o0Nj/UUzp81D5E7sltKVRajSOKGv+XJi6Pty8sG30q/0O3twFhRpB+4FXmHGUzESf928GPuAs6zOltHTxwpmvRQW2Sz6VHtAcabOlu4bdHw+5RMaBcl4tIOs4fvsAQQqNybA2mCnWRFjaz+xNcEF2iKcheWRrW+o08PJo6n5mW083muLhKOIeonkQOQft5xbC1e9WTXIyaA0y8QJyhUsW3WGConH0MJ9hSYycRsNrhtz5D/+gvs9J6Gl8+L4NbrDjRmSfVQQWpcwsTNi4+EJ1s7J16yyB7QoUnm/Wx9DRXgmTuUy4JQoq55rCkthHnTnl6+LRCkFZMiIBYcBsGPWmbXzw8UsYWBXYUK9j/pUwUD22sVsVve40Bp8WO5Zp/5ZEZGc32mS460K8D2VdnxxnXLSfQfp4GrUklHWC31nGaEyywxHY33Ux1MUepqfbMMs2HL+NMDT5oZhkpKNskpoDwdfgg0zfwmDLjm5BC9ZWf9qAQmh3ZmZCmpdj7y8qpwmXfHBZYh7KXh0t15Z8l815DIsilnWiuAMNNFqraMEDMYhDHflV80A8687jbr5GKFkTvbKMtiv9zIm26hbwvxGzWTZ+vVI6wsHV9rRHbQpkX3pxMH0MSNvnxYVqfg3if0HjZlb2w2aXtJpwhlkRGSvdH08y/i0lFxzt56nKR9BCgRUOgzAQkj7ihf12xuPqDMtYoE5T7cZkYw5303gb1B7obl8XoZc+VHCEZmuZVmmvCepNbtR0ayaMsCCBb4Fxvb2d3g6pIOQj7/IkNW/0DPsfHIb4brBJhKuOnR3irtrgoLU8D6myyUHFO/KTf+Hk9u+qhPmRBD/bUqWLEAm39egVrK2SshPUAdrioLPAVM4uEhgwE9ZVOwaZ83pP0BR0ehTkZW1kiKhjZjHxhRfNYy2IpeJFSrPPWl9RXKK0HskyfY7wX8+kvCbaZ3NQUD06P0a5d3/YZnau6tn4ffo2OSPSt6M/QHdyqULQgjStdyAEfLN3sayQf8GJT0kBzdSlSNEZ6H87iJ2VaqnHDSMpg6OM/IB5DbunoAeRnFwcM1/brpUllzJ17iAB/DVZTmIEXu0MHaHvQMYDf1mrwpRqxW+GFQ0e6erU6hN+LxZCpQpkuVCWQqGEn1VbRJbOVeXCSwYBZY1Zkys+uq/Daqc+uVi526huzlzc5zRjgRHB5Y1IvUSviZNtMpNBT7ueZ3htj9B7B5vTXx0p7J73N5uBRP7Tl4TKa4EaGUbbsPmABwc0NT7W+beugjgw4ZGr275Mvms5x6dCpdYzlMRMz69AVdJML2hqkouFCPUakbdPF+2EVBZnjQQEyM674BrBu0hHrKyPVWEUcvadJtOX3kckB3Yf9HaLZo4DpmLmVDriN2oQkARJ/cQD/fBLySrKuqoKTPKz85cl8l+BiSzTzhlqRGYRO8Y9UOhCIlZtGUx7fZkniHB7+cy9POUY1fXvAkuF+/zogbe6N99keWpGGHVuxcj628bPW6duTN/d/isFxgLEzzug9fkUwrYYWpRZrCjOt+XKhwh4FcLtQtinx5ZQKQUcG4K56akVUesI7UPHtVc1wCZhkM4Fo6YQeruCVEXihnoY1zP3DaTBsxOJ4o6oJYL6QbWPav/3EcLskt4EwK1rv+3FNTGNfqqQOa6KCiLa+fqNPj21xi8tejSqj7JZ9vhZ7G2mQGPNWVnIRwldvKH3bXspmqCMuYgWLQr782xlAg9nAhrlC+mG7IHz46sudT32au5jsTbtSUT6a46rrRiQW+DGBKH4RLw+lf+r7hVw/EGY1lUa2Lw2s1/X2ZM72pKEHqbkxtXolPIxBfu6eBG/TjIeE6nz7EbyazoMkR1PdUxnHxyTfsnojXv31gE8/Yj9jlOStAPmXjuLZPQ9nt2Tvs47ZjeFZ6B2c63PPl1Xo14jGokEbIrEpDqqOAYQ0U36SAvo9j26RV79+kPptYyBc+IadZhq/PE/QPKxsuoflxWSHDsMbb5phslKo5HrL+7xaEDSOLNCx7kEJA3nQ6SEsRRzdwwieX6tvohnbhoDcXIbUXUGdalGMUlCsF4hEkYmEbOuK+x8IUn9wROoVNiumIhwVHLR8a4vObbxVJsajgw7ug4se/8jO3ME8OY1Qm2KB3r6KdXBdQLGyaQiLmrQrT7Dd9oPWtF0tzNaexo+pF0aqyw2QxWLWq+ikfi+sLLvqB9HQ46O5TvtP0qAafDeVDYs0xPcTjHePyf2KCMXATvqJ9ImxPbegKIwatVhtn9Mid5gAqiJe+u/S6RP3zaT1mxUq8LpCOZaCmGUl4PlQRsyVbqC8urcJV4kf0vHQbGyr+4hSeHeka/sUQABfjFy77ua1pfUBRxtdAnuUbrqJckfwj9QNwUsb+Y3lB9Vry2ZfZLRb/ueJM4xg02K0bEdzNe437QcrKT4g630fjSa0qcVGIb1lsyhRk3GGoxf49XyYFLWD3Z8bWLxb1wbZhwdwqNhYy3HMvDM0ZypAUdG/5qd2oOfQ+8di78HDGYlb6uMFkSxjjMAkbIFZp1PVU7atX8CWfW2wNNPB/NNP23X/oBhgl7NWqqaYvWq/nhpil1Mih9+2KpnQz6GPElXbM8kQy3KU6Zx1kFn7ClQl1J4s7T5SYiHf/VEVUytz/UqW7R5MG1x7MYBHmkjBHyG+VH9Sn9ahyWC7chBrJUxQFRORXl4lWbpA0QTXEnH/QuxxzLHdbBRkb7y5CbctjtNMIEIVdMoXiEkHQ1r9jaXCuyxglEqmqFVbVrc93tJErUiYLIylIxSE9Nihj8NAnRnj29tkcibOx33Msm86RlkWZrhuxac/lboggM8TayFNTiD9huohYP+oZu6ee9Tx8fzOO3LGUEcvHBfGasP/m3BZ6HZD5SVs8I46mwqXg9E1RnCOTmG4KhfViIQey/Sh9148zvfp7+bl5wX1cNGoAaZ7ITAMBVKcyY2UOD9G4il7vFc4F3Ze2PAn9LYkyaqEhNUWeRp0mD8d+F7uPTlhrAlYSpt+F90d8Av+Q2ErW/LcY1UMzduyb+TwxF/MhhRUbDDbXikYJrnUVdRM9UtbIfVE4FIaog1/zkIKtNIzkIjxBs+gaQZ9yXWFcCq+bGFZ5K3vyRVCjN5avj14qGT7uu/B4MP/LKZhr0J5MC9QghIwiWE115Zf27jqiTe/OeOStSM5/t5gRbKWzTkLA5HZiE1zI2GSoxBfUMPCvFsCWX11ppSUO18xRVpgXHyyQ7sKn7aonnHZ/4ZGF/7KKm1uBV3dbXoZh9rIpuPJF09TpqB/yLivvNjlInGIU+gaIiS7+O14wIrpuK52dMF5U/wNxCuHp5PFHxp6iXbatq5tirVVHKIv4wcIR1vsyhfWzdHHaws2jZ0dEsUlrERhgTkY8jrzHwOkJD3YVlLxFKi5cq7MW71J/gXXWW+jEObbnaclUDsNps9bYrlXWqgiFPibX+gGu57726D5kMTGp4G+iy6TTPSyfhN4PLDeMMfk2KFN6XaTHcIjpqjX5kyKryJA71F8e/04EfbQKdbpZhOaJM8vq3iaQ6UijAX71AtjFXwxwvcuFwj6Hcf9gssgWku++p4yskpjnvBC5w/mmJKOXC3aEQm1OgXoNyZueq0y21Av77/YfBkD4ddZ4Hhrk/CKz6Oe/9N7Hbkb3/bBlniY4GliwtzjixiiC8gMAPsWQzwIaPo5hJ6cc82+ajkHSXtiUXTanPonpMfAzIPr0pejWeTMaZVcUCvVXWOlEPBh6uxMIyEgP8r2W2BK6pqLFWMDyeoIgANwp1jS2xOmYSVIViMFeYoo5rFqpTpi8B40MAWWn0MFJkkWgAt41eFY3Yf3X8X0scEaHcINN+6BuTp8zyMB5nLncQMLlkkvT799CRys5JeX9rqDpB6fzjUXAXVCf7a0ySmMh39y/zdnYzYXKON0OIZUMvcjxlW6TEgYLLzActvVasj2Ez0p1LVeMjkn8Z5b13LAxn2RCNW6UvKTkT6XiHqMmKAAudkXn/Bnae8ow0aJ9w6kvEdTTX2ADu3+tNo7kN0dCkpPYAhY2P6gcNgazJNMWHS03IN8tSBfPBtLenNwbSvuR6Qs6jNK8xRwjtipmaMjlhcw3Phod12E19azGfE66rxjvjm7QkfNyp61hVySuvA+twIBtAKV5Xae3iXTmT7Qp+lnNOBii0ZDy2xbEQCUwn7gy1omm8GA2x31755Xs85P/cmlhW+T/9tg3i6ZoYzr00HQ78GbU1ox0XXLQLJVGK5NmdDbA0mvbm0P7ci5GLF9N3KUqJPLPxhDZYEAlO1nIUDbABZ79x/fQhflAAAk8+fi4MTGoDkTKZGjmGVwDMQXwQamPBkwiS4yBDI+SDrjR/Vi5edd18PIFX5UlvLgEuDpBZrGjcWOzJhG2a2pQjs7LfAZXwu9o4M2SnOv4eM6pH+hPJ7e8ujGZlPYsA2VhBbNOhzlLY2bzXe/KDckB+8UqHAGnGxatXkF10DEyVgC62IXwxbStDI/SR9ezLG5uUt9DOvWyYuosjEtkrI5SVNRlclXnioH/Z3wg3MDzvD5BYnTiuLIoSjyCHWXWMbfAfu/wCiUGumsbgpr8vQcI9PlFFbEn9B6xTHN9DeHvZTIjpaU2oGDfa4uGzlGWmTHDcLh2Cl2k/BvfW3COQ5QrrSrUNyd+Q/GkVnM0lRUc+vH8grXmHGnCYu88DkE2wCYFyyVY0jiM/czvAMYpSKlS/v7za0qSMP5lKghGFLKr2c58yWv+dxOGn4O/vdn5ZffUuoqM2ZI8XGRRdjX6KWANrYlPDXjvpdEpte7JV07RpyIaGhs1NKryohbEFLpfncRKkkL/gN6Pfsshz03W0n6ojigruD1xvnLa2HNtvDTUcydBKzqSHYcwh2Ipbza+HaKAH5tcsaDAZd5YQVGIFT0I5vzINtFyb/QEpnUb/rbLTxqJBV0bQ0t2VRgg+OQXAFwv/XUB+XCctHBdlNgyfEvNzG84PwtKMvSlxJdMkIswiA6mKSMBsMw4QIVvflFQbWuViDS5twMrAnZVd53bYQXCtISO8yJDYJ1XY49edFEzHemkSXwvVeyOeUsvWGtXiv9PfNxwZhZlPq2+cvi1ESk+EUuKR3nCw0/+vNUxW8/sFfnjtHGSfjX0mMMqLfbsWSwnjQdU1Pow5qF7PUMccCEVmA6aCgOS0RuX8phH3IJ9he50f1a91qZVDPMc1Pz0fYV6MBUnyEb0r4dR8JY3FKirHgXiWllTlSFV1E23AWbORbWeZawscBlS+ooRYqxjQBkYDV9mrRW1fbPOqJtcvr592nnYonGTf+Y8ZX9qQC0DLTsIeaX1F1VF3Tt2rxkq+a/wZ9mWbGRhlpAWkZzRIBvjpQ+Ay7lTvetbGQ6ifmSGsCIXRAv51d0KMXnawe/D/GYhB9l3ccZ04rDToarB0RhVSRi1Nre4lqrlImSf7BR7Lxckrhjaz1wmg6uafmgAeAADoTMERzKbh3D9Sdne/iUMctfh1/9RlHV4IAlkyS4X4HTq5IJl2LCGij6ufw2kM3jeWZkrVWdA98w5dErSxqoRI+WU48OcdOsZNhMrzQHX2UCdCSB/Fa+pbKJP+quZzbIOUz+pWY0hpsPbmhnYtJBj0gQVKRnVKHNlJIQupj9DA0iyFbOmbP4ZPTbJB9OxVdtgjcJHqLkcq/vab2nsTCYp7R4Eurh/8fYDUeN+dsHQd8GwMBEGfwRQsg0R+7tJ0LVfiEV+08s2UWO80wUM9lAgqC9SSLRzN0vPtBKWTNEoagChCEPLmAPNJf7qz543BwAP076u0neYeGzRSQiKx1kgRgmf2R0LVn4vaSlXWLRCIB+2VDUE9UzpQ6AzevTX/yByn+hjlO6wmx59ZjfMDzmb25qufLMieli7nDcGEah1KvOfJLd2B9Tooj0JdA8V42/NEw6hDKQ+1zZaV7rLlo8tl9w5afvUQeBjBbFygQCr45AEXOEhenUEN0iGQFXmYJRlP/zHAXe2mnjyYqRRCTqFPVa43rsaE8/QzGVdcsRev1kRE+oQcLfH2yNJ8WUBObcWxNYvQdSI7gIDoMwd6BQnzM1K/CA0hG4Ae2yAj7CsgB5MCwjkpwAJ3/vzTtqJm7Et8eEgeedSr+SPjl7KYPZUr3MIuTV0Mhh1F8bkufCqIyW8O0124fNYgqYC01SNd4KuloERyS8EReS/uIXshprHVS4+u/YdVqmMXQw63twHeZTA7P/Ld0K6fQ1zTGYgrQ0SxLtl5XcjOafnvfArquLbkgerPKPhs7RVBE3fTJ6DeX5nLIXxmtSFGWhZuoLGylG70HIclg1NHG79+m16ljVH1KVWiFIZ6IR9RUPl5Dy6h8KWQN/+tfF//aDeAVoM5AuPMs4P3SVlYXDQfPvNoAsICrPNf99updAc3ezG94PkT2FauZ05K3E/iW5iDT+TKofiVd3BwmdpmHBgBvCM1WY1mwXR93gcjAmjXOFDwPFNMc+2VM5V16d81y3jU6VVOhuRnV44IYY/pe/REKm3rewLkbmIMmGip1QvMiBI2ZYDe6w18eQ+IYNO14NkoCJBu0v09++XjitJmVXwzv4acbMuYAIh9ZCrE1KJizQUTutcAUWUOm/uIwZXkYGWLSX/p+TnLuHLeDk9kp+Vbt7Lkx2vMG8jSCDX9EcPqORJac8IkXfWxueUpSxKTxnF740Ig6OwxEstJRFsDEgq/jFHexn3akskUa0eP4rkojN6Z2ZV5z6q4KDSl3FbzIw7kTakAOMejoyAAAAAAAAAAAD/zmOKE5LhytRlaDQJM0eaXlMKX/HvwBTQCdvlMMKNaRQpy+/txZNS3uob6dAkQxMu73ms0o/ET6Z6WSUAAAAAAAAAAAAAA==">
      <div class="um">
        <button class="umbtn" id="umBtn" type="button"><span class="av" id="umAv">G</span><span id="umName">Guest</span><span>▾</span></button>
        <div class="umenu" id="umMenu"><div class="em" id="umEmail"></div><button type="button" id="umLogout">Log out</button></div>
      </div>
    </header>
    <div id="planbar" style="display:none;margin:10px 28px 0;gap:10px;align-items:center;flex-wrap:wrap;background:#fff;border-radius:12px;padding:8px 14px;box-shadow:0 2px 10px rgba(15,23,42,.08)"></div>

    <!-- Dashboard -->
    <section id="viewDash" class="pad">
      <form id="f" class="panel searchbar">
        <select id="type"><option value="mc">MC number</option><option value="dot">DOT number</option><option value="name">Company name</option></select>
        <input id="q" placeholder="Enter MC, DOT or company name" required>
        <button class="go" type="submit">🔍 Search carriers</button>
      </form>
      <div id="msg"></div>
      <div id="results"></div>

      <div class="bulkgrid">
        <form id="bf" class="panel bpanel">
          <div class="ptitle">🔍 Bulk search</div>
          <div class="bform" style="padding-bottom:0"><select id="ssel"><option value="">Saved searches…</option></select><button type="button" id="ssrun">▶ Run</button><button type="button" id="sssave">💾 Save current</button><label class="psz" title="Alert works for Date range searches"><input type="checkbox" id="ssalert" style="width:16px;height:16px;padding:0"> 🔔 alert</label><button type="button" id="ssdel">🗑</button></div>
          <div id="salert" class="notice" style="display:none;margin:12px 16px 0"></div>
          <div class="bform">
            <select id="bmode"><option value="mc">MC range</option><option value="date">Date range (new carriers)</option></select>
            <div id="bmc" style="display:contents"><input id="bfrom" placeholder="From MC, e.g. 500000" inputmode="numeric"><input id="bto" placeholder="To MC, e.g. 505000" inputmode="numeric"></div>
            <div id="bdate" style="display:none"><input type="date" id="dfrom"> <input type="date" id="dto"><span class="pre"><button type="button" data-d="7">7 days</button><button type="button" data-d="30">30 days</button><button type="button" data-d="90">90 days</button></span></div>
            <input id="bmin" type="number" min="0" placeholder="Min trucks" style="max-width:130px;flex:0 1 130px">
            <input id="bmax" type="number" min="0" placeholder="Max trucks" style="max-width:130px;flex:0 1 130px">
            <input id="bstate" placeholder="State(s), e.g. TX, GA" style="max-width:190px;flex:0 1 190px" autocomplete="off">
            <input id="bcity" placeholder="City (optional)" style="max-width:170px;flex:0 1 170px" autocomplete="off">
            <div class="chips" id="bequip"></div>
            <select id="bauth"><option value="">Authority: Any</option><option value="active">Authority: Active</option><option value="inactive">Authority: Inactive</option></select>
            <select id="bmatch"><option value="any">Any selected cargo</option><option value="all">All selected cargo</option></select>
            <div class="chips" id="bopts">
              <span class="lbl">Only</span>
              <label><input type="checkbox" id="bhasemail"> Has email</label>
              <label><input type="checkbox" id="bhasphone"> Has phone</label>
              <label><input type="checkbox" id="bhide"> Hide saved / contacted</label>
            </div>
            <select id="bins"><option value="">Insurance: don't check</option><option value="show">Insurance: check &amp; show</option><option value="on">Insurance: on file only</option></select>
            <div class="cbox">
              <button type="button" class="cbtn" id="cbtn"><span id="cbtnt">Cargo: Any</span><span>▾</span></button>
              <div id="cpanel">
                <div class="ctools"><input id="csearch" placeholder="Search cargo…" autocomplete="off"><button type="button" id="cclear">Clear</button></div>
                <div id="bcargo"></div>
              </div>
            </div>
            <button class="go" type="submit" id="bgo">🔍 Fetch carriers</button>
            <button type="button" id="bnew" class="btn-o" title="Switches to date mode, yesterday to today, authority Any, insurance not checked">🆕 New carriers (yesterday → today)</button>
          </div>
        </form>
        <div class="sg" id="sg"></div>
      </div>

      <div id="bmsg"></div>
      <div class="strip" id="bstrip" style="display:none">
        <div class="stripstats" id="stripstats"></div>
        <div class="tools">
          <label class="psz">Rows per page <select id="bpsz"><option>25</option><option>50</option><option>100</option><option>250</option><option selected>500</option><option>1000</option><option>2500</option><option>5000</option></select></label>
          <button id="bstop" type="button" style="display:none">⏹ Stop loading</button>
          <button id="bmore" type="button" style="display:none">Load more</button>
          <button id="bmail" type="button" class="btn-o">✉ Email carriers</button>
          <button id="bselall" type="button">☑ Select all shown</button>
          <button id="bselnone" type="button" style="display:none">Clear selection</button>
          <button id="bsave" type="button" class="btn-o">⬇ Save all to leads</button>
          <span id="bassignwrap" style="display:none"><select id="bassign"></select> <button type="button" id="bassignbtn" class="btn-o">👤 Assign</button></span>
          <button id="bcsv" type="button" class="btn-g">Export to Excel (CSV)</button>
        </div>
      </div>
      <div class="bw" id="bres"></div>
      <div id="pager"></div>
    </section>

    <!-- Carrier tracker -->
    <section id="viewTrack" class="pad" style="display:none;margin-top:24px">
      <h3>Carrier Tracker</h3>
      <div class="notice">FMCSA has no live GPS data. Here you track a carrier with <b>their permission</b>: ask them to share their live location or ZIP code, save it, and you will see which state they are in and how fresh the update is.</div>
      <form id="tf" class="panel searchbar">
        <select id="ttype"><option value="mc">MC number</option><option value="dot">DOT number</option><option value="name">Company name</option></select>
        <input id="tq" placeholder="Enter MC, DOT or company name" required>
        <button class="go" type="submit">🔍 Find carrier</button>
      </form>
      <div id="tmsg"></div>
      <div id="tfound"></div>
      <h3 style="margin-top:22px">Tracked carriers</h3>
      <div id="tlist"></div>
    </section>

    <!-- Documents -->
    <section id="viewDocs" class="pad" style="display:none;margin-top:24px">
      <h3>Carrier Documents</h3>
      <div class="notice">Enter any carrier's MC or DOT number. Below you get the FMCSA authority page and the W-9 form for that carrier.</div>
      <form id="df" class="panel searchbar">
        <select id="dtype"><option value="mc">MC number</option><option value="dot">DOT number</option></select>
        <input id="dq" placeholder="Enter MC or DOT number" inputmode="numeric" required>
        <button class="go" type="submit">🔍 Search</button>
      </form>
      <div id="dmsg"></div>
      <div id="dfound"></div>
    </section>

    <!-- Pipeline -->
    <section id="viewPipe" class="pad" style="display:none;margin-top:24px"><h3>Pipeline</h3><div id="pipe"></div></section>

    <!-- Team -->
    <section id="viewTeam" class="pad" style="display:none;margin-top:24px">
      <h3>Team activity</h3>
      <div class="bw" style="margin-bottom:18px"><div id="tstats"></div></div>
      <h3>Team</h3>
      <div class="notice">Team members share one list of leads and have full access. Other signups are customers on the Free plan; search their email below and press +30 days after you receive their payment.</div>
      <div style="display:flex;gap:8px;margin-bottom:10px"><input id="tmq" placeholder="Search customer by email or name" oninput="tShow()" onkeydown="if(event.key==='Enter')tLoad()" style="flex:1"><button type="button" onclick="tLoad()">🔍 Search</button><button type="button" onclick="$('tmq').value='';tLoad()">↻ Refresh</button></div>
      <div class="bw"><div id="tmlist"></div></div>
    </section>

    <!-- My leads -->
    <section id="viewLeads" class="pad" style="display:none;margin-top:24px">
      <h3>My leads</h3>
      <div class="tools" style="margin-bottom:12px">
        <button id="csv" type="button" class="btn-g">Download CSV</button>
        <button id="clear" type="button">Clear all leads</button>
      </div>
      <div id="leads" class="bw"></div>
    </section>
  </div>
</div>

<div id="tgate" style="display:none;position:fixed;inset:0;z-index:99;background:#071328;color:#fff;align-items:center;justify-content:center;text-align:center;padding:24px"><div><h2>⏳ Waiting for approval</h2><p>Your account is created. An admin must approve it before you can use CarrierDesk.</p><button type="button" class="go" onclick="$('navLogout').click()">Log out</button></div></div>
<div class="mo" id="upmo"><div class="mbox"><h3>⭐ Pro plan · 30 days</h3><div id="upbody"></div><div class="mrow"><button type="button" onclick="$('upmo').style.display='none'">Close</button></div></div></div>
<div class="mo" id="lgmo"><div class="mbox"><div id="lgbody"></div><div class="mrow"><button type="button" onclick="$('lgmo').style.display='none'">Close</button></div></div></div>
<div class="mo" id="dmo"><div class="mbox">
<h3>📄 Carrier documents</h3><div class="small" id="dtitle"></div>
<label class="fl">Your company</label><input type="text" id="dco" value="M&amp;H Dispatch Solutions">
<label class="fl">Representative</label><input type="text" id="drep" value="Jax Carter">
<label class="fl">Dispatch fee % of gross</label><input type="text" id="dfee" value="8">
<label class="fl">Governing law (state)</label><input type="text" id="dlaw" placeholder="e.g. Texas">
<div class="mrow"><button type="button" class="go" onclick="dAgr()">Dispatch Agreement</button><button type="button" onclick="dW9()">⬇ W-9 PDF</button><button type="button" onclick="dW9msg()">W-9 request (WhatsApp)</button><button type="button" onclick="dMC()">⬇ MC letter PDF</button><button type="button" onclick="dLI()">FMCSA authority page</button><button type="button" onclick="dProf()">Carrier profile sheet</button></div>
<h3 style="margin-top:18px">Checklist and uploads</h3><div id="dlist"></div>
<div class="mrow"><button type="button" id="dclose" style="margin-left:auto" onclick="$('dmo').style.display='none'">Close</button></div>
</div></div>
<div class="mo" id="emo">
  <div class="mbox">
    <h3>✉ Email carriers</h3>
    <div class="small" id="einfo"></div>
    <label class="fl" for="esub">Subject</label>
    <input type="text" id="esub">
    <label class="fl" for="ebody">Message <span style="font-weight:400">— you can use {first} {officer} {company} {mc} {dot} {city} {state} {units}</span></label>
    <textarea id="ebody"></textarea>
    <label class="fl">Preview (next carrier)</label>
    <div id="eprev"></div>
    <div class="mrow"><label><input type="checkbox" id="emark" checked> Mark as Contacted and set follow-up in 3 days</label></div>
    <div class="mrow">
      <button type="button" class="go" id="egmail">Open Gmail for next carrier</button>
      <button type="button" id="emailto">Open in mail app</button>
      <button type="button" id="eskip">Skip</button>
      <button type="button" id="ecopy">Copy all emails</button>
      <button type="button" id="ereset">Reset template</button>
      <button type="button" id="eclose" style="margin-left:auto">Close</button>
    </div>
    <p class="small" style="margin:12px 0 0">Each click opens one ready-to-send email in a new window, then moves to the next carrier. Gmail allows about 500 emails per day.</p>
  </div>
</div>

<script>
/* ============ CONFIG: fill these two after creating your free Supabase project ============ */
var CONFIG = {
  SUPABASE_URL: 'https://ouxolslusdduddbgwwsg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_-RDfUdZKeQ16YFU0pVX1pQ_eLWCTkg4',   // publishable (public) key
  SUPPORT_EMAIL: ''        // optional: shows the "Contact Support" box when filled
};
/* ======================================================================================== */

var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

/* ---------------- auth ---------------- */
var sb = null, session = null, guest = false, appShown = false;
var configured = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);

function userName() {
  if (guest || !session) return 'Guest';
  var u = session.user || {}, m = u.user_metadata || {};
  return m.full_name || String(u.email || 'User').split('@')[0];
}
function userKey() { return guest || !session ? 'guest' : session.user.id; }
function authMsg(t, bad) { $('amsg').textContent = t || ''; $('amsg').style.color = bad ? '#dc2626' : '#15803d'; }
function setTab(t) {
  $('tabLogin').className = t === 'login' ? 'on' : ''; $('tabSignup').className = t === 'signup' ? 'on' : '';
  $('fLogin').style.display = t === 'login' ? 'flex' : 'none'; $('fSignup').style.display = t === 'signup' ? 'flex' : 'none';
  authMsg('');
}
function showAuth() { $('app').style.display = 'none'; $('auth').style.display = 'flex'; appShown = false; }
function showApp() {
  $('auth').style.display = 'none'; $('app').style.display = 'flex';
  var n = userName();
  $('umName').textContent = n; $('umAv').textContent = n.charAt(0).toUpperCase();
  $('umEmail').textContent = guest || !session ? 'Not logged in' : (session.user.email || '');
  if (!appShown) { appShown = true; showView('dash'); renderLeads(); }
}
function setSession(s) {
  session = s;
  if (s) showApp(); else if (!guest) showAuth();
}
function logout() {
  guest = false;
  if (sb) sb.auth.signOut().then(function () { session = null; showAuth(); });
  else { session = null; showAuth(); }
}
function apiFetch(url) {
  var h = {};
  if (session && session.access_token) h.Authorization = 'Bearer ' + session.access_token;
  return fetch(url, { headers: h }).then(function (r) {
    if (r.status === 401 && sb) { sb.auth.signOut(); }
    return r;
  });
}

$('tabLogin').onclick = function () { setTab('login'); };
$('tabSignup').onclick = function () { setTab('signup'); };
$('guest').onclick = function () { guest = true; showApp(); };
$('fLogin').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!sb) { authMsg('Login is not set up yet.', true); return; }
  authMsg('Logging in…');
  sb.auth.signInWithPassword({ email: $('lEmail').value.trim(), password: $('lPass').value }).then(function (r) {
    if (r.error) authMsg(r.error.message, true);
  });
});
$('fSignup').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!sb) { authMsg('Login is not set up yet.', true); return; }
  authMsg('Creating account…');
  sb.auth.signUp({ email: $('sEmail').value.trim(), password: $('sPass').value, options: { data: { full_name: $('sName').value.trim() } } }).then(function (r) {
    if (r.error) { authMsg(r.error.message, true); return; }
    if (!r.data.session) { setTab('login'); authMsg('Account created. Check your email and click the confirmation link, then log in.'); }
  });
});
$('forgot').onclick = function () {
  var em = $('lEmail').value.trim();
  if (!sb) { authMsg('Login is not set up yet.', true); return; }
  if (!em) { authMsg('Type your email above first.', true); return; }
  sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin }).then(function (r) {
    authMsg(r.error ? r.error.message : 'Password reset link sent. Check your email.', !!r.error);
  });
};
$('umBtn').onclick = function (e) { e.stopPropagation(); $('umMenu').style.display = $('umMenu').style.display === 'block' ? 'none' : 'block'; };
document.addEventListener('click', function () { $('umMenu').style.display = 'none'; });
$('umLogout').onclick = logout;
$('navLogout').onclick = function (e) { e.preventDefault(); logout(); };

function initAuth() {
  if (CONFIG.SUPPORT_EMAIL) { $('helpbox').style.display = 'block'; $('helplink').href = 'mailto:' + CONFIG.SUPPORT_EMAIL; }
  if (!configured) { $('setup').style.display = 'block'; showAuth(); return; }
  if (!window.supabase) { showAuth(); authMsg('Could not load the login library. Check your internet and refresh.', true); return; }
  sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  sb.auth.onAuthStateChange(function (ev, s) {
    if (ev === 'PASSWORD_RECOVERY') {
      var p = prompt('Enter your new password (min 6 characters):');
      if (p && p.length >= 6) sb.auth.updateUser({ password: p }).then(function (r) { alert(r.error ? r.error.message : 'Password updated.'); });
    }
    setSession(s);
  });
}

/* ---------------- views ---------------- */
function showView(v) {
  $('viewDash').style.display = v === 'dash' ? '' : 'none';
  $('viewLeads').style.display = v === 'leads' ? '' : 'none';
  $('viewTrack').style.display = v === 'track' ? '' : 'none';
  $('viewDocs').style.display = v === 'docs' ? '' : 'none';
  $('viewTeam').style.display = v === 'team' ? '' : 'none';
  $('viewPipe').style.display = v === 'pipe' ? '' : 'none';
  Array.prototype.forEach.call(document.querySelectorAll('.side nav a[data-view]'), function (a) { a.className = a.getAttribute('data-view') === v ? 'on' : ''; });
  if (v === 'leads') renderLeads();
  if (v === 'track') tRender();
}
Array.prototype.forEach.call(document.querySelectorAll('.side nav a[data-view]'), function (a) {
  a.addEventListener('click', function (e) { e.preventDefault(); showView(a.getAttribute('data-view')); });
});

/* ---------------- leads ---------------- */
function leadsKey() { return 'leads_' + userKey(); }
function getLeads() {
  try {
    var raw = localStorage.getItem(leadsKey());
    if (raw == null) raw = localStorage.getItem('leads');
    return JSON.parse(raw || '[]');
  } catch (e) { return []; }
}
function setLeads(l) { try { localStorage.setItem(leadsKey(), JSON.stringify(l)); } catch (e) {} }
function del(i) { var l = getLeads(); l.splice(i, 1); setLeads(l); renderLeads(); }
function setStatus(i, v) { var l = getLeads(); l[i].status = v; setLeads(l); }
function setField(i, f, v) { var l = getLeads(); if (l[i]) { l[i][f] = v; setLeads(l); } }
function renderLeads() {
  var l = getLeads();
  $('leadBadge').textContent = l.filter(lgMine).length;
  if (!l.filter(lgMine).length) { $('leads').innerHTML = '<p class="small" style="padding:16px">No leads yet. Search a carrier and choose Save lead.</p>'; return; }
  var opts = ['New', 'Contacted', 'Interested', 'Onboarded', 'Not interested'];
  var today = new Date().toISOString().slice(0, 10), due = 0;
  var rows = l.map(function (x, i) {
    if (!lgMine(x)) return '';
    var isDue = x.follow && x.follow <= today && x.status !== 'Onboarded' && x.status !== 'Not interested';
    if (isDue) due++;
    return '<tr' + (isDue ? ' class="due"' : '') + '><td>' + esc(x.name) + '</td><td>' + esc(x.mc) + ' / ' + esc(x.dot) + '</td><td>' + esc(x.officer || '—') + '</td><td>' + esc(x.email || '—') + '<br><span class="small">' + esc(x.phone || '') + '</span></td><td><select onchange="setStatus(' + i + ',this.value)">' +
      opts.map(function (o) { return '<option' + (o === x.status ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select></td><td class="lt" style="min-width:140px"><input type="date" value="' + esc(x.follow || '') + '" onchange="setField(' + i + ',\'follow\',this.value);renderLeads()"></td>' +
      '<td class="lt" style="min-width:200px"><input type="text" placeholder="Notes…" value="' + esc(x.note || '') + '" onchange="setField(' + i + ',\'note\',this.value)"></td>' +
      '<td><button type="button" onclick="lgOpen(\'' + x.dot + '\')">📞 Log</button> <button type="button" onclick="docLead(' + i + ')">📄 Docs</button> <button type="button" onclick="del(' + i + ')">Remove</button></td></tr>';
  }).join('');
  $('leads').innerHTML = '<p class="small" style="padding:12px 16px 0">' + (due ? '⏰ Follow-ups due: <b>' + due + '</b> (highlighted)' : 'No follow-ups due.') + '</p>' +
    '<table><tr><th>Name</th><th>MC / DOT</th><th>Officer</th><th>Email / Phone</th><th>Status</th><th>Follow-up</th><th>Notes</th><th></th></tr>' + rows + '</table>';
}
function csvOut(rows, name) {
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = name; a.click();
}
$('csv').onclick = function () {
  var l = getLeads();
  csvOut([['Name', 'MC', 'DOT', 'Address', 'Authorized', 'Common authority', 'Power units', 'Email', 'Phone', 'Officer', 'Status', 'Follow-up', 'Notes']].concat(
    l.map(function (x) { return [x.name, x.mc, x.dot, x.address, x.authorized, x.common, x.units, x.email, x.phone, x.officer, x.status, x.follow, x.note]; })), 'leads.csv');
};
$('clear').onclick = function () { if (confirm('Delete all leads?')) { setLeads([]); renderLeads(); } };

/* ---------------- single carrier search ---------------- */
var found = [];
function ins(c) {
  var i = c.insurance;
  if (c.fromCensusOnly && !(i.bipdOnFile > 0)) return { t: 'Check', s: 'Not in FMCSA API yet', bad: true };
  if (i.bipdOnFile > 0) return { t: 'On File', s: 'BIPD $' + i.bipdOnFile.toLocaleString() + 'K' + (i.bipdRequired ? ' (req. $' + i.bipdRequired + 'K)' : ''), bad: false };
  return { t: 'Not on File', s: 'No active insurance', bad: true };
}
function contact(c) {
  if (!c.censusFound) return '<div class="contact"><div class="small">No contact data found in the FMCSA Census file for this carrier.</div></div>';
  var email = c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '—';
  var phone = c.phone ? '<a href="tel:' + esc(c.phone.replace(/\D/g, '')) + '">' + esc(c.phone) + '</a>' : '—';
  var cell = c.cellPhone ? '<a href="tel:' + esc(c.cellPhone.replace(/\D/g, '')) + '">' + esc(c.cellPhone) + '</a>' : '—';
  var officers = [c.officer1, c.officer2].filter(Boolean).join(', ') || '—';
  return '<div class="contact"><div class="grid">' +
    '<div><div class="lbl">Email</div><div class="val">' + email + '</div></div>' +
    '<div><div class="lbl">Phone</div><div class="val">' + phone + '</div></div>' +
    '<div><div class="lbl">Cell phone</div><div class="val">' + cell + '</div></div>' +
    '<div><div class="lbl">Officers</div><div class="val">' + esc(officers) + '</div></div>' +
    '<div><div class="lbl">MCS-150 date</div><div class="val">' + esc(c.mcs150Date || '—') + '</div></div>' +
    '<div><div class="lbl">In FMCSA census since</div><div class="val">' + esc(c.censusAddDate || '—') + '</div></div>' +
    '</div></div>';
}
function card(c, idx) {
  var a = c.authorized, n = ins(c), inactive = c.common !== 'Active';
  return '<div class="card"><div class="top"><div><h2>' + esc(c.name) + '</h2>' +
    '<div class="sub">Legal name: ' + esc(c.legalName) + '</div>' +
    '<div class="auth" style="color:' + (c.common === 'Active' ? '#16a34a' : '#dc2626') + '">' + (c.common === 'Active' ? '✔' : '✖') + ' Common Authority: ' + esc(c.common) + '</div></div>' +
    '<div><span class="badge ' + (a ? 'ok' : 'bad') + '">' + (a ? 'Authorized to operate' : 'Not authorized to operate') + '</span>' +
    (c.oos ? '<span class="badge bad">Out of service</span>' : '') + '</div></div>' +
    '<div class="stats">' +
    '<div><div class="lbl">Insurance</div><div class="val" style="color:' + (n.bad ? '#94a3b8' : '#16a34a') + '">' + n.t + '</div><div class="small">' + esc(n.s) + '</div></div>' +
    '<div><div class="lbl">Fleet size</div><div class="val">' + c.powerUnits + ' Power Units</div><div class="small">' + c.drivers + ' Drivers</div></div>' +
    '<div><div class="lbl">Authority</div><div class="val">' + (inactive ? 'Inactive' : 'Active') + '</div><div class="small">Contract: ' + esc(c.contract) + ' · Broker: ' + esc(c.broker) + '</div></div></div>' +
    '<div class="grid">' +
    '<div><div class="lbl">USDOT</div><div class="val">' + esc(c.dot) + '</div></div>' +
    '<div><div class="lbl">MC docket</div><div class="val">' + esc(c.mc.join(', ') || '—') + '</div></div>' +
    '<div><div class="lbl">Carrier operation</div><div class="val">' + esc(c.operation || '—') + '</div></div>' +
    '<div><div class="lbl">Operation class</div><div class="val">' + esc(c.operationClass || '—') + '</div></div>' +
    '<div><div class="lbl">Business org</div><div class="val">' + esc(c.businessOrg || '—') + '</div></div>' +
    '<div><div class="lbl">Reported mileage</div><div class="val">' + esc(c.mileage || '0') + ' mi</div></div>' +
    '<div><div class="lbl">Cargo</div><div class="val">' + esc((c.cargo || []).join(', ') || '—') + '</div></div>' +
    '<div><div class="lbl">Safety rating</div><div class="val">' + esc(c.safetyRating || 'Not rated') + '</div></div>' +
    '<div><div class="lbl">Crashes</div><div class="val">' + c.crashTotal + '</div></div>' +
    '<div><div class="lbl">Physical address</div><div class="val">' + (c.address ? '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(c.address) + '">' + esc(c.address) + '</a>' : '—') + '</div></div>' +
    '</div>' + contact(c) +
    '<div class="act"><button type="button" onclick="save(' + idx + ')">Save lead</button></div></div>';
}
function save(i) {
  var c = found[i], l = getLeads();
  if (l.some(function (x) { return x.dot === c.dot; })) { alert('Already saved'); return; }
  l.push({ dot: c.dot, mc: c.mc.join(' '), name: c.name, address: c.address, authorized: c.authorized ? 'Yes' : 'No', common: c.common, units: c.powerUnits, email: c.email || '', phone: c.phone || c.cellPhone || '', officer: c.officer1 || '', status: 'New' });
  setLeads(l); renderLeads();
}
$('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var q = $('q').value.trim();
  $('msg').className = ''; $('msg').textContent = 'Searching…'; $('results').innerHTML = '';
  apiFetch('/api/carrier?type=' + $('type').value + '&q=' + encodeURIComponent(q))
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      if (!x.ok) { $('msg').className = 'err'; $('msg').textContent = x.d.error || 'Error'; return; }
      found = x.d.results || [];
      $('msg').textContent = found.length ? found.length + ' result(s)' : 'No carrier found.';
      $('results').innerHTML = found.map(card).join('');
    })
    .catch(function () { $('msg').className = 'err'; $('msg').textContent = 'Could not reach the server. Is the site deployed with /api?'; });
});

/* ---------------- bulk search ---------------- */
var CARGO = ['General Freight','Household Goods','Metal Sheets/Coils','Motor Vehicles','Drive/Tow Away','Logs/Poles/Lumber','Building Materials','Machinery/Large Objects','Refrigerated Food','Beverages','Paper Products','Construction','Intermodal','Oilfield Equipment'];
var EQUIP = ['Big Equipment','Power Only','Box Truck','Multi Trucks'];
$('bcargo').innerHTML = CARGO.map(function (c) { return '<label><input type="checkbox" value="' + esc(c) + '"> ' + esc(c) + '</label>'; }).join('');
$('bequip').innerHTML = '<span class="lbl">Equipment</span>' + EQUIP.map(function (c) { return '<label><input type="checkbox" value="' + esc(c) + '"> ' + esc(c) + '</label>'; }).join('');
function cargoLabel() {
  var n = $('bcargo').querySelectorAll('input:checked').length;
  $('cbtnt').textContent = 'Cargo: ' + (n ? n + ' selected' : 'Any');
}
$('cbtn').onclick = function () { var p = $('cpanel'); p.style.display = p.style.display === 'block' ? 'none' : 'block'; };
$('bcargo').addEventListener('change', cargoLabel);
$('csearch').addEventListener('input', function () {
  var q = this.value.toLowerCase();
  Array.prototype.forEach.call($('bcargo').querySelectorAll('label'), function (l) { l.style.display = l.textContent.toLowerCase().indexOf(q) === -1 ? 'none' : ''; });
});
$('cclear').onclick = function () {
  Array.prototype.forEach.call($('bcargo').querySelectorAll('input'), function (i) { i.checked = false; });
  cargoLabel();
};
$('bmode').onchange = function () {
  var m = $('bmode').value === 'mc';
  $('bmc').style.display = m ? 'contents' : 'none';
  $('bdate').style.display = m ? 'none' : 'block';
};
(function () { var t = new Date(), f = new Date(t.getTime() - 5 * 86400000); function iso(d) { return d.toISOString().slice(0, 10); } $('dfrom').value = iso(f); $('dto').value = iso(t); })();

var PAGE_SIZE = 500;
var bErr = '', bulk = [], bSeen = {}, bBase = '', bScanned = 0, bLoading = false, bStop = false, bPage = 1, bWarn = [], bRun = 0;
var bQueue = [], bActive = 0, bDone = 0, bTotal = null, bPlain = false, bTimer = null;
var bNote = '', bNoteNext = '', bDrop = { units: 0, equip: 0, cargo: 0, auth: 0 }, bAuthQ = [], bAuthActive = 0, bInsQ = [], bInsActive = 0, bSel = {}, bSort = { k: '', d: 1 }, bViewN = 0;
var FETCH_CONC = 2, AUTH_CONC = 1, AUTH_CHUNK = 100;

function eqClass(e) { return 'eq-' + String(e || 'Unknown').split(' ')[0]; }
function loc(x) { return [x.city, x.state].filter(Boolean).join(', ') || '—'; }
function spark(c) {
  var d = 'M0 28 C15 6,30 6,45 20 S75 34,90 18 S125 4,160 22';
  return '<svg viewBox="0 0 160 36" preserveAspectRatio="none"><path d="' + d + ' L160 36 L0 36Z" fill="' + c + '" fill-opacity=".14"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2"/></svg>';
}
function bCounts(list) {
  list = list || bulk;
  var st = {};
  list.forEach(function (x) { if (x.state) st[x.state] = 1; });
  return {
    n: list.length,
    email: list.filter(function (x) { return x.email; }).length,
    phone: list.filter(function (x) { return x.phone || x.cellPhone; }).length,
    states: Object.keys(st).length
  };
}
function bStatus() {
  var t = bulk.length.toLocaleString() + ' carrier(s) found · scanned ' + bScanned.toLocaleString() + (bTotal ? ' of ' + bTotal.toLocaleString() : '') + ' census records';
  if (bLoading) t += ' · loading…' + (bRetryMsg ? ' ' + bRetryMsg : '');
  else if (bQueue.length) t += ' · paused, press "Load more" to continue';
  else if (bDone) t += ' · all loaded';
  var left = bAuthQ.length + bAuthActive * AUTH_CHUNK;
  if (left && bulk.length) t += ' · checking authority…';
  if (bulk.length && (bInsQ.length || bInsActive)) t += ' · checking insurance…';
  if (bViewN !== bulk.length) t += ' · showing ' + bViewN.toLocaleString() + ' after filters';
  if (bDrop.units || bDrop.equip || bDrop.cargo || bDrop.auth) t += ' · removed by your filters → trucks: ' + bDrop.units + ', equipment: ' + bDrop.equip + ', cargo: ' + bDrop.cargo + ', authority: ' + bDrop.auth;
  if (bNote) t += ' · ' + bNote;
  if (bWarn.length) t += ' · ' + bWarn.join(' ');
  if (bErr) t += ' · ⚠ ERROR: ' + bErr;
  $('bmsg').className = bErr ? 'err' : '';
  $('bmsg').textContent = t;
}
function bSoon() { if (bTimer) return; bTimer = setTimeout(function () { bTimer = null; bRender(); }, 1200); }
function bInsWanted() { return $('bins').value !== ''; }
function bLeadMap() { var m = {}; getLeads().forEach(function (x) { m[x.dot] = x.status || 'New'; }); return m; }
function bSortVal(x, k) {
  switch (k) {
    case 'mc': return x.mc || '';
    case 'name': return String(x.name || '').toLowerCase();
    case 'officer': return String(x.officer || '').toLowerCase();
    case 'phone': return x.phone || x.cellPhone || '';
    case 'email': return x.email || '';
    case 'loc': return (x.state || '') + ' ' + (x.city || '');
    case 'units': return x.powerUnits || 0;
    case 'equip': return x.equipment || '';
    case 'auth': return x.authority || '';
    case 'ins': return x.ins || '';
    case 'safety': return x.safety || '';
    case 'crashes': return x.crashes === '' || x.crashes == null ? '' : Number(x.crashes);
    case 'lead': return x._lead || '';
    case 'score': return bScore(x);
  }
  return '';
}
function bView(lm) {
  var hide = $('bhide').checked, insOn = $('bins').value === 'on', aw = $('bauth').value;
  var v = bulk.filter(function (x) {
    x._lead = lm[x.dot] || '';
    if (hide && x._lead) return false;
    if (insOn && x.ins === 'None') return false;
    if (aw && (!x.authority || x.authority.toLowerCase() !== aw)) return false;
    return true;
  });
  var k = bSort.k, d = bSort.d;
  if (!k && /mode=mc/.test(bBase)) { k = 'mc'; d = 1; }
  if (k) v.sort(function (a, b) {
    var A = bSortVal(a, k), B = bSortVal(b, k), ea = A === '' || A == null, eb = B === '' || B == null;
    if (ea && eb) return 0; if (ea) return 1; if (eb) return -1;
    return (A < B ? -1 : A > B ? 1 : 0) * d;
  });
  return v;
}
/* Google Voice: opens the Google Voice dialer with the number filled in (you must be signed in to Google Voice) */
function gvUrl(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return 'https://voice.google.com/u/0/calls?a=nc,%2B' + d; }
function bPhone(x) {
  var p = x.phone || x.cellPhone;
  if (!p) return '—';
  var dg = String(p).replace(/\D/g, ''), full = dg.length === 10 ? '1' + dg : dg;
  return '<a href="tel:+' + full + '">' + esc(p) + '</a><a class="ib" target="_blank" rel="noopener" href="https://wa.me/' + full + '" title="WhatsApp">💬</a><a class="ib" target="_blank" rel="noopener" href="' + gvUrl(p) + '" data-gv="' + esc(p) + '" data-dot="' + esc(x.dot) + '" title="Call with Google Voice">🎙️</a>';
}
function bSelUpdate() {
  var n = Object.keys(bSel).length;
  $('bsave').textContent = n ? '⬇ Save selected (' + n + ')' : '⬇ Save all shown to leads';
  $('bcsv').textContent = n ? 'Export selected (' + n + ')' : 'Export to Excel (CSV)';
  $('bselnone').style.display = n ? '' : 'none';
  $('bmail').textContent = n ? '✉ Email selected (' + n + ')' : '✉ Email all shown';
}
function bTargets() {
  if (Object.keys(bSel).length) return bulk.filter(function (x) { return bSel[x._k]; });
  return bView(bLeadMap());
}
function bRender() {
  var _sy = window.pageYOffset || document.documentElement.scrollTop || 0;
  bRender2();
  if (window.pageYOffset !== _sy) window.scrollTo(0, _sy);
}
function bRender2() {
  var lm = bLeadMap(), view = bView(lm);
  var c = bCounts(view);
  var defs = [['Verified carriers', c.n, '🚚', '#1a5fe0', '#dbe7ff'], ['With email', c.email, '✉️', '#16a34a', '#dcfce7'], ['With phone', c.phone, '📞', '#7c3aed', '#ede9fe'], ['States', c.states, '📍', '#f97316', '#ffedd5']];
  $('sg').innerHTML = defs.map(function (d) {
    return '<div class="sc"><div class="row"><div class="ic" style="background:' + d[4] + '">' + d[2] + '</div><div><div class="n">' + d[1] + '</div><div class="t">' + d[0] + '</div></div></div>' + spark(d[3]) + '</div>';
  }).join('');
  $('stripstats').innerHTML = defs.map(function (d) { return '<div class="ss"><div class="lbl">' + d[0] + '</div><div class="v">' + d[1] + '</div></div>'; }).join('');
  $('bstrip').style.display = bulk.length || bQueue.length || bLoading ? 'flex' : 'none';
  $('bstop').style.display = bLoading ? '' : 'none';
  $('bmore').style.display = bQueue.length && !bLoading ? '' : 'none';
  $('bgo').disabled = bLoading;

  bViewN = view.length;
  var showIns = bInsWanted();
  var showSafe = bulk.some(function (x) { return x.safety; });
  var showCr = bulk.some(function (x) { return Number(x.crashes) > 0; });
  var pages = Math.max(1, Math.ceil(view.length / PAGE_SIZE));
  if (bPage > pages) bPage = pages;
  var slice = view.slice((bPage - 1) * PAGE_SIZE, bPage * PAGE_SIZE);

  var cols = [['mc', 'MC'], ['name', 'Carrier / Company'], ['officer', 'Officer'], ['phone', 'Phone'], ['email', 'Email'], ['loc', 'Location'], ['units', 'Units'], ['equip', 'Equipment'], ['auth', 'Authority']];
  if (showIns) cols.push(['ins', 'Insurance']);
  if (showSafe) cols.push(['safety', 'Safety']);
  if (showCr) cols.push(['crashes', 'Crashes']);
  cols.push(['score', 'Score']); cols.push(['lead', 'Lead']);
  var k0 = bSort.k || (/mode=mc/.test(bBase) ? 'mc' : '');
  var head = '<th><input type="checkbox" id="bselpage" title="Select this page"></th>' + cols.map(function (cl) {
    return '<th class="s" data-s="' + cl[0] + '">' + cl[1] + (k0 === cl[0] ? (bSort.k ? (bSort.d > 0 ? ' ▲' : ' ▼') : ' ▲') : '') + '</th>';
  }).join('');
  var leadCls = { 'New': 'au-Unknown', 'Contacted': 'au-Pending', 'Interested': 'au-Pending', 'Onboarded': 'au-Active', 'Not interested': 'au-Inactive' };

  $('bres').innerHTML = view.length ? '<table><thead><tr>' + head + '</tr></thead><tbody>' +
    slice.map(function (x) {
      var h2 = '<tr><td><input type="checkbox" class="rs" data-k="' + esc(x._k) + '"' + (bSel[x._k] ? ' checked' : '') + '></td>' +
        '<td class="mono">' + esc(x.mc || '—') + '</td>' +
        '<td>' + esc(x.name) + '<button type="button" class="ib" data-doc="' + esc(x._k) + '" title="Documents">📄</button>' + (x.dba ? '<div class="small">DBA: ' + esc(x.dba) + '</div>' : '') + '</td>' +
        '<td>' + esc(x.officer || '—') + '</td>' +
        '<td>' + bPhone(x) + '</td>' +
        '<td>' + (x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a><button type="button" class="ib cp" data-copy="' + esc(x.email) + '" title="Copy email">⧉</button>' : '—') + '</td>' +
        '<td>' + esc(loc(x)) + '</td><td>' + esc(x.powerUnits) + '</td>' +
        '<td><span class="eq ' + eqClass(x.equipment) + '">' + esc(x.equipment) + '</span></td>' +
        '<td>' + (x.authority ? '<span class="au au-' + esc(x.authority) + '">' + esc(x.authority) + '</span>' : '<span class="au au-wait">…</span>') + '</td>';
      if (showIns) h2 += '<td>' + (x.ins ? '<span class="au ins-' + (x.ins === 'On File' ? 'On' : x.ins) + '">' + esc(x.ins) + (x.ins === 'On File' && x.insAmt ? ' $' + esc(x.insAmt) + 'K' : '') + '</span>' : '<span class="au au-wait">…</span>') + '</td>';
      if (showSafe) h2 += '<td>' + esc(x.safety || '—') + '</td>';
      if (showCr) h2 += '<td>' + (x.crashes === '' || x.crashes == null ? '—' : esc(x.crashes)) + '</td>';
      h2 += '<td>' + bScoreTd(x) + '</td>'; h2 += '<td>' + (x._lead ? '<span class="au ' + (leadCls[x._lead] || 'au-Unknown') + '">' + esc(x._lead) + '</span>' : '—') + '</td></tr>';
      return h2;
    }).join('') + '</tbody></table>' : '';
  if (pages <= 1) { $('pager').innerHTML = ''; }
  else {
    var start = Math.max(1, Math.min(bPage - 2, pages - 4)), end = Math.min(pages, start + 4), hp = '';
    hp += '<button class="pg" type="button" onclick="goPage(' + (bPage - 1) + ')"' + (bPage === 1 ? ' disabled' : '') + '>‹</button>';
    for (var p = start; p <= end; p++) hp += '<button class="pg' + (p === bPage ? ' on' : '') + '" type="button" onclick="goPage(' + p + ')">' + p + '</button>';
    hp += '<button class="pg" type="button" onclick="goPage(' + (bPage + 1) + ')"' + (bPage === pages ? ' disabled' : '') + '>›</button>';
    hp += '<span class="small" style="align-self:center">' + pages + ' pages</span>';
    $('pager').innerHTML = hp;
  }
  bSelUpdate();
  bStatus();
}
function goPage(n) { bPage = n; bRender(); var el = $('bres'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function bFinish() { bLoading = false; bRender(); }
function bUrl(off) { return bBase + '&offset=' + off + (bPlain ? '&plain=1' : ''); }
var bRetryMsg = '';
function bGet(off, run, tries) {
  return apiFetch(bUrl(off))
    .then(function (r) {
      return r.text().then(function (txt) {
        var d = null;
        try { d = JSON.parse(txt); } catch (e) { d = { error: 'Server timed out (status ' + r.status + ')' }; }
        return { ok: r.ok, d: d };
      });
    })
    .then(function (x) { if (!x.ok) throw new Error(x.d.error || 'Error'); bRetryMsg = ''; return x.d; })
    .catch(function (e) {
      if (tries < 3 && run === bRun && !bStop) {
        var busy = /429|too many|busy|slow|timeout|timed out/i.test(e.message || '');
        var secs = busy ? 4 * (tries + 1) : 1;
        bRetryMsg = busy ? 'Census server is busy, retrying in ' + secs + 's (attempt ' + (tries + 2) + ' of 4)…' : '';
        bStatus();
        return new Promise(function (ok) { setTimeout(ok, secs * 1000); }).then(function () { return bGet(off, run, tries + 1); });
      }
      bRetryMsg = '';
      throw e;
    });
}
function bAddRows(d) {
  (d.rows || []).forEach(function (r) {
    var k = r.dot + '|' + r.mc;
    if (!bSeen[k]) { bSeen[k] = 1; r._k = k; bulk.push(r); if (!r.authority) bAuthQ.push(r); if (bInsWanted()) { r._iq = 1; bInsQ.push(r); } }
  });
  bScanned += d.scanned || 0; bDone++;
  if (d.dropped) { bDrop.units += d.dropped.units; bDrop.equip += d.dropped.equip; bDrop.cargo += d.dropped.cargo; bDrop.auth += d.dropped.auth || 0; }
  (d.warnings || []).forEach(function (w) { if (bWarn.indexOf(w) === -1) bWarn.push(w); });
  bAuthPump(); bInsPump();
}
// Authority (Active/Inactive) is fetched in the background in small batches, so rows show up immediately.
function bAuthRetry(chunk) {
  if (!chunk.length || chunk[0]._ar) return false;
  chunk.forEach(function (r) { r._ar = 1; });
  bAuthQ = chunk.concat(bAuthQ);
  return true;
}
function bAuthPump() {
  var run = bRun;
  while (bAuthActive < AUTH_CONC && bAuthQ.length) {
    (function (chunk) {
      bAuthActive++;
      var pairs = chunk.map(function (r) { return r.dot + ':' + String(r.mc || '').replace(/\D/g, ''); }).join(',');
      apiFetch('/api/bulk?mode=auth&pairs=' + encodeURIComponent(pairs))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (run !== bRun) return;
          var failed = (d.warnings || []).some(function (w) { return /lookup failed/i.test(w); });
          if (failed && bAuthRetry(chunk)) return;
          var a = d.auth || {};
          chunk.forEach(function (r) { var v = a[r.dot]; r.authority = v ? v.status : 'Unknown'; if (!r.mc && v && v.mc) r.mc = v.mc; });
          (d.warnings || []).forEach(function (w) { if (bWarn.indexOf(w) === -1) bWarn.push(w); });
        })
        .catch(function () { if (run === bRun && !bAuthRetry(chunk)) chunk.forEach(function (r) { r.authority = 'Unknown'; }); })
        .then(function () { if (run !== bRun) return; bAuthActive--; bSoon(); bAuthPump(); });
    })(bAuthQ.splice(0, AUTH_CHUNK));
  }
}
function bInsPump() {
  var run = bRun;
  while (bInsActive < 2 && bInsQ.length) {
    (function (chunk) {
      bInsActive++;
      var pairs = chunk.map(function (r) { return r.dot + ':' + String(r.mc || '').replace(/\D/g, ''); }).join(',');
      apiFetch('/api/bulk?mode=ins&pairs=' + encodeURIComponent(pairs))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (run !== bRun) return;
          var a = d.ins || {};
          chunk.forEach(function (r) { var v = a[r.dot]; r.ins = v ? v.s : 'Unknown'; r.insAmt = v ? v.amt : 0; });
          (d.warnings || []).forEach(function (w) { if (bWarn.indexOf(w) === -1) bWarn.push(w); });
        })
        .catch(function () { if (run === bRun) chunk.forEach(function (r) { r.ins = 'Unknown'; }); })
        .then(function () { if (run !== bRun) return; bInsActive--; bSoon(); bInsPump(); });
    })(bInsQ.splice(0, 150));
  }
}
function bCheckDone() {
  if (bActive > 0) return;
  bLoading = false;
  if (bQueue.length) bRender(); else bFinish();
}
// Several pages of 1000 census records are fetched at the same time (not one after another).
function bPump() {
  var run = bRun;
  while (!bStop && bActive < FETCH_CONC && bQueue.length) {
    (function (off) {
      bActive++; bLoading = true;
      bGet(off, run, 0).then(function (d) {
        if (run !== bRun) return;
        bActive--; bAddRows(d);
        if (!bTotal && d.nextOffset !== null) bQueue.push(d.nextOffset);
        bSoon(); bPump(); bCheckDone();
      }).catch(function (e) {
        if (run !== bRun) return;
        bActive--; bQueue.unshift(off); bStop = true;
        bErr = (e.message || 'Connection problem') + ' — press "Load more" to continue.'; bStatus();
        bCheckDone();
      });
    })(bQueue.shift());
  }
  bCheckDone();
}
function bStart() {
  var run = bRun;
  bLoading = true; $('bmsg').className = ''; bRender();
  bGet(0, run, 0).then(function (d) {
    if (run !== bRun) return;
    bPlain = !!d.plain; bTotal = d.total;
    bAddRows(d);
    var ps = d.pageSize || 1000;
    if (d.nextOffset !== null) {
      if (bTotal) { for (var o = ps; o < bTotal; o += ps) bQueue.push(o); }
      else bQueue.push(d.nextOffset);
    }
    bRender(); bPump();
  }).catch(function (e) {
    if (run !== bRun) return;
    bLoading = false; bRender();
    $('bmsg').className = 'err'; $('bmsg').textContent = e.message || 'Connection problem. Try again.';
  });
}
function checked(id) {
  return Array.prototype.map.call($(id).querySelectorAll('input:checked'), function (i) { return i.value; }).join('|');
}
$('bf').addEventListener('submit', function (e) {
  e.preventDefault();
  var m = $('bmode').value;
  bBase = '/api/bulk?mode=' + m + '&from=' + encodeURIComponent(m === 'mc' ? $('bfrom').value : $('dfrom').value) + '&to=' + encodeURIComponent(m === 'mc' ? $('bto').value : $('dto').value) +
    '&min=' + encodeURIComponent($('bmin').value) + '&max=' + encodeURIComponent($('bmax').value) +
    '&equip=' + encodeURIComponent(checked('bequip')) + '&auth=&noauth=1' + '&match=' + $('bmatch').value + '&cargo=' + encodeURIComponent(checked('bcargo')) +
    '&state=' + encodeURIComponent($('bstate').value) + '&city=' + encodeURIComponent($('bcity').value) +
    '&hasemail=' + ($('bhasemail').checked ? '1' : '0') + '&hasphone=' + ($('bhasphone').checked ? '1' : '0') +
    (m === 'date' && $('bauth').value ? '&onlymc=1' : '');
  bRun++; bulk = []; bSeen = {}; bQueue = []; bActive = 0; bDone = 0; bTotal = null; bPlain = false;
  bNote = bNoteNext; bNoteNext = ''; bDrop = { units: 0, equip: 0, cargo: 0, auth: 0 }; bAuthQ = []; bAuthActive = 0; bInsQ = []; bInsActive = 0; bSel = {}; bScanned = 0; bWarn = []; bErr = ''; bStop = false; bPage = 1;
  bStart();
});
$('bstop').onclick = function () { bStop = true; $('bstop').style.display = 'none'; };
$('bmore').onclick = function () { if (bQueue.length && !bLoading) { bStop = false; bErr = ''; $('bmsg').className = ''; bPump(); } };
$('bpsz').onchange = function () { PAGE_SIZE = parseInt($('bpsz').value, 10) || 500; bPage = 1; bRender(); };
$('bsave').onclick = function () {
  var l = getLeads(), n = 0, have = {};
  l.forEach(function (x) { have[x.dot] = 1; });
  bTargets().forEach(function (c) {
    if (have[c.dot]) return;
    have[c.dot] = 1;
    l.push({ dot: c.dot, mc: c.mc, name: c.name, address: loc(c) === '—' ? '' : loc(c), authorized: c.authority || '—', common: '', units: c.powerUnits, email: c.email, phone: c.phone || c.cellPhone, officer: c.officer, status: 'New', follow: '', note: '' });
    n++;
  });
  setLeads(l); renderLeads(); bSel = {}; bRender(); alert(n + ' new leads saved.');
};
$('bcsv').onclick = function () {
  csvOut([['MC', 'USDOT', 'Company', 'DBA', 'Officer', 'Phone', 'Cell', 'Email', 'City', 'State', 'Equipment', 'Authority', 'Insurance', 'Safety rating', 'Crashes', 'Power units', 'Drivers', 'Straight trucks', 'Tractors', 'Trailers', 'Cargo', 'Added']].concat(
    bTargets().map(function (x) { return [x.mc, x.dot, x.name, x.dba, x.officer, x.phone, x.cellPhone, x.email, x.city, x.state, x.equipment, x.authority, x.ins ? x.ins + (x.insAmt ? ' $' + x.insAmt + 'K' : '') : '', x.safety, x.crashes, x.powerUnits, x.drivers, x.straightTrucks, x.tractors, x.trailers, x.cargo.join('; '), x.addDate]; })), 'bulk-carriers.csv');
};
$('bselall').onclick = function () { bView(bLeadMap()).forEach(function (x) { bSel[x._k] = 1; }); bRender(); };
$('bselnone').onclick = function () { bSel = {}; bRender(); };
$('bhide').addEventListener('change', function () { bPage = 1; bRender(); });
$('bauth').addEventListener('change', function () { bPage = 1; bRender(); });
$('bins').addEventListener('change', function () {
  if (bInsWanted()) { bulk.forEach(function (r) { if (!r.ins && !r._iq) { r._iq = 1; bInsQ.push(r); } }); bInsPump(); }
  bPage = 1; bRender();
});
$('bres').addEventListener('click', function (e) {
  var t = e.target, th = t.closest ? t.closest('th.s') : null;
  if (th) {
    var k = th.getAttribute('data-s');
    if (bSort.k === k) bSort.d = -bSort.d; else { bSort.k = k; bSort.d = 1; }
    bPage = 1; bRender(); return;
  }
  if (t.classList && t.classList.contains('cp')) {
    var txt = t.getAttribute('data-copy') || '';
    var done = function () { var o = t.textContent; t.textContent = '✓'; setTimeout(function () { t.textContent = o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) {} document.body.removeChild(ta); done(); }
  }
});
$('bres').addEventListener('change', function (e) {
  var t = e.target;
  if (!t.classList) return;
  if (t.classList.contains('rs')) {
    var k = t.getAttribute('data-k');
    if (t.checked) bSel[k] = 1; else delete bSel[k];
    bSelUpdate();
  } else if (t.id === 'bselpage') {
    Array.prototype.forEach.call($('bres').querySelectorAll('.rs'), function (cb) {
      cb.checked = t.checked;
      var k = cb.getAttribute('data-k');
      if (t.checked) bSel[k] = 1; else delete bSel[k];
    });
    bSelUpdate();
  }
});
Array.prototype.forEach.call(document.querySelectorAll('#bdate [data-d]'), function (b) {
  b.onclick = function () {
    var t = new Date(), f = new Date(t.getTime() - parseInt(b.getAttribute('data-d'), 10) * 86400000);
    $('dfrom').value = f.toISOString().slice(0, 10); $('dto').value = t.toISOString().slice(0, 10);
  };
});


/* ---------------- new carriers button ---------------- */
function isoLocal(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
$('bnew').onclick = function () {
  if (bLoading) { alert('Wait for the current search to finish (or press Stop loading).'); return; }
  $('bmsg').className = ''; $('bmsg').textContent = 'Checking the newest date in the FMCSA census file…';
  function go(from, to, note) {
    $('bmode').value = 'date'; $('bmode').onchange();
    $('dfrom').value = from; $('dto').value = to;
    $('bauth').value = ''; $('bins').value = '';
    bNoteNext = note || '';
    $('bgo').click();
  }
  var t = new Date(), from = isoLocal(new Date(t.getTime() - 86400000)), to = isoLocal(t);
  apiFetch('/api/bulk?mode=latest')
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      var latest = x.ok && x.d && /^\d{4}-\d{2}-\d{2}$/.test(x.d.latest || '') ? x.d.latest : '';
      if (latest && latest < from) {
        var f = new Date(Date.parse(latest + 'T00:00:00Z') - 2 * 86400000).toISOString().slice(0, 10);
        go(f, latest, 'The census file only has carriers added up to ' + latest + ' (FMCSA does not update it daily), so the newest 3 days are shown.');
      } else go(from, to, '');
    })
    .catch(function () { go(from, to, ''); });
};

/* ---------------- email carriers ---------------- */
var DEF_TPL = {
  subject: 'Dedicated dispatch for {company}',
  body: 'Hi {first},\n\nI came across {company} and wanted to reach out. At M&H Dispatch Solutions we have dedicated dispatchers who find and book loads for owner operators and small fleets, so you can focus on driving.\n\nIf you are looking for steady freight for your truck, reply to this email with your preferred lanes and I will send you matching loads.\n\nBest regards,\nJax Carter\nM&H Dispatch Solutions'
};
var eQ = [], eIdx = 0;
function tplKey() { return 'emailtpl_' + userKey(); }
function getTpl() {
  try { var t = JSON.parse(localStorage.getItem(tplKey()) || 'null'); if (t && t.subject && t.body) return t; } catch (e) {}
  return DEF_TPL;
}
function saveTpl() { try { localStorage.setItem(tplKey(), JSON.stringify({ subject: $('esub').value, body: $('ebody').value })); } catch (e) {} }
function tcase(s) {
  return String(s || '').toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace(/\b(Llc|Lp|Llp)\b/g, function (m) { return m.toUpperCase(); });
}
function eFill(t, x) {
  var o = String(x.officer || '').trim();
  if (o.indexOf(',') !== -1) o = o.split(',').reverse().map(function (p) { return p.trim(); }).join(' ');
  o = tcase(o);
  var map = { company: tcase(x.name), officer: o, first: o.split(/\s+/)[0] || 'there', mc: x.mc || '', dot: x.dot || '', city: tcase(x.city), state: x.state || '', units: x.powerUnits || '' };
  return String(t).replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : m; });
}
function openEmail(list) {
  var seen = {}, q = [];
  list.forEach(function (x) { var e = String(x.email || '').trim().toLowerCase(); if (!e || seen[e]) return; seen[e] = 1; q.push(x); });
  var lm = bLeadMap(), dup = q.filter(function (x) { var st = lm[x.dot]; return st && st !== 'New'; });
  if (dup.length && confirm(dup.length + ' carrier(s) are already saved or contacted. OK = skip them, Cancel = include them anyway.')) q = q.filter(function (x) { return dup.indexOf(x) === -1; });
  if (!q.length) { alert('No carriers left to email (no email, or already contacted).'); return; }
  eQ = q; eIdx = 0;
  var t = getTpl(); $('esub').value = t.subject; $('ebody').value = t.body;
  $('emo').style.display = 'flex'; eRefresh();
}
function eRefresh() {
  var done = eIdx >= eQ.length;
  $('einfo').textContent = eQ.length + ' carrier(s) with email · opened so far: ' + eIdx;
  var x = eQ[Math.min(eIdx, eQ.length - 1)];
  $('eprev').textContent = done ? 'All done ✅' : 'To: ' + x.email + '\nSubject: ' + eFill($('esub').value, x) + '\n\n' + eFill($('ebody').value, x);
  $('egmail').disabled = $('emailto').disabled = $('eskip').disabled = done;
}
function addDaysIso(n) { return isoLocal(new Date(Date.now() + n * 86400000)); }
function markContacted(x) {
  var l = getLeads(), f = addDaysIso(3), ex = null;
  l.forEach(function (y) { if (y.dot === x.dot) ex = y; });
  if (ex) { if (!ex.status || ex.status === 'New') ex.status = 'Contacted'; if (!ex.follow) ex.follow = f; }
  else l.push({ dot: x.dot, mc: x.mc, name: x.name, address: loc(x) === '—' ? '' : loc(x), authorized: x.authority || '—', common: '', units: x.powerUnits, email: x.email, phone: x.phone || x.cellPhone, officer: x.officer, status: 'Contacted', follow: f, note: 'Emailed ' + isoLocal(new Date()) });
  setLeads(l); renderLeads();
}
function eOpen(kind) {
  if (eIdx >= eQ.length) return;
  var x = eQ[eIdx], su = eFill($('esub').value, x), bo = eFill($('ebody').value, x);
  if (kind === 'gmail') window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(x.email) + '&su=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(bo), '_blank');
  else location.href = 'mailto:' + x.email + '?subject=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(bo);
  if ($('emark').checked) markContacted(x);
  eIdx++; saveTpl(); eRefresh();
}
$('bmail').onclick = function () { openEmail(bTargets()); };
$('egmail').onclick = function () { eOpen('gmail'); };
$('emailto').onclick = function () { eOpen('mailto'); };
$('eskip').onclick = function () { if (eIdx < eQ.length) { eIdx++; eRefresh(); } };
$('ecopy').onclick = function () {
  var txt = eQ.map(function (x) { return x.email; }).join(', ');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { alert(eQ.length + ' emails copied.'); });
  else prompt('Copy these emails:', txt);
};
$('ereset').onclick = function () { $('esub').value = DEF_TPL.subject; $('ebody').value = DEF_TPL.body; saveTpl(); eRefresh(); };
$('eclose').onclick = function () { saveTpl(); $('emo').style.display = 'none'; bRender(); };
$('esub').addEventListener('input', eRefresh);
$('ebody').addEventListener('input', eRefresh);

/* ---------------- carrier tracker (location the carrier shares) ---------------- */
var tFound = [];
function tKey() { return 'track_' + userKey(); }
function getTrack() { try { return JSON.parse(localStorage.getItem(tKey()) || '[]'); } catch (e) { return []; } }
function setTrack(l) { try { localStorage.setItem(tKey(), JSON.stringify(l)); } catch (e) {} }
function tAgo(ts) {
  var m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return m + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago';
  return Math.round(m / 1440) + ' d ago';
}
function tPhoneDigits(p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? '1' + d : d; }
function tMsg() {
  return 'Hi, this is Jax from M&H Dispatch Solutions. Could you please share your current location? On WhatsApp: tap the + (attach) icon, choose Location, then Share live location. Or just reply with your current ZIP code. Thank you!';
}
$('tf').addEventListener('submit', function (e) {
  e.preventDefault();
  $('tmsg').className = ''; $('tmsg').textContent = 'Searching…'; $('tfound').innerHTML = '';
  apiFetch('/api/carrier?type=' + $('ttype').value + '&q=' + encodeURIComponent($('tq').value.trim()))
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      if (!x.ok) { $('tmsg').className = 'err'; $('tmsg').textContent = x.d.error || 'Error'; return; }
      tFound = x.d.results || [];
      $('tmsg').textContent = tFound.length ? tFound.length + ' result(s)' : 'No carrier found.';
      $('tfound').innerHTML = tFound.map(function (c, i) {
        return '<div class="tc"><div class="row"><div><b>' + esc(c.name) + '</b><div class="small">MC ' + esc((c.mc || []).join(', ') || '—') + ' · DOT ' + esc(c.dot) + ' · ' + esc(c.phone || c.cellPhone || 'no phone') + '</div><div class="small">' + esc(c.address || '') + '</div></div><button type="button" class="go" onclick="tAdd(' + i + ')">➕ Track this carrier</button></div></div>';
      }).join('');
    })
    .catch(function () { $('tmsg').className = 'err'; $('tmsg').textContent = 'Could not reach the server.'; });
});
function tAdd(i) {
  var c = tFound[i], l = getTrack();
  if (!c) return;
  if (l.some(function (x) { return x.dot === c.dot; })) { alert('Already in your tracker.'); return; }
  l.unshift({ dot: c.dot, mc: (c.mc || []).join(' '), name: c.name, phone: c.phone || c.cellPhone || '', address: c.address || '', hist: [] });
  setTrack(l); tRender();
}
function tDel(i) { if (!confirm('Remove this carrier from the tracker?')) return; var l = getTrack(); l.splice(i, 1); setTrack(l); tRender(); }
function tCopy(i) {
  var t = tMsg();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { alert('Message copied.'); });
  else prompt('Copy this message:', t);
}
function tSave(i) {
  var zip = $('tz' + i).value.trim(), note = $('tn' + i).value.trim();
  if (!/^\d{5}$/.test(zip)) { alert('Enter a 5-digit ZIP code.'); return; }
  function store(city, state) {
    var l = getTrack();
    if (!l[i]) return;
    l[i].hist = l[i].hist || [];
    l[i].hist.unshift({ t: Date.now(), zip: zip, city: city, state: state, note: note });
    l[i].hist = l[i].hist.slice(0, 50);
    setTrack(l); tRender();
  }
  fetch('https://api.zippopotam.us/us/' + zip)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      var p = d && d.places && d.places[0];
      if (!p) alert('ZIP code not found. Saved without city and state.');
      store(p ? p['place name'] : '', p ? p['state abbreviation'] : '');
    })
    .catch(function () { alert('Could not look up the ZIP code. Saved without city and state.'); store('', ''); });
}
function tRender() {
  var l = getTrack();
  if (!l.length) { $('tlist').innerHTML = '<p class="small">No carriers tracked yet. Find a carrier above and press Track.</p>'; return; }
  $('tlist').innerHTML = l.map(function (x, i) {
    var last = x.hist && x.hist[0], age = last ? (Date.now() - last.t) / 3600000 : 0;
    var cls = !last ? 'old' : age < 4 ? 'fresh' : age < 24 ? 'stale' : 'old';
    var where = last ? esc([last.city, last.state].filter(Boolean).join(', ') || 'ZIP ' + last.zip) + ' <span class="small">' + esc(last.zip) + '</span>' : '<span class="small">No location shared yet</span>';
    var wa = tPhoneDigits(x.phone), m = encodeURIComponent(tMsg());
    var hist = (x.hist || []).map(function (h2) {
      return '<div class="small">' + new Date(h2.t).toLocaleString() + ' · ' + esc([h2.city, h2.state].filter(Boolean).join(', ')) + ' ' + esc(h2.zip) + (h2.note ? ' · ' + esc(h2.note) : '') + '</div>';
    }).join('');
    return '<div class="tc"><div class="row"><div><b>' + esc(x.name) + '</b><div class="small">MC ' + esc(x.mc || '—') + ' · DOT ' + esc(x.dot) + ' · ' + esc(x.phone || 'no phone') + '</div>' +
      (x.address ? '<div class="small">Registered base: <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(x.address) + '">' + esc(x.address) + '</a> (not live location)</div>' : '') + '</div>' +
      '<span class="badge ' + cls + '">' + (last ? 'Updated ' + tAgo(last.t) : 'No update') + '</span></div>' +
      '<div class="where" style="margin-top:10px">📍 ' + where + (last ? ' <a class="small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(last.zip) + '">Map</a>' : '') + '</div>' +
      '<div class="acts">' +
        (wa ? '<a class="btnlike" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + m + '">💬 Ask on WhatsApp</a><a class="btnlike" href="sms:+' + wa + '?body=' + m + '">📱 Ask by SMS</a>' : '') +
        '<button type="button" onclick="tCopy(' + i + ')">Copy message</button><button type="button" onclick="tDel(' + i + ')">Remove</button></div>' +
      '<div class="upd"><input id="tz' + i + '" placeholder="Their ZIP code" maxlength="5" inputmode="numeric" style="max-width:150px"><input id="tn' + i + '" placeholder="Note (optional)" style="flex:1"><button type="button" class="go" onclick="tSave(' + i + ')">Save location</button></div>' +
      (hist ? '<details style="margin-top:10px"><summary class="small">History (' + x.hist.length + ')</summary>' + hist + '</details>' : '') + '</div>';
  }).join('');
}

/* ---------------- carrier documents ---------------- */
var dCur = null, DI = [['agr','Dispatch Agreement (signed)'],['w9','W-9 (signed)'],['mc','MC authority letter'],['coi','Insurance certificate (COI)']];
function dn(c) {
  return { name: c.name || '', dba: c.dba || '', mc: c.mc || '', dot: c.dot || '', officer: c.officer || '', phone: c.phone || c.cellPhone || '', email: c.email || '',
    addr: c.address || [c.city, c.state].filter(Boolean).join(', '), units: c.powerUnits || c.units || '', drivers: c.drivers || '', equip: c.equipment || '',
    auth: c.authority || c.common || '', ins: c.ins ? c.ins + (c.insAmt ? ' $' + c.insAmt + 'K' : '') : '', safety: c.safety || '', crashes: c.crashes == null ? '' : c.crashes, added: c.addDate || '' };
}
function dOpen(c) { dCur = dn(c); $('dtitle').textContent = dCur.name + ' · MC ' + dCur.mc + ' · DOT ' + dCur.dot; dList(); $('dmo').style.display = 'flex'; }
function docBulk(k) { var r = bulk.filter(function (x) { return x._k === k; })[0]; if (r) dOpen(r); }
function docLead(i) { var l = getLeads()[i]; if (l) dOpen(l); }
$('bres').addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[data-doc]') : null; if (b) docBulk(b.getAttribute('data-doc')); });
function dSt() { try { return JSON.parse(localStorage.getItem('docs_' + userKey()) || '{}'); } catch (e) { return {}; } }
function dSet(k, f, v) { var a = dSt(), o = a[dCur.dot] = a[dCur.dot] || {}; o[k] = o[k] || {}; o[k][f] = v; try { localStorage.setItem('docs_' + userKey(), JSON.stringify(a)); } catch (e) {} }
function dList() {
  var s = dSt()[dCur.dot] || {};
  $('dlist').innerHTML = DI.map(function (d) {
    var v = s[d[0]] || {};
    return '<div class="mrow"><b style="min-width:200px">' + d[1] + '</b><select onchange="dSet(\'' + d[0] + '\',\'s\',this.value)">' +
      ['Pending', 'Requested', 'Received'].map(function (o) { return '<option' + (o === (v.s || 'Pending') ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select><input type="file" style="max-width:190px" onchange="dUp(\'' + d[0] + '\',this)">' + (v.f ? '<span class="small">📎 ' + esc(v.f) + '</span>' : '') + '</div>';
  }).join('');
}
function dUp(k, inp) {
  var f = inp.files[0]; if (!f) return;
  if (!sb || !session) { alert('Upload ke liye login zaroori hai.'); return; }
  var p = session.user.id + '/' + dCur.dot + '/' + k + '-' + f.name.replace(/[^\w.\-]/g, '_');
  sb.storage.from('carrier-docs').upload(p, f, { upsert: true }).then(function (r) {
    if (r.error) { alert('Upload fail: ' + r.error.message + '. Supabase mein "carrier-docs" bucket banayein.'); return; }
    dSet(k, 'f', f.name); dSet(k, 's', 'Received'); dList();
  });
}
function dPrint(t, body) {
  var w = window.open('', '_blank'); if (!w) { alert('Popup allow karein.'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(t) + '</title><style>body{font:14px/1.5 Arial,sans-serif;max-width:760px;margin:30px auto;padding:0 20px;color:#111}h1{font-size:22px;border-bottom:2px solid #0a1830;padding-bottom:6px}h2{font-size:15px;margin:16px 0 4px}table{width:100%;border-collapse:collapse}td{border:1px solid #bbb;padding:7px 9px;vertical-align:top}td:first-child{width:38%;background:#f3f5f9;font-weight:700}.sig{margin-top:40px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #000;padding-top:4px}.n{font-size:12px;color:#555}</style></head><body>' + body + '</body></html>');
  w.document.close(); setTimeout(function () { w.print(); }, 500);
}
function dTab(a) { return '<table>' + a.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + (esc(r[1]) || '&nbsp;') + '</td></tr>'; }).join('') + '</table>'; }
function dToday() { return new Date().toLocaleDateString('en-US'); }
function dAgr() {
  var c = dCur, co = esc($('dco').value), rp = esc($('drep').value), fee = esc($('dfee').value), law = esc($('dlaw').value) || '__________';
  var cl = [['Services', 'Dispatcher will search for, negotiate and book freight loads for Carrier, and handle related dispatch paperwork and communication.'],
    ['Fee', 'Carrier pays Dispatcher ' + fee + '% of the gross linehaul revenue of each load booked by Dispatcher, due within 7 days after Carrier is paid for that load.'],
    ['Carrier responsibilities', 'Carrier keeps active operating authority and required insurance, operates safely and legally, and delivers loads on time.'],
    ['Independent parties', 'Dispatcher is not a motor carrier or broker for these loads. Carrier remains an independent contractor and is responsible for its drivers, equipment and compliance.'],
    ['Term', 'This Agreement starts on the date above. Either party may end it with 7 days written notice. Fees on loads already booked stay payable.'],
    ['Confidentiality', 'Both parties keep rates, customers and business information confidential.'],
    ['Liability', 'Dispatcher is not liable for cargo loss, damage, delay or accidents. Carrier carries its own insurance for these.'],
    ['Governing law', 'This Agreement is governed by the laws of ' + law + '.']];
  dPrint('Dispatch Agreement', '<h1>Dispatch Service Agreement</h1><p>Date: ' + dToday() + '</p><p>Between <b>' + co + '</b> ("Dispatcher") and <b>' + esc(c.name) + '</b> ("Carrier"), MC ' + esc(c.mc) + ', USDOT ' + esc(c.dot) + ', ' + esc(c.addr) + '.</p>' +
    cl.map(function (x, i) { return '<h2>' + (i + 1) + '. ' + x[0] + '</h2><div>' + x[1] + '</div>'; }).join('') +
    '<div class="sig"><div>Dispatcher: ' + co + '<br>' + rp + '<br>Date: ________</div><div>Carrier: ' + esc(c.name) + '<br>Name: ____________<br>Signature / Date: ________</div></div>');
}
function dPdf(file, title, note, rows, extra) {
  if (!window.jspdf) { alert('PDF library did not load. Refresh and try again.'); return; }
  var D = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' }), y = 60;
  D.setFontSize(18); D.text(title, 50, y); y += 10; D.setLineWidth(1.5); D.line(50, y, 562, y); y += 22;
  D.setFontSize(10); D.setTextColor(90);
  D.splitTextToSize(note, 512).forEach(function (l) { D.text(l, 50, y); y += 13; });
  D.setTextColor(0); y += 8; D.setFontSize(11); D.setLineWidth(0.5);
  rows.forEach(function (r) {
    var v = D.splitTextToSize(String(r[1] == null ? '' : r[1]), 300), h = Math.max(26, v.length * 14 + 12);
    D.setFillColor(243, 245, 249); D.rect(50, y, 190, h, 'FD'); D.rect(240, y, 322, h);
    D.setFont(undefined, 'bold'); D.text(r[0], 56, y + 17); D.setFont(undefined, 'normal');
    v.forEach(function (l, i) { D.text(l, 246, y + 17 + i * 14); });
    y += h;
  });
  y += 18; D.setFontSize(10);
  (extra || []).forEach(function (t) { D.splitTextToSize(t, 512).forEach(function (l) { D.text(l, 50, y); y += 13; }); y += 6; });
  D.save(file);
}
function dW9() {
  var c = dCur;
  dPdf('W9-' + (c.dot || 'carrier') + '.pdf', 'Form W-9 Information (pre-filled)', 'Pre-filled from public FMCSA data on ' + dToday() + '. The carrier must check the details, add the tax ID and sign.',
    [['1. Name (as on tax return)', c.name], ['2. Business / DBA name', c.dba], ['3. Federal tax classification', ''], ['5. Address', c.addr], ['MC / USDOT', c.mc + ' / ' + c.dot], ['Part I. Tax ID (EIN or SSN)', ''], ['Part II. Signature', ''], ['Date', '']],
    ['Use the official IRS Form W-9 for the final signed copy: https://www.irs.gov/pub/irs-pdf/fw9.pdf']);
}
function dW9msg() {
  var c = dCur, m = 'Hi ' + (c.officer || '') + ', this is ' + $('drep').value + ' from ' + $('dco').value + '. To onboard ' + c.name + ' please fill in and sign a W-9 and send it back here: https://www.irs.gov/pub/irs-pdf/fw9.pdf Thank you!';
  var d = tPhoneDigits(c.phone);
  if (d) window.open('https://wa.me/' + d + '?text=' + encodeURIComponent(m), '_blank');
  else if (navigator.clipboard) navigator.clipboard.writeText(m).then(function () { alert('No phone. Message copied.'); });
  dSet('w9', 's', 'Requested'); dList();
}
function dLI() { window.open('https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?n_dotno=' + encodeURIComponent(dCur.dot), '_blank'); }
function dMC() {
  var c = dCur;
  dPdf('MC-Letter-' + (c.mc || c.dot || 'carrier') + '.pdf', 'Carrier Authority Verification', 'Prepared by ' + $('dco').value + ' on ' + dToday() + ' from public FMCSA data. This is not an official FMCSA document.',
    [['Carrier', c.name], ['MC number', c.mc], ['USDOT number', c.dot], ['Authority status', c.auth], ['Insurance', c.ins], ['Power units', c.units], ['Safety rating', c.safety], ['Address', c.addr]],
    ['Verify live on FMCSA: https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?n_dotno=' + c.dot]);
}
function dProf() {
  var c = dCur;
  dPrint('Carrier profile', '<h1>Carrier Profile · ' + esc(c.name) + '</h1><p class="n">Generated ' + dToday() + ' from public FMCSA data.</p>' +
    dTab([['Company', c.name], ['DBA', c.dba], ['MC / USDOT', c.mc + ' / ' + c.dot], ['Officer', c.officer], ['Phone', c.phone], ['Email', c.email], ['Address', c.addr], ['Power units', c.units], ['Drivers', c.drivers], ['Equipment', c.equip], ['Authority', c.auth], ['Insurance', c.ins], ['Safety rating', c.safety], ['Crashes', c.crashes], ['In census since', c.added]]));
}

/* ---------------- documents page (search any MC / DOT) ---------------- */
var dFound = [];
function dAdapt(c) {
  var b = c.insurance && c.insurance.bipdOnFile > 0;
  return { name: c.name, dba: c.legalName && c.legalName !== c.name ? c.legalName : '', mc: (c.mc || []).join(' '), dot: c.dot, officer: c.officer1, phone: c.phone, cellPhone: c.cellPhone, email: c.email, address: c.address,
    powerUnits: c.powerUnits, drivers: c.drivers, authority: c.common, safety: c.safetyRating, crashes: c.crashTotal, ins: b ? 'On File' : 'None', insAmt: b ? c.insurance.bipdOnFile : 0 };
}
function dPick(i, fn) { dCur = dn(dAdapt(dFound[i])); window[fn](); }
$('df').addEventListener('submit', function (e) {
  e.preventDefault();
  var q = $('dq').value.replace(/\D/g, '');
  $('dmsg').className = ''; $('dmsg').textContent = 'Searching…'; $('dfound').innerHTML = '';
  apiFetch('/api/carrier?type=' + $('dtype').value + '&q=' + encodeURIComponent(q))
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      if (!x.ok) { $('dmsg').className = 'err'; $('dmsg').textContent = x.d.error || 'Error'; return; }
      dFound = x.d.results || [];
      $('dmsg').textContent = dFound.length ? dFound.length + ' result(s)' : 'No carrier found.';
      $('dfound').innerHTML = dFound.map(function (c, i) {
        var B = function (t, f, cls) { return '<button type="button"' + (cls ? ' class="' + cls + '"' : '') + ' onclick="dPick(' + i + ',\'' + f + '\')">' + t + '</button>'; };
        return '<div class="tc"><div class="row"><div><b>' + esc(c.name) + '</b><div class="small">MC ' + esc((c.mc || []).join(', ') || '—') + ' · DOT ' + esc(c.dot) + ' · Authority: ' + esc(c.common || '—') + '</div><div class="small">' + esc(c.address || '') + '</div></div></div>' +
          '<div class="acts">' + B('🔗 FMCSA authority page', 'dLI', 'go') + B('⬇ W-9 PDF', 'dW9', 'go') + B('W-9 request (WhatsApp)', 'dW9msg') + B('⬇ MC letter PDF', 'dMC') + B('Dispatch Agreement', 'dAgr') + B('Profile sheet', 'dProf') + '</div></div>';
      }).join('');
    })
    .catch(function () { $('dmsg').className = 'err'; $('dmsg').textContent = 'Could not reach the server.'; });
});

/* ---------------- carrier score ---------------- */
function bScore(x) {
  var s = 0, a = String(x.authority || ''), sf = String(x.safety || ''), cr = x.crashes === '' || x.crashes == null ? null : Number(x.crashes), u = Number(x.powerUnits) || 0;
  if (/active/i.test(a)) s += 30; else if (/pend/i.test(a)) s += 10; else if (/inactive/i.test(a)) s -= 30;
  if (x.ins === 'On File') s += 25 + (Number(x.insAmt) >= 750 ? 5 : 0); else if (x.ins === 'None') s -= 10;
  if (/^satis/i.test(sf)) s += 10; else if (/condit|unsat/i.test(sf)) s -= 10;
  if (cr === 0) s += 15; else if (cr !== null && cr <= 2) s += 8; else if (cr > 5) s -= 5;
  if (u >= 1 && u <= 5) s += 10; else if (u > 5 && u <= 20) s += 5;
  if (x.email) s += 5; if (x.phone || x.cellPhone) s += 5;
  return Math.max(0, Math.min(100, s));
}
function bScoreTd(x) { var s = bScore(x); return '<span class="au ' + (s >= 70 ? 'au-Active' : s >= 45 ? 'au-Pending' : 'au-Unknown') + '" title="Authority, insurance, safety, crashes, fleet size, contact info">' + s + '</span>'; }

/* ---------------- saved searches + new carrier alerts ---------------- */
function ssKey() { return 'ss_' + userKey(); }
function ssGet() { try { return JSON.parse(localStorage.getItem(ssKey()) || '[]'); } catch (e) { return []; } }
function ssPut(a) { try { localStorage.setItem(ssKey(), JSON.stringify(a)); } catch (e) {} }
function ssCur() {
  var m = $('bmode').value, span = 2;
  if (m === 'date' && $('dfrom').value && $('dto').value) span = Math.max(1, Math.round((Date.parse($('dto').value) - Date.parse($('dfrom').value)) / 86400000));
  return { m: m, from: $('bfrom').value, to: $('bto').value, span: span, min: $('bmin').value, max: $('bmax').value, state: $('bstate').value, city: $('bcity').value, auth: $('bauth').value, match: $('bmatch').value, ins: $('bins').value, em: $('bhasemail').checked, ph: $('bhasphone').checked, hide: $('bhide').checked, equip: checked('bequip'), cargo: checked('bcargo') };
}
function ssTick(id, v) { var a = v ? v.split('|') : []; Array.prototype.forEach.call($(id).querySelectorAll('input'), function (i) { i.checked = a.indexOf(i.value) !== -1; }); }
function ssApply(f) {
  $('bmode').value = f.m; $('bmode').onchange();
  if (f.m === 'mc') { $('bfrom').value = f.from; $('bto').value = f.to; }
  else { var t = new Date(); $('dto').value = isoLocal(t); $('dfrom').value = isoLocal(new Date(t.getTime() - f.span * 86400000)); }
  $('bmin').value = f.min; $('bmax').value = f.max; $('bstate').value = f.state; $('bcity').value = f.city; $('bauth').value = f.auth; $('bmatch').value = f.match; $('bins').value = f.ins;
  $('bhasemail').checked = f.em; $('bhasphone').checked = f.ph; $('bhide').checked = f.hide; ssTick('bequip', f.equip); ssTick('bcargo', f.cargo);
  if (typeof cargoLabel === 'function') cargoLabel();
}
function ssFill(sel) {
  $('ssel').innerHTML = '<option value="">Saved searches…</option>' + ssGet().map(function (x) { return '<option' + (x.name === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('');
  var c = ssGet().filter(function (x) { return x.name === $('ssel').value; })[0]; $('ssalert').checked = !!(c && c.alert);
}
function ssRunName(n) { var c = ssGet().filter(function (x) { return x.name === n; })[0]; if (!c) return; if (bLoading) { alert('Wait for the current search to finish.'); return; } ssFill(n); ssApply(c.f); $('bgo').click(); }
$('ssel').onchange = function () { ssFill($('ssel').value); };
$('ssrun').onclick = function () { if ($('ssel').value) ssRunName($('ssel').value); };
$('sssave').onclick = function () {
  var n = prompt('Name for this search (e.g. Texas box trucks)', $('ssel').value || ''); if (!n) return; n = n.trim();
  var a = ssGet().filter(function (x) { return x.name !== n; }); a.push({ name: n, f: ssCur(), alert: $('ssalert').checked && $('bmode').value === 'date' }); ssPut(a); ssFill(n); ssCheck();
};
$('ssdel').onclick = function () { var n = $('ssel').value; if (!n || !confirm('Delete saved search "' + n + '"?')) return; ssPut(ssGet().filter(function (x) { return x.name !== n; })); ssFill(); ssCheck(); };
$('ssalert').onchange = function () {
  var n = $('ssel').value; if (!n) return;
  var a = ssGet(); a.forEach(function (x) { if (x.name === n) { if ($('ssalert').checked && x.f.m !== 'date') { alert('Alert only works for Date range searches.'); $('ssalert').checked = false; return; } x.alert = $('ssalert').checked; } });
  ssPut(a); ssCheck();
};
function ssUrl(f, from, to) {
  var e = encodeURIComponent;
  return '/api/bulk?mode=date&from=' + from + '&to=' + to + '&min=' + e(f.min) + '&max=' + e(f.max) + '&equip=' + e(f.equip) + '&auth=&noauth=1&match=' + f.match + '&cargo=' + e(f.cargo) + '&state=' + e(f.state) + '&city=' + e(f.city) + '&hasemail=' + (f.em ? 1 : 0) + '&hasphone=' + (f.ph ? 1 : 0);
}
function ssCheck() {
  var L = ssGet().filter(function (x) { return x.alert && x.f.m === 'date'; }), box = $('salert');
  if (!L.length) { box.style.display = 'none'; return; }
  apiFetch('/api/bulk?mode=latest').then(function (r) { return r.json(); }).then(function (d) {
    var last = d.latest; if (!/^\d{4}-\d{2}-\d{2}$/.test(last || '')) return;
    var from = new Date(Date.parse(last + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10), lm = bLeadMap();
    return Promise.all(L.map(function (x) {
      return apiFetch(ssUrl(x.f, from, last)).then(function (r) { return r.json(); }).then(function (j) {
        var n = (j.rows || []).filter(function (c) { return !lm[c.dot]; }).length; return { name: x.name, n: n };
      }).catch(function () { return { name: x.name, n: -1 }; });
    })).then(function (res) {
      box.style.display = 'block';
      box.innerHTML = '🔔 <b>New carriers (' + from + ' to ' + last + ')</b><br>' + res.map(function (r) {
        return esc(r.name) + ': ' + (r.n < 0 ? 'check failed' : r.n + (r.n >= 1000 ? '+' : '') + ' new') + ' <button type="button" class="linkbtn" onclick="ssRunName(decodeURIComponent(\'' + encodeURIComponent(r.name).replace(/'/g, '%27') + '\'))">Open</button>';
      }).join('<br>');
    });
  }).catch(function () {});
}
var _showApp = showApp;
showApp = function () { _showApp.apply(this, arguments); ssFill(); setTimeout(ssCheck, 1500); };

/* ---------------- team access (shared leads, admin approval) ---------------- */
var tOn = false, tMe = null, tPrev = {}, tTimer = null, tPush = null, tPulling = false;
function tName() { return (tMe && (tMe.name || tMe.email)) || ''; }
function tSig(x) { return JSON.stringify(x); }
function tPull() {
  if (!tOn || tPulling || tPush) return; tPulling = true;
  sb.from('team_leads').select('dot,data').then(function (r) {
    tPulling = false; if (r.error || tPush) return;
    var l = r.data.map(function (x) { return x.data; }); tPrev = {}; l.forEach(function (x) { tPrev[x.dot] = tSig(x); });
    try { localStorage.setItem(leadsKey(), JSON.stringify(l)); } catch (e) {}
    renderLeads(); bRender();
  });
}
function tSync() {
  tPush = null; if (!tOn) return;
  var l = getLeads().filter(function (x) { return x.dot; }), cur = {}, ups = [], dels = [];
  l.forEach(function (x) { cur[x.dot] = 1; if (tPrev[x.dot] !== tSig(x)) ups.push({ dot: x.dot, data: x, owner: x.owner || tMe.id, owner_name: x.ownerName || tName(), updated_at: new Date().toISOString() }); });
  Object.keys(tPrev).forEach(function (d) { if (!cur[d]) dels.push(d); });
  if (ups.length) sb.from('team_leads').upsert(ups, { onConflict: 'dot' }).then(function (r) { if (r.error) console.error(r.error); else ups.forEach(function (u) { tPrev[u.dot] = tSig(u.data); }); });
  if (dels.length) sb.from('team_leads').delete().in('dot', dels).then(function (r) { if (r.error) console.error(r.error); else dels.forEach(function (d) { delete tPrev[d]; }); });
}
var _setLeads = setLeads;
setLeads = function (l) {
  if (tOn) l.forEach(function (x) { if (!x.owner) { x.owner = tMe.id; x.ownerName = tName(); } });
  _setLeads(l);
  if (tOn) { clearTimeout(tPush); tPush = setTimeout(tSync, 700); }
};
function tFirst() {
  sb.from('team_leads').select('dot').then(function (r) {
    if (r.error) { tOn = false; return; }
    var have = {}; r.data.forEach(function (x) { have[x.dot] = 1; });
    var up = getLeads().filter(function (x) { return x.dot && !have[x.dot]; }).map(function (x) { x.owner = x.owner || tMe.id; x.ownerName = x.ownerName || tName(); return { dot: x.dot, data: x, owner: tMe.id, owner_name: tName() }; });
    (up.length ? sb.from('team_leads').upsert(up, { onConflict: 'dot' }) : Promise.resolve({})).then(function () {
      tPull(); clearInterval(tTimer); tTimer = setInterval(tPull, 60000);
    });
  });
}
function teamInit() {
  if (guest || !sb || !session) return;
  sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(function (r) {
    if (r.error || !r.data) return; /* team tables not set up: keep working locally */
    tMe = r.data; planBar();
    if (!tMe.approved) return; /* customer: own leads, plan limits apply */
    tOn = true;
    if (tMe.role === 'admin') { $('navTeam').style.display = ''; $('bassignwrap').style.display = 'inline-block'; sb.from('profiles').select('*').then(function (r2) { if (!r2.error) { tCache = r2.data; bAssignFill(); } }); }
    tFirst();
  });
}
var tCache = [];
function tLoad() {
  $('tmlist').innerHTML = '<p class="small" style="padding:14px">Loading…</p>';
  sb.from('profiles').select('*').order('created_at').then(function (r) {
    if (r.error) { $('tmlist').innerHTML = '<p class="small err" style="padding:14px">' + esc(r.error.message) + '</p>'; return; }
    tCache = r.data || []; tShow();
  });
}
function tShow() { try { tShow2(); } catch (e) { $('tmlist').innerHTML = '<p class="small err" style="padding:14px">Team list error: ' + esc(e.message) + '</p>'; } }
function tShow2() {
  var q = ($('tmq').value || '').trim().toLowerCase();
  var rows = tCache.filter(function (m) { return !q || String(m.email || '').toLowerCase().indexOf(q) !== -1 || String(m.name || '').toLowerCase().indexOf(q) !== -1; });
  if (!rows.length) { $('tmlist').innerHTML = '<p class="small" style="padding:14px">No account found with this email. (' + tCache.length + ' accounts loaded in total)</p>'; return; }
  $('tmlist').innerHTML = '<table><thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Plan</th><th></th></tr></thead><tbody>' + rows.map(function (m) {
    var me = m.id === session.user.id, live = m.plan === 'paid' && m.plan_expires && Date.parse(m.plan_expires) > Date.now();
    var plan = m.approved ? 'Team' : live ? 'Paid until ' + m.plan_expires.slice(0, 10) : m.plan === 'paid' ? 'Expired' : 'Free';
    var B = function (t, o) { return '<button type="button" onclick="tSet(\'' + m.id + '\',' + o + ')">' + t + '</button> '; };
    return '<tr><td>' + esc(m.name || '') + '</td><td>' + esc(m.email || '') + '</td><td>' + (m.approved ? esc(m.role) : 'customer') + '</td><td><span class="au ' + (m.approved || live ? 'au-Active' : 'au-Unknown') + '">' + esc(plan) + '</span></td><td>' +
      (me ? '(you)' : B(m.approved ? 'Remove from team' : 'Add to team', '{approved:' + !m.approved + '}') + (m.approved ? B(m.role === 'admin' ? 'Make member' : 'Make admin', "{role:'" + (m.role === 'admin' ? 'member' : 'admin') + "'}") : B('✅ +30 days', 'tPlus(\'' + (m.plan_expires || '') + '\')') + B('Set free', "{plan:'free'}"))) + '</td></tr>';
  }).join('') + '</tbody></table>';
}
function tPlus(exp) { var base = Math.max(Date.now(), exp ? Date.parse(exp) : 0); return { plan: 'paid', plan_expires: new Date(base + PLAN.days * 86400000).toISOString() }; }
function tSet(id, o) { sb.from('profiles').update(o).eq('id', id).then(function (r) { if (r.error) alert(r.error.message); tLoad(); }); }
var _showView = showView;
showView = function (v) { _showView(v); if (v === 'team') { tLoad(); tStats(); } if (v === 'pipe') renderPipe(); };
var _showApp2 = showApp;
showApp = function () { _showApp2.apply(this, arguments); teamInit(); };

/* ---------------- plans: Free / Paid (30 days) ---------------- */
var PLAN = { days: 30, price: '', wa: '923154524552' }; /* wa = your WhatsApp number with country code, digits only, e.g. '923001234567'; price is optional */ /* write your price and how to pay here, e.g. price: 'Rs 5000', pay: 'Easypaisa 03xx...' */
function planInfo() {
  if (!tMe) return { pro: true, label: '' };
  if (tMe.approved) return { pro: true, label: 'Team' };
  var d = tMe.plan_expires ? Math.ceil((Date.parse(tMe.plan_expires) - Date.now()) / 86400000) : 0;
  if (tMe.plan === 'paid' && d > 0) return { pro: true, label: 'Pro · ' + d + ' days left', d: d };
  return { pro: false, label: tMe.plan === 'paid' ? 'Plan expired' : 'Free plan' };
}
function isPro() { return planInfo().pro; }
function planBar() {
  var b = $('planbar'), p = planInfo();
  if (!tMe || p.label === 'Team') { b.style.display = 'none'; return; }
  b.style.display = 'flex';
  b.innerHTML = '<b>' + esc(p.label) + '</b>' + (p.pro ? '' : ' <span class="small">25 carriers per search. No emails, documents, alerts or insurance check.</span>') +
    (!p.pro || p.d <= 5 ? ' <button type="button" class="go" onclick="upOpen()">⭐ ' + (p.pro ? 'Renew' : 'Upgrade') + '</button>' : '');
}
function upOpen() {
  var em = session && session.user ? session.user.email : '';
  var msg = encodeURIComponent('Assalamualaikum sir. This is my email: ' + em + ' . Please activate my paid plan.');
  $('upbody').innerHTML = '<p><b>How to buy the Paid plan</b></p><ol><li>Contact us on WhatsApp to buy the Paid plan' + (PLAN.price ? ' (' + esc(PLAN.price) + ')' : '') + '.</li><li>Give us the email you used to create your account:<br><b>' + esc(em) + '</b></li><li>We activate the Paid plan on that email. It stays active for ' + PLAN.days + ' days and then ends.</li></ol>' +
    (PLAN.wa ? '<p><a class="go" style="padding:10px 16px;border-radius:10px;display:inline-block;color:#fff" target="_blank" href="https://wa.me/' + esc(PLAN.wa) + '?text=' + msg + '">💬 Contact on WhatsApp</a></p>' : '<p class="small">WhatsApp number is not set yet.</p>');
  $('upmo').style.display = 'flex';
}
['openEmail', 'dOpen', 'dPick'].forEach(function (n) { var f = window[n]; window[n] = function () { if (!isPro()) { upOpen(); return; } return f.apply(this, arguments); }; });
var _ssCheck = ssCheck; ssCheck = function () { if (isPro()) _ssCheck(); };

/* ---------------- activity log, pipeline, assign, dispatch handoff, team activity ---------------- */
var lgDot = null, LG_ST = ['New', 'Contacted', 'Interested', 'Onboarded', 'Not interested'];
function lgMe() { return tMe ? tName() : (session && session.user ? session.user.email : 'me'); }
function lgLead(l) { return l.filter(function (y) { return y.dot === lgDot; })[0]; }
function lgAdd(dot, e) {
  var l = getLeads(), x = l.filter(function (y) { return y.dot === dot; })[0]; if (!x) return;
  e.t = new Date().toISOString(); e.by = lgMe(); (x.log = x.log || []).push(e);
  if (e.type !== 'note' && (!x.status || x.status === 'New')) x.status = 'Contacted';
  setLeads(l);
}
function lgSave(fn) { var l = getLeads(), x = lgLead(l); if (!x) return; fn(x); setLeads(l); renderLeads(); lgRender(); }
function lgCall(o) { lgAdd(lgDot, { type: 'call', out: o }); renderLeads(); lgRender(); }
function lgOpen(dot) {
  lgDot = dot; $('lgmo').style.display = 'flex'; lgRender();
  if (tOn && tMe.role === 'admin' && !tCache.length) sb.from('profiles').select('*').then(function (r) { if (!r.error) { tCache = r.data; lgRender(); } });
}
function lgRender() {
  var x = lgLead(getLeads()); if (!x) return;
  var ph = String(x.phone || '').replace(/\D/g, ''), B = function (t, f) { return '<button type="button" onclick="' + f + '">' + t + '</button>'; };
  var mem = tOn && tMe.role === 'admin' ? tCache.filter(function (m) { return m.approved; }) : [];
  $('lgbody').innerHTML = '<h3>' + esc(x.name) + '</h3><div class="small">MC ' + esc(x.mc || '') + ' · DOT ' + esc(x.dot) + ' · ' + esc(x.address || '') + '</div>' +
    '<div class="mrow">' + (ph ? '<a class="btnlike go" style="padding:8px 12px;color:#fff" target="_blank" rel="noopener" href="' + gvUrl(x.phone) + '" data-gv="' + esc(x.phone) + '" data-dot="' + esc(x.dot) + '">🎙️ Google Voice call</a><a class="btnlike" style="padding:8px 12px" href="tel:+' + (ph.length === 10 ? '1' + ph : ph) + '">📞 Phone ' + esc(x.phone) + '</a><a class="btnlike" style="padding:8px 12px" target="_blank" href="https://wa.me/' + ph + '">💬 WhatsApp</a>' : '<span class="small">No phone</span>') + '</div>' +
    '<label class="fl">Call outcome</label><div class="mrow" style="margin-top:0">' + ['Answered', 'Voicemail', 'No answer', 'Hung up', 'Not a trucking company', 'Wrong number'].map(function (o) { return B(o, "lgCall('" + o + "')"); }).join('') + '</div>' +
    '<div class="mrow">' + B('💬 Text sent', "lgCall('Text sent')").replace("lgCall('Text sent')", "lgAdd(lgDot,{type:'text',out:'Text sent'});lgRender()") + B('✉️ Email sent', "lgAdd(lgDot,{type:'email',out:'Email sent'});lgRender()") + '</div>' +
    '<div class="mrow"><input id="lgnote" placeholder="Add a note" style="flex:1"><button type="button" onclick="var v=$(\'lgnote\').value.trim();if(v){lgAdd(lgDot,{type:\'note\',out:v});lgRender();}">Add</button></div>' +
    '<label class="fl">Callback date</label><input type="date" value="' + esc(x.follow || '') + '" onchange="var v=this.value;lgSave(function(y){y.follow=v;})">' +
    '<label class="fl">Stage</label><select onchange="var v=this.value;lgSave(function(y){y.status=v;})">' + LG_ST.map(function (o) { return '<option' + (o === (x.status || 'New') ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>' +
    (mem.length ? '<label class="fl">Assigned to</label><select onchange="lgAssign(this.value)"><option value="">' + esc(x.ownerName || 'Unassigned') + '</option>' + mem.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name || m.email) + '</option>'; }).join('') + '</select>' : (x.ownerName ? '<div class="small" style="margin-top:8px">👤 ' + esc(x.ownerName) + '</div>' : '')) +
    '<div class="mrow">' + (x.dispatch ? '<span class="au au-Active">With dispatch since ' + esc(x.dispatch.t.slice(0, 10)) + '</span>' : B('➡ Send to dispatch team', "if(confirm('Mark as onboarded and hand over to dispatch?'))lgSave(function(y){y.dispatch={t:new Date().toISOString(),by:lgMe()};y.status='Onboarded';(y.log=y.log||[]).push({type:'note',out:'Sent to dispatch',t:y.dispatch.t,by:lgMe()});})")) + '</div>' +
    '<h3 style="margin-top:16px">History</h3>' + ((x.log || []).slice(-15).reverse().map(function (g) { return '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)">' + esc(new Date(g.t).toLocaleString()) + ' · ' + esc(g.by || '') + ' · <b>' + esc(g.type) + '</b>: ' + esc(g.out || '') + '</div>'; }).join('') || '<div class="small">No activity yet.</div>');
}
function lgAssign(id) {
  var m = tCache.filter(function (y) { return y.id === id; })[0]; if (!m) return;
  lgSave(function (y) { y.owner = m.id; y.ownerName = m.name || m.email; });
}
function pipeMove(dot, v) { var l = getLeads(), x = l.filter(function (y) { return y.dot === dot; })[0]; if (x) { x.status = v; setLeads(l); renderPipe(); renderLeads(); } }
function renderPipe() {
  var l = getLeads().filter(lgMine), today = new Date().toISOString().slice(0, 10);
  $('pipe').innerHTML = '<div style="display:flex;gap:12px;overflow-x:auto;align-items:flex-start;padding-bottom:10px">' + LG_ST.concat(['With dispatch']).map(function (c) {
    var it = l.filter(function (x) { return c === 'With dispatch' ? !!x.dispatch : (!x.dispatch && (x.status || 'New') === c); });
    return '<div style="flex:0 0 250px;background:#e2e8f0;border-radius:14px;padding:10px"><b>' + c + '</b> <span class="bd">' + it.length + '</span>' + it.map(function (x) {
      var due = x.follow && x.follow <= today && c !== 'Onboarded' && c !== 'Not interested' && c !== 'With dispatch';
      return '<div class="tc" style="margin:8px 0;padding:10px' + (due ? ';background:#fef9c3' : '') + '"><b>' + esc(x.name) + '</b><div class="small">MC ' + esc(x.mc || '') + ' · ' + esc(x.address || '') + '</div>' + (x.ownerName ? '<div class="small">👤 ' + esc(x.ownerName) + '</div>' : '') + (x.follow ? '<div class="small">📅 ' + esc(x.follow) + (due ? ' · due' : '') + '</div>' : '') +
        '<div class="acts"><select onchange="pipeMove(\'' + esc(x.dot) + '\',this.value)">' + LG_ST.map(function (o) { return '<option' + (o === (x.status || 'New') ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select><button type="button" onclick="lgOpen(\'' + esc(x.dot) + '\')">📞 Log</button></div></div>';
    }).join('') + '</div>';
  }).join('') + '</div>';
}
function tStats() {
  var l = getLeads(), by = {}, today = new Date().toISOString().slice(0, 10), wk = Date.now() - 7 * 86400000;
  var R = function (n) { return by[n] = by[n] || { leads: 0, onb: 0, c: 0, t: 0, e: 0, c7: 0 }; };
  l.forEach(function (x) {
    var o = R(x.ownerName || 'Unassigned'); o.leads++; if (x.status === 'Onboarded' || x.dispatch) o.onb++;
    (x.log || []).forEach(function (g) {
      var m = R(g.by || '?'), td = String(g.t).slice(0, 10) === today;
      if (g.type === 'call') { if (td) m.c++; if (Date.parse(g.t) >= wk) m.c7++; }
      if (g.type === 'text' && td) m.t++; if (g.type === 'email' && td) m.e++;
    });
  });
  var n = Object.keys(by);
  $('tstats').innerHTML = n.length ? '<table><thead><tr><th>Member</th><th>Leads</th><th>Onboarded</th><th>Calls today</th><th>Texts today</th><th>Emails today</th><th>Calls 7 days</th></tr></thead><tbody>' + n.map(function (k) { var v = by[k]; return '<tr><td>' + esc(k) + '</td><td>' + v.leads + '</td><td>' + v.onb + '</td><td>' + v.c + '</td><td>' + v.t + '</td><td>' + v.e + '</td><td>' + v.c7 + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="small" style="padding:14px">No activity yet.</p>';
}
var _mkc = markContacted; markContacted = function (x) { _mkc(x); lgAdd(x.dot, { type: 'email', out: 'Email sent' }); };

/* ---------------- members see only their own leads; bulk assign ---------------- */
function lgMine(x) { return !tOn || !tMe || tMe.role === 'admin' || !x.owner || x.owner === tMe.id; }
function bAssignFill() {
  $('bassign').innerHTML = '<option value="">Assign to…</option>' + tCache.filter(function (m) { return m.approved; }).map(function (m) { return '<option value="' + m.id + '">' + esc(m.name || m.email) + '</option>'; }).join('');
}
$('bassignbtn').onclick = function () {
  var id = $('bassign').value, m = tCache.filter(function (y) { return y.id === id; })[0];
  if (!m) { alert('Choose a team member first.'); return; }
  var t = bTargets(); if (!t.length) return;
  var nm = m.name || m.email; if (!confirm('Assign ' + t.length + ' carriers to ' + nm + '?')) return;
  var l = getLeads(), by = {}; l.forEach(function (x) { by[x.dot] = x; });
  t.forEach(function (c) {
    var x = by[c.dot];
    if (!x) { x = { dot: c.dot, mc: c.mc, name: c.name, address: loc(c) === '—' ? '' : loc(c), authorized: c.authority || '—', common: '', units: c.powerUnits, email: c.email, phone: c.phone || c.cellPhone, officer: c.officer, status: 'New', follow: '', note: '' }; l.push(x); by[c.dot] = x; }
    x.owner = m.id; x.ownerName = nm;
  });
  setLeads(l); renderLeads(); bSel = {}; bRender(); alert(t.length + ' carriers assigned to ' + nm + '.');
};

/* ---------------- Google Voice dialer extension bridge ---------------- */
var cdExt = false;
window.addEventListener('message', function (e) {
  var d = e.data; if (e.source !== window || !d || d.source !== 'carrierdesk-ext') return;
  if (d.type === 'ready') cdExt = true;
  if (d.type === 'dialed' && !d.ok) alert('The dialer extension could not open Google Voice. Check that you are signed in to Google Voice.');
});
window.postMessage({ source: 'carrierdesk', type: 'ping' }, '*');
document.addEventListener('click', function (e) {
  var a = e.target.closest ? e.target.closest('a[data-gv]') : null; if (!a) return;
  var num = a.getAttribute('data-gv'), dot = a.getAttribute('data-dot');
  if (dot) lgAdd(dot, { type: 'call', out: 'Dialed' });
  if (cdExt) { e.preventDefault(); window.postMessage({ source: 'carrierdesk', type: 'dial', number: num }, '*'); }
  if (dot) { renderLeads(); if ($('lgmo').style.display === 'flex') lgRender(); }
});

bRender();
initAuth();
</script>
</body>
</html>
