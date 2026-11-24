// Copyright 2026 Adobe. All rights reserved.
// Live beads roadmap. Usage: node tools/roadmap/roadmap.mjs [--port 4747]
// Re-runs `bd list` on every request, so the page always shows current beads.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 4747;

const PAGE = `<!doctype html><meta charset=utf-8><title>Beads roadmap</title>
<style>
body{font:13px system-ui;margin:0;background:#fafafa;color:#222}
header{padding:8px 12px;position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;z-index:2}
.row{display:flex;align-items:center;height:22px;border-bottom:1px solid #eee;white-space:nowrap}
.row:hover{background:#eef}
.name{flex:none;width:440px;overflow:hidden;text-overflow:ellipsis;cursor:default}
.epic .name{font-weight:600;cursor:pointer}
.track{position:relative;flex:none;height:100%}
.bar{position:absolute;top:4px;height:14px;border-radius:3px;background:#9bb;overflow:hidden}
.bar i{display:block;height:100%;background:#2d9d78}
.leaf{background:#bbb}.leaf.in_progress{background:#e8a317}.leaf.blocked{background:#d9534f}.leaf.deferred{background:#ddd}
.grid{position:absolute;top:0;bottom:0;border-left:1px dotted #ddd}
small{color:#888;margin-left:6px}
</style>
<header><b>Beads roadmap</b>
<small>x = dependency order (column n starts after its blockers finish), not calendar time. Green = closed share. <span id=ts></span></small>
<label style=margin-left:12px><input type=checkbox id=leaves> show issues</label></header>
<div id=app></div>
<script>
const W = 28, open = new Set(JSON.parse(sessionStorage.open || '[]'));
let data;
function build(issues) {
  const by = new Map(issues.map(i => [i.id, i]));
  const kids = new Map(), blockers = new Map();
  for (const i of issues) {
    kids.set(i.id, kids.get(i.id) || []);
    for (const d of i.dependencies || []) {
      if (d.type === 'parent-child' && by.has(d.depends_on_id)) {
        (kids.get(d.depends_on_id) || kids.set(d.depends_on_id, []).get(d.depends_on_id)).push(i.id);
        i.parent = d.depends_on_id;
      } else if (d.type === 'blocks' && by.has(d.depends_on_id)) {
        (blockers.get(i.id) || blockers.set(i.id, []).get(i.id)).push(d.depends_on_id);
      }
    }
  }
  const live = i => i.status !== 'closed';
  const memo = new Map(), busy = new Set();
  // [start, end] layer range of an issue (leaf: one layer; epic: its open leaves)
  function range(id) {
    if (memo.has(id)) return memo.get(id);
    if (busy.has(id)) return null;
    busy.add(id);
    const i = by.get(id), k = kids.get(id);
    let lo = 0;
    const deps = [];
    for (let p = id; p; p = by.get(p).parent) deps.push(...(blockers.get(p) || []));
    for (const b of deps) { const r = by.get(b) && live(by.get(b)) && range(b); if (r) lo = Math.max(lo, r[1] + 1); }
    let res;
    const sub = k.filter(c => live(by.get(c))).map(range).filter(Boolean);
    if (i.issue_type === 'epic' && k.length) {
      res = sub.length ? [Math.max(lo, Math.min(...sub.map(r => r[0]))), Math.max(lo, ...sub.map(r => r[1]))] : null;
    } else res = [lo, lo];
    busy.delete(id); memo.set(id, res);
    return res;
  }
  return { by, kids, range, live };
}
function render() {
  const { by, kids, range, live } = build(data);
  const showLeaves = document.getElementById('leaves').checked;
  const rows = [];
  let max = 0;
  const count = id => { let t = 0, d = 0; const walk = x => { const k = kids.get(x); if (!k.length) { t++; d += by.get(x).status === 'closed'; } else k.forEach(walk); }; walk(id); return [t, d]; };
  function visit(id, depth) {
    const i = by.get(id), isEpic = i.issue_type === 'epic' && kids.get(id).length;
    if (!isEpic && !showLeaves) return;
    const r = live(i) && range(id);
    if (!r && depth) return;
    if (r) max = Math.max(max, r[1]);
    rows.push({ i, r, depth, isEpic });
    if (isEpic && (open.has(id) || showLeaves)) kids.get(id).slice().sort((a, b) => (range(a) || [9e9])[0] - (range(b) || [9e9])[0]).forEach(c => visit(c, depth + 1));
  }
  data.filter(i => !i.parent && i.issue_type === 'epic' && live(i)).sort((a, b) => (range(a.id) || [9e9])[0] - (range(b.id) || [9e9])[0]).forEach(i => visit(i.id, 0));
  const tw = (max + 1) * W + 20;
  const dueOf = i => i.due_at || ((i.labels || []).find(l => /^target:\\d{4}-\\d{2}/.test(l)) || '').slice(7) || null;
  const dated = data.filter(i => i.issue_type === 'epic' && live(i) && dueOf(i)).map(i => ({ i, to: new Date(dueOf(i)).getTime(), from: new Date(i.started_at || i.created_at).getTime() })).filter(x => x.to).sort((a, b) => a.to - b.to);
  let sched = '';
  if (dated.length) {
    const t0 = Math.min(...dated.map(x => Math.min(x.from, x.to))), DAY = 864e5, PX = 4;
    const w = Math.ceil((Math.max(...dated.map(x => x.to)) - t0) / DAY) * PX + 20;
    sched = '<div style="padding:6px 12px"><b>Scheduled</b><small>bars run from start to due date (bd --due or target:YYYY-MM label)</small></div>' + dated.map(({ i, to, from }) => {
      const l = (Math.min(from, to) - t0) / DAY * PX, bw = Math.max(6, (to - Math.min(from, to)) / DAY * PX);
      const [t, d] = count(i.id), late = to < Date.now();
      return \`<div class=row><div class=name>\${i.title.replace(/</g, '&lt;')}<small>\${d}/\${t} due \${new Date(to).toISOString().slice(0, 10)}</small></div><div class=track style="width:\${w}px"><div class=bar style="left:\${l}px;width:\${bw}px;background:\${late ? '#d9534f' : '#9bb'}"><i style="width:\${100 * d / t}%"></i></div></div></div>\`;
    }).join('') + '<div style="padding:6px 12px"><b>Dependency order</b></div>';
  }
  document.getElementById('app').innerHTML = sched + rows.map(({ i, r, depth, isEpic }) => {
    const [t, d] = isEpic ? count(i.id) : [1, 0];
    const bar = r ? \`<div class="bar \${isEpic ? '' : 'leaf ' + i.status}" style="left:\${r[0] * W + 4}px;width:\${(r[1] - r[0] + 1) * W - 8}px" title="\${i.id} [\${i.status}] \${r[0] + 1}-\${r[1] + 1}">\${isEpic ? \`<i style="width:\${100 * d / t}%"></i>\` : ''}</div>\` : '';
    const grid = Array.from({ length: max + 2 }, (_, n) => \`<div class=grid style="left:\${n * W}px"></div>\`).join('');
    return \`<div class="row \${isEpic ? 'epic' : ''}"><div class=name style="padding-left:\${6 + depth * 16}px" data-id="\${i.id}" title="\${i.id}">\${isEpic ? (open.has(i.id) ? '▾ ' : '▸ ') : ''}\${i.title.replace(/</g, '&lt;')}\${isEpic ? \`<small>\${d}/\${t}</small>\` : ''}</div><div class=track style="width:\${tw}px">\${grid}\${bar}</div></div>\`;
  }).join('');
  document.getElementById('ts').textContent = 'updated ' + new Date().toLocaleTimeString();
}
async function load() { data = await (await fetch('/data')).json(); render(); }
document.addEventListener('click', e => {
  const n = e.target.closest('.epic .name'); if (!n) return;
  const id = n.dataset.id; open.has(id) ? open.delete(id) : open.add(id);
  sessionStorage.open = JSON.stringify([...open]); render();
});
document.getElementById('leaves').onchange = render;
load(); setInterval(load, 30000);
</script>`;

createServer(async (req, res) => {
  if (req.url === '/data') {
    try {
      const { stdout } = await run('bd', ['list', '--all', '--limit=0', '--json'], { maxBuffer: 1 << 28 });
      res.writeHead(200, { 'content-type': 'application/json' }).end(stdout);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  } else res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
}).listen(port, '127.0.0.1', () => console.log(`Roadmap: http://127.0.0.1:${port}`));
