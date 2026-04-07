#!/usr/bin/env node
/**
 * Hephaestus — Newman JSON → HTML Report  v3.4.0
 *
 * Generates a beautiful, fully self-contained HTML test report
 * from Newman's JSON reporter output.
 *
 * Usage:
 *   node scripts/generate-report.js results.json [report.html]
 *   node scripts/generate-report.js results.json            # → hephaestus-report.html
 *
 * Generate source with Newman:
 *   newman run collection.json -e env.json \
 *     --reporter-json-export results.json -r json
 *
 * GitHub Actions:
 *   - uses: actions/upload-artifact@v4
 *     with:
 *       name: test-report
 *       path: hephaestus-report.html
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const inFile  = args[0];
const outFile = args[1] || 'hephaestus-report.html';

if (!inFile) {
    console.error('Usage: node scripts/generate-report.js <results.json> [output.html]');
    process.exit(1);
}

let raw;
try { raw = fs.readFileSync(inFile, 'utf8'); } catch(e) { console.error('Cannot read: ' + e.message); process.exit(1); }

let data;
try { data = JSON.parse(raw); } catch(e) { console.error('Invalid JSON: ' + e.message); process.exit(1); }

// ─── Parse ───────────────────────────────────────────────────────────────────

const run         = data.run || {};
const stats       = run.stats || {};
const timings     = run.timings || {};
const executions  = run.executions || [];
const colName     = (data.collection && data.collection.info && data.collection.info.name) || 'Newman';
const envName     = (data.environment && data.environment.name) || '—';
const startedAt   = timings.started ? new Date(timings.started).toISOString().replace('T',' ').slice(0,19) + ' UTC' : '—';
const durationMs  = timings.started && timings.completed ? timings.completed - timings.started : 0;

const totalReq    = (stats.requests  && stats.requests.total)    || executions.length;
const failedReq   = (stats.requests  && stats.requests.failed)   || 0;
const totalAssert = (stats.assertions && stats.assertions.total)  || 0;
const failedAssert= (stats.assertions && stats.assertions.failed) || 0;
const passRate    = totalAssert > 0 ? Math.round((totalAssert - failedAssert) / totalAssert * 100) : (failedReq === 0 ? 100 : 0);
const avgTime     = timings.responseAverage || 0;

function fmtDuration(ms) {
    if (!ms) return '—';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms/1000).toFixed(1) + 's';
    return Math.floor(ms/60000) + 'm ' + Math.floor((ms%60000)/1000) + 's';
}

function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function methodColor(m) {
    const colors = { GET:'#3fb950', POST:'#58a6ff', PUT:'#d29922', PATCH:'#ffa657', DELETE:'#f85149', HEAD:'#bc8cff', OPTIONS:'#8b949e' };
    return colors[(m||'').toUpperCase()] || '#8b949e';
}

function statusColor(code) {
    if (!code) return '#8b949e';
    if (code < 300) return '#3fb950';
    if (code < 400) return '#d29922';
    return '#f85149';
}

function timeColor(ms) {
    if (ms <= 500) return '#3fb950';
    if (ms <= 2000) return '#d29922';
    return '#f85149';
}

// SVG donut gauge
function donut(pct) {
    const r = 44, cx = 50, cy = 50;
    const circ = 2 * Math.PI * r;
    const fill = circ * pct / 100;
    const color = pct >= 95 ? '#3fb950' : pct >= 80 ? '#d29922' : '#f85149';
    return `<svg viewBox="0 0 100 100" width="120" height="120" style="display:block;margin:0 auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#30363d" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${fill.toFixed(2)} ${(circ-fill).toFixed(2)}"
        stroke-dashoffset="${(circ/4).toFixed(2)}" stroke-linecap="round"/>
      <text x="${cx}" y="${cy+2}" text-anchor="middle" dominant-baseline="middle"
        font-family="-apple-system,sans-serif" font-weight="700" font-size="16" fill="${color}">${pct}%</text>
      <text x="${cx}" y="${cy+16}" text-anchor="middle" dominant-baseline="middle"
        font-family="-apple-system,sans-serif" font-weight="400" font-size="7" fill="#8b949e">PASS RATE</text>
    </svg>`;
}

// Max response time for bar normalization
const maxTime = Math.max(...executions.map(e => (e.response && e.response.responseTime) || 0), 1);

// Build execution cards HTML
let cardHtml = '';
executions.forEach(function(ex, i) {
    const itemName   = (ex.item && ex.item.name) || 'Request ' + (i+1);
    const resp       = ex.response || {};
    const code       = resp.code || 0;
    const method     = (ex.item && ex.item.request && ex.item.request.method) || '?';
    const elapsed    = resp.responseTime || 0;
    const assertions = ex.assertions || [];
    const failed     = assertions.filter(a => a.error && a.error.message);
    const allPassed  = failed.length === 0;
    const barWidth   = Math.round(elapsed / maxTime * 100);

    let assertHtml = '';
    assertions.forEach(function(a) {
        const ok = !(a.error && a.error.message);
        const icon = ok ? '✅' : '❌';
        const name = esc(a.assertion || '');
        const msg  = !ok ? `<div class="a-err">${esc(a.error.message)}</div>` : '';
        assertHtml += `<div class="assertion ${ok?'pass':'fail'}">${icon} ${name}${msg}</div>`;
    });
    if (!assertHtml) assertHtml = '<div class="assertion muted">— no assertions</div>';

    const statusStyle = `color:${statusColor(code)};border-color:${statusColor(code)};`;
    const methodStyle = `background:${methodColor(method)};`;

    cardHtml += `
    <div class="req-card ${allPassed?'ok':'nok'}" id="req-${i}">
      <div class="req-header" onclick="toggle(${i})">
        <span class="method-badge" style="${methodStyle}">${esc(method)}</span>
        <span class="req-name">${esc(itemName)}</span>
        <div class="req-meta">
          <span class="status-badge" style="${statusStyle}">${code||'—'}</span>
          <span class="time-cell" style="color:${timeColor(elapsed)}">${elapsed}ms</span>
          <span class="pass-icon">${allPassed ? '✅' : '❌ ' + failed.length}</span>
        </div>
        <span class="chevron" id="chev-${i}">▶</span>
      </div>
      <div class="time-bar-wrap">
        <div class="time-bar" style="width:${barWidth}%;background:${timeColor(elapsed)}"></div>
      </div>
      <div class="req-body" id="body-${i}" style="display:none">
        <div class="assert-list">${assertHtml}</div>
      </div>
    </div>`;
});

// ─── Build HTML ───────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hephaestus Report — ${esc(colName)}</title>
<style>
  :root {
    --bg:#0d1117; --bg-card:#161b22; --border:#30363d; --border-h:#58a6ff;
    --text:#c9d1d9; --muted:#8b949e; --accent:#58a6ff; --green:#3fb950;
    --yellow:#d29922; --red:#f85149; --radius:8px;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:24px 16px 64px;}
  a{color:var(--accent);text-decoration:none;}

  /* Header */
  header{max-width:960px;margin:0 auto 28px;}
  .logo{font-size:1.4rem;font-weight:700;margin-bottom:4px;}
  .logo span{color:var(--accent);}
  .meta-row{font-size:0.78rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:16px;margin-top:6px;}
  .meta-row span::before{margin-right:4px;}

  /* Summary cards */
  .summary{max-width:960px;margin:0 auto 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;align-items:center;}
  .stat{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;text-align:center;}
  .stat .v{font-size:1.8rem;font-weight:800;line-height:1;}
  .stat .l{font-size:0.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:4px;font-weight:600;}
  .gauge-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;justify-content:center;}

  /* Filter */
  .filter-row{max-width:960px;margin:0 auto 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
  #search{flex:1;min-width:200px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem;padding:8px 12px;outline:none;transition:border-color .15s;}
  #search:focus{border-color:var(--border-h);}
  .fb{background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);font-size:.75rem;padding:6px 12px;cursor:pointer;transition:all .15s;}
  .fb.active,.fb:hover{border-color:var(--border-h);color:var(--accent);}
  .fb.active{background:rgba(88,166,255,.08);}

  /* Request cards */
  .cards{max-width:960px;margin:0 auto;display:flex;flex-direction:column;gap:8px;}
  .req-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:border-color .15s;}
  .req-card.nok{border-color:rgba(248,81,73,.35);}
  .req-card:hover{border-color:var(--border-h);}
  .req-header{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;flex-wrap:wrap;}
  .req-header:hover{background:rgba(255,255,255,.02);}
  .method-badge{font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:4px;color:#000;white-space:nowrap;flex-shrink:0;}
  .req-name{font-size:.86rem;font-weight:600;flex:1;word-break:break-word;}
  .req-meta{display:flex;align-items:center;gap:10px;margin-left:auto;}
  .status-badge{font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:4px;border:1px solid;background:transparent;white-space:nowrap;}
  .time-cell{font-size:.78rem;font-weight:600;font-family:'SF Mono',monospace;white-space:nowrap;}
  .pass-icon{font-size:.82rem;white-space:nowrap;}
  .chevron{color:var(--muted);font-size:.75rem;transition:transform .2s;flex-shrink:0;}
  .chevron.open{transform:rotate(90deg);}
  .time-bar-wrap{height:3px;background:var(--border);}
  .time-bar{height:3px;border-radius:0;transition:width .3s;}

  /* Assertions */
  .req-body{border-top:1px solid var(--border);}
  .assert-list{padding:12px 14px;display:flex;flex-direction:column;gap:5px;}
  .assertion{font-size:.78rem;padding:5px 10px;border-radius:5px;line-height:1.4;}
  .assertion.pass{background:rgba(63,185,80,.06);border:1px solid rgba(63,185,80,.15);color:var(--text);}
  .assertion.fail{background:rgba(248,81,73,.08);border:1px solid rgba(248,81,73,.2);color:var(--text);}
  .assertion.muted{color:var(--muted);font-style:italic;}
  .a-err{font-size:.72rem;color:var(--red);margin-top:3px;font-family:'SF Mono',monospace;word-break:break-word;}

  /* Empty */
  #empty{max-width:960px;margin:32px auto;text-align:center;color:var(--muted);display:none;padding:48px 20px;}
  #empty .icon{font-size:2.5rem;margin-bottom:12px;}
  #empty p{font-size:.85rem;}

  /* Footer */
  footer{text-align:center;margin-top:48px;font-size:.75rem;color:var(--muted);}
</style>
</head>
<body>

<header>
  <div class="logo">🔥 <span>Hephaestus</span> Test Report</div>
  <div class="meta-row">
    <span>📋 ${esc(colName)}</span>
    <span>🌍 ${esc(envName)}</span>
    <span>📅 ${esc(startedAt)}</span>
    <span>⏱ ${esc(fmtDuration(durationMs))}</span>
  </div>
</header>

<div class="summary">
  <div class="gauge-card">${donut(passRate)}</div>
  <div class="stat"><div class="v" style="color:var(--accent)">${totalReq}</div><div class="l">Requests</div></div>
  <div class="stat"><div class="v" style="color:${failedReq===0?'var(--green)':'var(--red)'}">${failedReq}</div><div class="l">Failed</div></div>
  <div class="stat"><div class="v" style="color:var(--accent)">${totalAssert}</div><div class="l">Assertions</div></div>
  <div class="stat"><div class="v" style="color:${failedAssert===0?'var(--green)':'var(--red)'}">${failedAssert}</div><div class="l">Assert fails</div></div>
  <div class="stat"><div class="v" style="color:${timeColor(avgTime)}">${avgTime}ms</div><div class="l">Avg time</div></div>
</div>

<div class="filter-row">
  <input id="search" type="text" placeholder="Search by request name..." oninput="doFilter()">
  <button class="fb active" data-f="all" onclick="setFilter(this)">All</button>
  <button class="fb" data-f="fail" onclick="setFilter(this)">Failed only</button>
  <button class="fb" data-f="pass" onclick="setFilter(this)">Passed only</button>
  <span style="font-size:.75rem;color:var(--muted);margin-left:auto" id="count-label">${totalReq} requests</span>
</div>

<div class="cards" id="cards">
${cardHtml}
</div>

<div id="empty">
  <div class="icon">📭</div>
  <p>No requests match your filter.</p>
</div>

<footer>
  Generated by <strong>Hephaestus v3.4.0</strong> &nbsp;·&nbsp;
  <a href="https://github.com/bogdanov-igor/hephaestus-postman-framework">github.com/bogdanov-igor/hephaestus-postman-framework</a>
  &nbsp;·&nbsp; ${esc(startedAt)}
</footer>

<script>
var filter = 'all';

function toggle(i) {
  var body  = document.getElementById('body-'+i);
  var chev  = document.getElementById('chev-'+i);
  var open  = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  chev.classList.toggle('open', !open);
}

function setFilter(btn) {
  document.querySelectorAll('.fb').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  filter = btn.dataset.f;
  doFilter();
}

function doFilter() {
  var q = (document.getElementById('search').value || '').toLowerCase();
  var cards = document.querySelectorAll('.req-card');
  var visible = 0;
  cards.forEach(function(c) {
    var name = c.querySelector('.req-name');
    var text = name ? name.textContent.toLowerCase() : '';
    var isOk = c.classList.contains('ok');
    var matchF = filter === 'all' || (filter === 'fail' && !isOk) || (filter === 'pass' && isOk);
    var matchQ = !q || text.indexOf(q) !== -1;
    var show = matchF && matchQ;
    c.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  document.getElementById('count-label').textContent = visible + ' requests';
  document.getElementById('empty').style.display = visible === 0 ? 'block' : 'none';
}

// Auto-expand failed requests on load
document.querySelectorAll('.req-card.nok').forEach(function(c){
  var id = c.id.replace('req-','');
  toggle(parseInt(id));
});
</script>
</body>
</html>`;

// ─── Write ────────────────────────────────────────────────────────────────────

fs.writeFileSync(outFile, html, 'utf8');

const passColor = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️ ' : '❌';
console.log(passColor + ' HTML report written → ' + path.resolve(outFile));
console.log('   Requests: ' + totalReq + '  |  Assertions: ' + totalAssert + '  |  Failed: ' + failedAssert + '  |  Pass rate: ' + passRate + '%  |  Duration: ' + fmtDuration(durationMs));
