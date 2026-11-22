// Replay: roofs. Time share, damage rate on roofs vs ground, who shot at roof mechs and from where, deaths on roofs,
// whether attackers climbed after a roof target, jet-hop statistics (how high and how long house bots are airborne). DEV ONLY.
import { loadWorld, loadNav, loadReplay, pct, mean, fmt, MX, MY, MZ, MFL, MHP, MEN } from './common.js'
const w = loadWorld(), nav = loadNav(w), R = loadReplay()
const fi = (tick) => { let lo = 0, hi = R.nf - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.ticks[mid] <= tick) lo = mid; else hi = mid - 1 } return lo }
const hAbove = (r) => r[MZ] - w.ground(r[MX], r[MY])
const onRoof = (r) => r && (r[MFL] & 1) && hAbove(r) > 3
let tRoof = 0, tGround = 0, tAir = 0
for (const id of R.ids) for (let k = 0; k < R.nf; k++) { const r = R.m[id][k]; if (!r) continue; if (!(r[MFL] & 1)) tAir++; else if (hAbove(r) > 3) tRoof++; else tGround++ }
let dRoof = 0, dGround = 0, dAir = 0; const roofHits = []
for (const e of R.events) {
  if (e.e !== 'hit' || e.dst >= 100 || e.src >= 100) continue
  const k = fi(e.t); const v = R.m[e.dst][k] || R.m[e.dst][k - 1]; if (!v) continue
  if (!(v[MFL] & 1)) dAir += e.amt; else if (hAbove(v) > 3) { dRoof += e.amt; roofHits.push({ ...e, k }) } else dGround += e.amt
}
console.log(`mech-seconds: ground ${fmt(tGround / 10, 0)}, roof ${fmt(tRoof / 10, 1)} (${fmt(100 * tRoof / (tRoof + tGround + tAir), 1)}%), airborne ${fmt(tAir / 10, 0)} (${fmt(100 * tAir / (tRoof + tGround + tAir), 1)}%)`)
console.log(`damage from mechs per second while there: ground ${fmt(10 * dGround / tGround, 1)} HP/s, roof ${fmt(10 * dRoof / Math.max(1, tRoof), 1)} HP/s (${fmt(dRoof, 0)} HP in ${roofHits.length} hits), airborne ${fmt(10 * dAir / tAir, 1)} HP/s`)
const by = {}
for (const h of roofHits) { const a = R.m[h.src][h.k]; const key = `${h.src}->${h.dst} ${h.w}`; by[key] = by[key] || { n: 0, amt: 0, d: [], srcRoof: 0, srcAir: 0 }; const b = by[key]; b.n++; b.amt += h.amt; const v = R.m[h.dst][h.k]; if (a && v) { b.d.push(Math.hypot(a[MX] - v[MX], a[MY] - v[MY])); if (onRoof(a)) b.srcRoof++; if (!(a[MFL] & 1)) b.srcAir++ } }
for (const [k, b] of Object.entries(by)) console.log(`  hits on a roof mech ${k}: ${b.n} hits ${fmt(b.amt, 0)} HP, median range ${fmt(pct(b.d, .5), 0)} m, attacker on a roof in ${b.srcRoof}, airborne in ${b.srcAir}`)
let roofDeaths = 0, airDeaths = 0, nDeaths = 0
for (const e of R.events) { if (e.e !== 'death' || e.id >= 100) continue; nDeaths++; const k = fi(e.t); let r = null; for (let q = k; q >= Math.max(0, k - 5) && !r; q--) r = R.m[e.id][q]; if (r && onRoof(r)) roofDeaths++; else if (r && !(r[MFL] & 1) && hAbove(r) > 3) airDeaths++ }
console.log(`deaths: ${nDeaths}; on a roof ${roofDeaths}; in the air more than 3 m up ${airDeaths}`)
// jet hops: airborne segments with boost flag
const segs = []
for (const id of R.ids) { let st = -1, apex = 0, z0 = 0, jet = 0, e0 = 0
  for (let k = 0; k < R.nf; k++) { const r = R.m[id][k]; const air = r && !(r[MFL] & 1)
    if (air && st < 0) { st = k; const p = R.m[id][k - 1] || r; z0 = p[MZ]; apex = 0; jet = 0; e0 = p[MEN] }
    if (air) { apex = Math.max(apex, r[MZ] - z0); if (r[MFL] & 2) jet++ }
    if (!air && st >= 0) { if (jet >= 3) segs.push({ dur: (k - st) / 10, apex, jet: jet / 10, dE: e0 - (r ? r[MEN] : 0), land: r ? r[MZ] - z0 : 0 }); st = -1 } } }
console.log(`jet hops (>= 0.3 s of jet): ${segs.length}; airborne time p50 ${fmt(pct(segs.map(s => s.dur), .5))} s p90 ${fmt(pct(segs.map(s => s.dur), .9))} s; apex above take-off p50 ${fmt(pct(segs.map(s => s.apex), .5))} m p90 ${fmt(pct(segs.map(s => s.apex), .9))} m max ${fmt(Math.max(...segs.map(s => s.apex)))} m; landed more than 3 m higher (climbed onto something) ${segs.filter(s => s.land > 3).length}, more than 3 m lower ${segs.filter(s => s.land < -3).length}`)
// do attackers follow a roof target up?  For each attacker that hit a roof mech: was it ever grounded on a roof within 10 s afterwards within 40 m of the victim?
let followed = 0, cases = 0
const seen = new Set()
for (const h of roofHits) { const key = h.src * 16 + h.dst; if (seen.has(key)) continue; seen.add(key); cases++; let f = false; for (let q = h.k; q < Math.min(R.nf, h.k + 100); q++) { const a = R.m[h.src][q], v = R.m[h.dst][q]; if (a && v && onRoof(a) && Math.hypot(a[MX] - v[MX], a[MY] - v[MY]) < 40) f = true } if (f) followed++ }
console.log(`attacker-victim pairs with hits on a roof mech: ${cases}; attacker stood on a roof within 40 m of the victim in the next 10 s: ${followed}`)
