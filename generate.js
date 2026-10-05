#!/usr/bin/env node
/* Generate README.md + index.html (GitHub Pages) from roles.json.
   Single source of truth = roles.json. Run: node generate.js */
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'roles.json'), 'utf8'));
const { meta, roles, ladders } = data;

// ---- Validation (enforces CONTRIBUTING.md rules) ----
(() => {
  const errs = [];
  const ids = new Set();
  const platforms = Object.keys(meta.platforms);
  const streams = Object.keys(meta.streams);
  const tiers = meta.tiers;
  for (const r of roles) {
    if (!r.id || !/^[a-z0-9-]+$/.test(r.id)) errs.push(`bad id: ${r.id}`);
    if (ids.has(r.id)) errs.push(`duplicate id: ${r.id}`);
    ids.add(r.id);
    for (const p of (r.platforms || [])) if (!platforms.includes(p)) errs.push(`${r.id}: unknown platform ${p}`);
    if (!(r.platforms || []).length) errs.push(`${r.id}: at least one platform required`);
    if (!streams.includes(r.stream)) errs.push(`${r.id}: unknown stream ${r.stream}`);
    if (!tiers.includes(r.tier)) errs.push(`${r.id}: unknown tier ${r.tier}`);
    if (!(r.compMin <= r.compMax)) errs.push(`${r.id}: compMin > compMax`);
    if (!r.summary || !r.summary.trim()) errs.push(`${r.id}: missing summary (JD skeleton)`);
    if ((r.aliases || []).includes(r.positionTitle)) errs.push(`${r.id}: aliases must not repeat the positionTitle`);
  }
  for (const [name, list] of Object.entries(ladders || {}))
    for (const id of list) if (!ids.has(id)) errs.push(`ladder "${name}" references unknown id ${id}`);
  // Keep the prose role-count in meta.description honest against the actual data.
  const descCount = (meta.description.match(/\b(\d+) canonical roles\b/) || [])[1];
  if (descCount && Number(descCount) !== roles.length)
    errs.push(`meta.description says "${descCount} canonical roles" but there are ${roles.length}`);
  if (errs.length) {
    console.error('roles.json validation failed:\n - ' + errs.join('\n - '));
    process.exit(1);
  }
})();

const tierLabel = { ENTRY: 'Entry / Junior', MID: 'Mid (IC)', SENIOR: 'Senior (IC)', LEAD: 'Lead / Principal', MANAGER: 'Manager / Head' };
const byId = Object.fromEntries(roles.map(r => [r.id, r]));
const money = n => 'RM' + n.toLocaleString('en-MY');
const platNames = r => (r.platforms || []).map(p => meta.platforms[p]).join(', ');

// ---- README.md ----
let md = `# ${meta.title}\n\n`;
md += `[![build](https://github.com/vijayndran/erp-roles/actions/workflows/build.yml/badge.svg)](https://github.com/vijayndran/erp-roles/actions/workflows/build.yml)\n\n`;
md += `${meta.description}\n\n`;
md += `> Platform-aware taxonomy of ERP roles across **${Object.keys(meta.platforms).length} platforms** (${Object.values(meta.platforms).join(', ')}). `;
md += `De-duplicates messy ERP job titles into **${roles.length} canonical roles** across functional / technical / Basis-admin / data / leadership streams, each with a one-line JD skeleton, required/preferred skills, an indicative comp band and the raw aliases that map to it — shipped as machine-readable \`roles.json\` plus a searchable [web page](https://vijayndran.github.io/erp-roles/).\n\n`;

if (meta.promo) {
  md += `---\n\n`;
  md += `### ${meta.promo.heading}\n\n`;
  md += `${meta.promo.body}\n\n`;
  if (Array.isArray(meta.promo.bullets)) md += meta.promo.bullets.map(b => `- ${b}`).join('\n') + '\n\n';
  if (meta.promo.ctaUrl) md += `**[${meta.promo.ctaText || meta.promo.ctaUrl}](${meta.promo.ctaUrl})**\n\n`;
  if (meta.promo.teaser) md += `> 🚀 **${meta.promo.teaser}**\n\n`;
  md += `---\n\n`;
}

