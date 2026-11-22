import { readFileSync } from 'node:fs'
const all = [...JSON.parse(readFileSync('p16.json')), ...JSON.parse(readFileSync('p28.json'))]
let arr = 0, flick = 0, isoN = 0, isoSp = 0, soN = 0, soSp = 0, gj = 0, gn = 0
for (const r of all) { let p = null; for (const f of r.frames) {
  if (p && p.lk === 'isolate' && f.lk === 'standoff') { const d = Math.hypot(p.gX - f.x, p.gY - f.y); if (d <= 3.6) arr++; else flick++ }
  if (p && p.lk === 'isolate' && f.lk === 'isolate') { gn++; if (Math.hypot(p.gX - f.gX, p.gY - f.gY) > 6) gj++ }
  if (p && (f.lk === 'isolate' || f.lk === 'standoff')) { const sp = Math.hypot(f.x - p.x, f.y - p.y) / 0.1; if (f.lk === 'isolate') { isoN++; isoSp += sp } else { soN++; soSp += sp } }
  p = f } }
console.log('isolate->standoff: arrived (<=3.6 m of the cell)', arr, 'condition flicker / cell changed', flick, '| isolate goal jumps > 6 m between consecutive isolate decisions', gj, 'of', gn, '| mean ground speed m/s isolate', (isoSp / isoN).toFixed(1), 'standoff', (soSp / soN).toFixed(1))