md += `## What's different from a plain list\n\n`;
md += `| A plain ERP job-title list | This report |\n|---|---|\n`;
md += `| Flat titles, platform-ambiguous | ${roles.length} canonical roles tagged by platform + stream + seniority |\n`;
md += `| "SAP Consultant" means ten different jobs | Functional / Technical / Basis / Data / Leadership streams kept distinct |\n`;
md += `| Title only | + required/preferred skills, JD skeleton, comp band |\n`;
md += `| No structure | Career ladders + cross-platform alias lookup |\n`;
md += `| Markdown only | \`roles.json\` (machine-readable) + interactive HTML |\n\n`;

// Per-platform matrix (stream x tier)
md += `## Role matrices by platform\n\n`;
const streams = Object.entries(meta.streams);
const tiers = meta.tiers;
for (const [pkey, plabel] of Object.entries(meta.platforms)) {
  const inPlat = roles.filter(r => (r.platforms || []).includes(pkey));
  if (!inPlat.length) continue;
  md += `### ${plabel}\n\n`;
  md += `| Stream ↓ / Seniority → | ${tiers.map(t => tierLabel[t]).join(' | ')} |\n`;
  md += `|---|${tiers.map(() => '---').join('|')}|\n`;
  for (const [skey, slabel] of streams) {
    const row = tiers.map(t => {
      const hits = inPlat.filter(r => r.stream === skey && r.tier === t).map(r => r.positionTitle);
      return hits.length ? hits.join('<br>') : '—';
    });
    if (row.every(c => c === '—')) continue;
    md += `| **${slabel}** | ${row.join(' | ')} |\n`;
  }
  md += `\n`;
}

// Ladders
md += `## Career ladders\n\n`;
for (const [name, ids] of Object.entries(ladders)) {
  md += `- **${name}:** ${ids.map(id => byId[id] ? byId[id].positionTitle : id).join(' → ')}\n`;
}
md += `\n`;

// Role detail
md += `## Canonical roles\n\n`;
for (const r of roles) {
  md += `### ${r.positionTitle}\n\n`;
  md += `\`${r.id}\` · ${meta.streams[r.stream]} · ${tierLabel[r.tier]} · ${platNames(r)} · **${money(r.compMin)}–${money(r.compMax)}**/mo (indicative)\n\n`;
  md += `${r.summary}\n\n`;
  md += `- **Required:** ${r.requiredSkills.join(', ')}\n`;
  md += `- **Preferred:** ${r.preferredSkills.join(', ')}\n`;
  md += `- **Also seen as:** ${r.aliases.join(', ')}\n\n`;
}

// Reverse alias index
md += `## Reverse alias lookup\n\nEvery raw title → the canonical role it maps to.\n\n`;
md += `| Raw title | Canonical role |\n|---|---|\n`;
const aliasRows = [];
for (const r of roles) for (const a of r.aliases) aliasRows.push([a, r.positionTitle]);
aliasRows.sort((x, y) => x[0].localeCompare(y[0]));
for (const [a, t] of aliasRows) md += `| ${a} | ${t} |\n`;
md += `\n---\n\n`;
md += `*${meta.compNote} ${meta.compCurrency}.*\n\n`;
md += `*Generated from \`roles.json\` by \`generate.js\`. Contributions: edit \`roles.json\` and re-run \`node generate.js\`.*\n`;
md += `\n*See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow (the generator validates \`roles.json\` on every run).*\n`;

fs.writeFileSync(path.join(__dirname, 'README.md'), md);

// ---- index.html (interactive) ----
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--fg:#e5e7eb;--muted:#94a3b8;--border:#334155;--accent:#38bdf8;}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:24px}
h1{font-size:24px;margin:0 0 4px}.sub{color:var(--muted);margin-bottom:20px}
a{color:var(--accent)}
.controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5}
input,select{background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:14px}
input{flex:1;min-width:200px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.role{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px}
.role h3{margin:0 0 6px;font-size:16px}
.badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.badge{font-size:11px;padding:2px 8px;border-radius:999px;background:#0b1220;border:1px solid var(--border);color:var(--muted)}
.badge.plat{color:var(--accent);border-color:var(--accent)}
.comp{color:var(--accent);font-weight:600}
.summary{font-size:13px;color:var(--fg);margin:8px 0}
.sk{font-size:13px;margin:4px 0}.sk b{color:var(--muted);font-weight:600}
.alias{font-size:12px;color:var(--muted);margin-top:6px}
.count{color:var(--muted);font-size:13px;margin-bottom:10px}
.promo{background:linear-gradient(135deg,#0b1220,#15213b);border:1px solid var(--accent);border-radius:12px;padding:16px 18px;margin:4px 0 20px}
.promo h2{margin:0 0 6px;font-size:16px;color:var(--fg)}
.promo p{margin:0 0 10px;font-size:13px;color:var(--muted)}
.promo .cta{display:inline-block;background:var(--accent);color:#061018;font-weight:700;text-decoration:none;padding:7px 14px;border-radius:8px;font-size:13px}
.promo .teaser{display:inline-block;margin-left:10px;font-size:12px;color:var(--accent);font-weight:600}
footer{color:var(--muted);font-size:12px;margin-top:28px;border-top:1px solid var(--border);padding-top:14px}
</style></head><body><div class="wrap">
<h1>${meta.title}</h1>
<div class="sub">${roles.length} canonical roles · ${Object.keys(meta.platforms).length} platforms · normalised from <a href="${meta.source || '#'}">${roles.reduce((n,r)=>n+r.aliases.length,0)}+ raw titles</a> · comp in ${meta.compCurrency}/mo (indicative)</div>
${meta.promo ? `<div class="promo">
<h2>${meta.promo.heading}</h2>
<p>${meta.promo.body}</p>
<a class="cta" href="${meta.promo.ctaUrl}" target="_blank" rel="noopener">${meta.promo.ctaText || meta.promo.ctaUrl}</a>${meta.promo.teaser ? `<span class="teaser">🚀 ${meta.promo.teaser}</span>` : ''}
</div>` : ''}
<div class="controls">
<input id="q" placeholder="Search title, skill, platform or alias…" oninput="render()">
<select id="plat" onchange="render()"><option value="">All platforms</option>${Object.entries(meta.platforms).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
<select id="stream" onchange="render()"><option value="">All streams</option>${streams.map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
<select id="tier" onchange="render()"><option value="">All tiers</option>${tiers.map(t=>`<option value="${t}">${tierLabel[t]}</option>`).join('')}</select>
</div>
<div class="count" id="count"></div>
<div class="grid" id="grid"></div>
<footer>Platform-aware ERP role taxonomy. Enriched + <a href="roles.json">roles.json</a>. ${meta.compNote}</footer>
</div>
<script>
const ROLES=${JSON.stringify(roles)};
const PLATS=${JSON.stringify(meta.platforms)};
const STREAMS=${JSON.stringify(meta.streams)};
const TIERL=${JSON.stringify(tierLabel)};
function money(n){return 'RM'+n.toLocaleString('en-MY')}
function render(){
  const q=document.getElementById('q').value.toLowerCase();
  const pl=document.getElementById('plat').value, st=document.getElementById('stream').value, ti=document.getElementById('tier').value;
  const out=ROLES.filter(r=>{
    if(pl&&!r.platforms.includes(pl))return false;
    if(st&&r.stream!==st)return false;
    if(ti&&r.tier!==ti)return false;
    if(!q)return true;
    const platText=r.platforms.map(p=>PLATS[p]).join(' ');
    const hay=(r.positionTitle+' '+platText+' '+r.requiredSkills.join(' ')+' '+r.preferredSkills.join(' ')+' '+r.aliases.join(' ')).toLowerCase();
    return hay.includes(q);
  });
  document.getElementById('count').textContent=out.length+' role'+(out.length===1?'':'s');
  document.getElementById('grid').innerHTML=out.map(r=>\`
    <div class="role">
      <h3>\${r.positionTitle}</h3>
      <div class="badges">\${r.platforms.map(p=>\`<span class="badge plat">\${PLATS[p]}</span>\`).join('')}<span class="badge">\${STREAMS[r.stream]}</span><span class="badge">\${TIERL[r.tier]}</span></div>
      <div class="comp">\${money(r.compMin)}–\${money(r.compMax)}/mo</div>
      <p class="summary">\${r.summary}</p>
      <div class="sk"><b>Required:</b> \${r.requiredSkills.join(', ')}</div>
      <div class="sk"><b>Preferred:</b> \${r.preferredSkills.join(', ')}</div>
      <div class="alias">Also seen as: \${r.aliases.join(', ')}</div>
    </div>\`).join('');
}
render();
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('Generated README.md + index.html from roles.json (' + roles.length + ' roles)');
