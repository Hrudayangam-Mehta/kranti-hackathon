// Replay validation of the belief module: every mech of the official house-bot FFA replay is used as an observer that
// only gets what the protocol would give it (vision rule + 5 s memory, sounds with 7 deg bearing noise and 3 distance
// classes, death count). We run the proposed layers (one per mech seen before, anonymous "ghost" layers born from
// unexplained sounds, one pooled layer for mechs never seen or heard) and score them against the true positions.
// Usage: bun belief_replay.js [lam=0.3] [sounds=1] [neg=1]
import { loadWorld, loadNav, loadReplay, sees, pct, mean, fmt, angDiff, MX, MY, MZ, MYAW, MFL, MCU } from './common.js'
import { BeliefGrid } from './belief_core.js'
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(k + '=')); return a ? Number(a.split('=')[1]) : d }
const LAM = arg('lam', 0.3), USE_SOUND = arg('sounds', 1), USE_NEG = arg('neg', 1), NSUB = 2, STEP = 5, PD = 0.9, QUIET = arg('quiet', 0)
const w = loadWorld(), nav = loadNav(w), R = loadReplay()
const tB = performance.now(); const G = new BeliefGrid(w, nav); const tBuild = performance.now() - tB
const ids = R.ids, nf = R.nf
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())
const SIG = 7 * Math.PI / 180
// ---- visibility
const vis = {}
for (const o of ids) for (const t of ids) { if (o === t) continue; const v = new Uint8Array(nf); for (let k = 0; k < nf; k++) if (R.m[o][k] && R.m[t][k] && sees(w, R.m[o][k], R.m[t][k])) v[k] = 1; vis[o * 16 + t] = v }
// ---- sounds per frame (true source positions)
const RANGE = { gun: 320, mortar: 420, explosion: 420, laser: 380, laser_charge: 140, lightning: 160, jet: 90, death: 600, step: 40, boost: 90 }
const snd = Array.from({ length: nf }, () => [])
const fi = (tick) => { let lo = 0, hi = nf - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (R.ticks[mid] <= tick) lo = mid; else hi = mid - 1 } return lo }
const deaths = []
for (const e of R.events) {
  const k = fi(e.t)
  const src = (id) => { const r = R.m[id]?.[k] || R.m[id]?.[Math.max(0, k - 1)]; return r ? [r[MX], r[MY]] : null }
  if (e.e === 'fire' && e.id < 100) { const p = src(e.id); if (p) snd[k].push({ kind: e.w, x: p[0], y: p[1], src: e.id }) }
  else if (e.e === 'laser' && e.id < 100) snd[k].push({ kind: 'laser', x: e.from[0], y: e.from[1], src: e.id })
  else if (e.e === 'charge' && e.id < 100) { const p = src(e.id); if (p) snd[k].push({ kind: 'laser_charge', x: p[0], y: p[1], src: e.id }) }
  else if (e.e === 'zap' && e.id < 100) snd[k].push({ kind: 'lightning', x: e.path[0][0], y: e.path[0][1], src: e.id })
  else if (e.e === 'boom') snd[k].push({ kind: 'explosion', x: e.at[0], y: e.at[1], src: -1 })
  else if (e.e === 'death' && e.id < 100) { const p = src(e.id); if (p) { snd[k].push({ kind: 'death', x: p[0], y: p[1], src: e.id }); deaths.push({ id: e.id, k, x: p[0], y: p[1] }) } }
}
for (const id of ids) {            // movement sounds: one every 0.6 s while fast on the ground / boosting / jetting
  let acc = 0
  for (let k = 1; k < nf; k++) {
    const a = R.m[id][k - 1], b = R.m[id][k]; if (!a || !b) continue
    const sp = Math.hypot(b[MX] - a[MX], b[MY] - a[MY]) * 10
    const gr = b[MFL] & 1, bo = b[MFL] & 2
    const kind = !gr && bo ? 'jet' : gr && bo ? 'boost' : gr && sp > 5 ? 'step' : null
    if (!kind) { acc = 0; continue }
    acc += 0.1; if (acc >= 0.6) { acc = 0; snd[k].push({ kind, x: b[MX], y: b[MY], src: id }) }
  }
}
// ---- first hits (attacker had not hit this victim for 10 s)
const firstHits = []
{ const last = {}; for (const e of R.events) { if (e.e !== 'hit' || e.src >= 100 || e.dst >= 100 || e.src === e.dst || e.w === 'zone') continue; const key = e.src * 16 + e.dst; const prev = last[key] ?? -1e9; last[key] = e.t; if (e.t - prev >= 200) firstHits.push({ a: e.src, v: e.dst, k: fi(e.t) }) } }
// ---- metrics
const AGES = [2, 5, 10, 20, 40]
const cal = AGES.map(() => ({ n: 0, in50: 0, in90: 0, near: [], a90: [], wedge: 0, lastBear: 0, dMode: [], dLast: [], dMean: [] }))
const empt = []           // [predicted expected count within 80 m, actual]
const fh = []
let collapses = 0, layerSteps = 0, stepMs = 0, steps = 0, visCells = 0, ghostsBorn = 0, soundsHeard = 0, soundsAttr = 0, soundsToId = 0, soundsToGhost = 0, soundsNew = 0, soundsRightId = 0
const GD = arg('g', 0)
const gDanger = GD === 1 ? (d) => d <= 280 ? Math.exp(-d / 70) : 0 : (d) => d <= 80 ? 1 : d <= 230 ? 1 - 0.75 * (d - 80) / 150 : d <= 260 ? 0.25 : 0
const sCells = new Int32Array(G.cn), sLik = new Float32Array(G.cn)
function soundCells(ox, oy, bearing, sigma, dmin, dmax) {
  const cs = G.cs, cnx = G.cnx
  const i0 = Math.max(0, Math.floor((ox - dmax - cs - G.x0) / cs)), i1 = Math.min(cnx - 1, Math.floor((ox + dmax + cs - G.x0) / cs))
  const j0 = Math.max(0, Math.floor((oy - dmax - cs - G.y0) / cs)), j1 = Math.min(G.cny - 1, Math.floor((oy + dmax + cs - G.y0) / cs))
  let n = 0
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = j * cnx + i; if (!G.open[c]) continue; const l = G.soundLik(ox, oy, bearing, sigma, dmin, dmax, c); if (l > 0.01) { sCells[n] = c; sLik[n++] = l } }
  return n
}
const explained = (L, n) => { let e = 0; for (let q = 0; q < n; q++) e += L.m[sCells[q]] * sLik[q]; return e }
function applyS(L, n, floor = 0.05) { for (let q = 0; q < n; q++) L.m[sCells[q]] *= 1 + sLik[q] / floor; G.normalise(L) }
function hdr(L, ct) {       // credible level of the true cell and size of the 90% region
  const vals = []
  for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const v = L.m[j * G.cnx + i]; if (v > 0) vals.push(v) }
  vals.sort((a, b) => b - a)
  const vt = ct >= 0 ? L.m[ct] : 0
  let rank = 0, a90 = 0, acc = 0
  for (const v of vals) { if (v > vt) rank += v; if (acc < 0.9) { acc += v; a90++ } }
  return { rank, a90 }
}
function modeMean(L) { let bm = -1, bc = -1, sx = 0, sy = 0, s = 0; for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const c = j * G.cnx + i, v = L.m[c]; if (v > bm) { bm = v; bc = c } sx += v * G.repX[c]; sy += v * G.repY[c]; s += v } return { mode: bc, mx: sx / s, my: sy / s } }
const zone0 = R.hdr.zone[0]
for (const o of ids) {
  const st = {}
  for (const t of ids) if (t !== o) st[t] = { L: G.newLayer(), lastSeen: -1e9, ever: false, tracked: false, lostK: -1, lkx: 0, lky: 0, dead: false, known: false }
  const pool = G.newLayer(); let Kpool = ids.length - 1
  const sp = R.hdr.mechs.find(m => m.id === o).spawn
  G.seedMask(pool, (x, y) => Math.hypot(x - zone0.center[0], y - zone0.center[1]) <= 0.8 * zone0.radius && Math.hypot(x - sp[0], y - sp[1]) >= 130)
  const ghosts = []
  const recent = []        // recent heard sounds (for the naive baseline)
  for (let k = STEP; k < nf; k += STEP) {
    const me = R.m[o][k]; if (!me) break
    const ox = me[MX], oy = me[MY], eye = me[MZ] + 8 * (1 + 0.05 * me[MCU]), yaw = me[MYAW]
    const t0 = performance.now()
    // 1. sightings and track bookkeeping
    for (const t of ids) {
      if (t === o) continue
      const s = st[t]; if (s.dead) continue
      const v = vis[o * 16 + t]
      for (let q = k - STEP + 1; q <= k; q++) if (v[q]) s.lastSeen = q
      const tr = k - s.lastSeen <= 50
      if (tr && !s.ever) {            // first sighting: it came out of a ghost or out of the pool
        s.ever = true
        const b = R.m[t][s.lastSeen]; let gi = -1, gm = 0.2
        for (let g = 0; g < ghosts.length; g++) { let msum = 0; const c = G.cellOf(b[MX], b[MY]); const ci = c % G.cnx, cj = (c / G.cnx) | 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const a = ci + di, bb = cj + dj; if (a >= 0 && bb >= 0 && a < G.cnx && bb < G.cny) msum += ghosts[g].m[bb * G.cnx + a] } if (msum > gm) { gm = msum; gi = g } }
        if (gi >= 0) ghosts.splice(gi, 1); else Kpool = Math.max(0, Kpool - 1)
      }
      if (tr) { if (!s.tracked) G.clear(s.L); s.tracked = true }
      else if (s.tracked) {           // memory just ran out: the last true position the server told us
        s.tracked = false; const kk = Math.min(nf - 1, s.lastSeen + 50); const b = R.m[t][kk] || R.m[t][s.lastSeen]
        s.lostK = kk; s.lkx = b[MX]; s.lky = b[MY]; G.seedPoint(s.L, b[MX], b[MY]); s.L.alive = 1
      }
      if (!R.m[t][k]) {               // died: known only if we were tracking it
        s.dead = true
        if (s.tracked || !s.ever) { /* tracked: known kill. never seen: handled by the death sound below */ }
      }
    }
    // 2. motion
    const layers = []
    for (const t of ids) if (t !== o && st[t].ever && !st[t].tracked && !st[t].known) layers.push(st[t].L)
    for (const g of ghosts) layers.push(g)
    for (let s = 0; s < NSUB; s++) { for (const L of layers) G.diffuse(L, LAM); G.diffuse(pool, LAM) }
    // 3. negative evidence
    if (USE_NEG) {
      const n = G.computeVisible(ox, oy, eye, yaw, null, null, 0); visCells += n
      for (const L of layers) { const rem = G.cull(L, PD); if (rem > 0) { const tot = G.normalise(L); if (tot < 1e-4) collapses++ } }
      if (G.cull(pool, PD) > 0) G.normalise(pool)
    }
    // zone pruning: nobody stays outside for long
    { const z = R.frames[k].z; if (z) { for (const L of [...layers, pool]) { let ch = false; for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const c = j * G.cnx + i; if (L.m[c] && Math.hypot(G.repX[c] - z[0], G.repY[c] - z[1]) > z[2] + 8) { L.m[c] *= 0.7; ch = true } } if (ch) G.normalise(L) } } }
    // 4. sounds heard during the step
    if (USE_SOUND) {
      const heard = []
      for (let q = k - STEP + 1; q <= k; q++) for (const s of snd[q]) {
        if (s.src === o) continue
        const d = Math.hypot(s.x - ox, s.y - oy); if (d > RANGE[s.kind]) continue
        heard.push({ kind: s.kind, bearing: Math.atan2(s.y - oy, s.x - ox) + gauss() * SIG, cls: d < 60 ? 0 : d < 160 ? 1 : 2, src: s.src, n: 1 })
      }
      // merge same kind / class / within 12 deg (one source firing a burst): averaging shrinks the bearing error
      const cl = []
      for (const h of heard) { const m = cl.find(c => c.kind === h.kind && c.cls === h.cls && Math.abs(angDiff(c.bearing, h.bearing)) < 0.21); if (m) { m.bearing += angDiff(h.bearing, m.bearing) / (m.n + 1); m.n++ } else cl.push({ ...h }) }
      for (const h of cl) {
        soundsHeard++
        recent.push({ k, bearing: h.bearing }); if (recent.length > 40) recent.shift()
        const dmin = h.cls === 0 ? 0 : h.cls === 1 ? 60 : 160, dmax = h.cls === 0 ? 60 : h.cls === 1 ? 160 : RANGE[h.kind]
        const sigma = SIG / Math.sqrt(h.n)
        // (a) explained by a mech we are tracking?
        let attr = false
        for (const t of ids) { if (t === o) continue; const s = st[t]; if (!s.tracked || s.dead) continue; const b = R.m[t][k]; if (!b) continue; const d = Math.hypot(b[MX] - ox, b[MY] - oy); if (d >= dmin - 10 && d <= dmax + 10 && Math.abs(angDiff(Math.atan2(b[MY] - oy, b[MX] - ox), h.bearing)) <= 3 * SIG) { attr = true; break } }
        if (attr) { soundsAttr++; continue }
        if (h.kind === 'explosion') continue                   // not a mech position
        const n = soundCells(ox, oy, h.bearing, sigma, dmin, dmax)
        if (h.kind === 'death') {                              // an untracked mech died: soft removal
          let tot = 0; const sc = []
          for (const t of ids) { if (t === o) continue; const s = st[t]; if (s.ever && !s.tracked && !s.known && s.L.alive > 0) { const e = s.L.alive * explained(s.L, n); sc.push([s.L, e]); tot += e } }
          for (const g of ghosts) { const e = g.alive * explained(g, n); sc.push([g, e]); tot += e }
          const ep = Kpool * explained(pool, n); tot += ep
          if (tot > 0) { for (const [L, e] of sc) L.alive *= 1 - e / tot; Kpool = Math.max(0, Kpool - ep / tot) }
          continue
        }
        // (b) which untracked hypothesis explains it best?
        let best = null, bs = 0.02, bestT = -1
        for (const t of ids) { if (t === o) continue; const s = st[t]; if (s.ever && !s.tracked && !s.known && s.L.alive > 0.05) { const e = s.L.alive * explained(s.L, n); if (e > bs) { bs = e; best = s.L; bestT = t } } }
        for (const g of ghosts) { const e = g.alive * explained(g, n); if (e > bs) { bs = e; best = g; bestT = -2 } }
        const ep = Kpool * explained(pool, n)
        if (best && bs >= ep) { applyS(best, n); if (bestT >= 0) { soundsToId++; if (bestT === h.src) soundsRightId++ } else soundsToGhost++ }
        else if (Kpool >= 0.5 && n > 0) {                       // someone never seen or heard before: split a ghost off the pool
          const g = G.newLayer(); let s = 0
          for (let q = 0; q < n; q++) { const v = (pool.m[sCells[q]] + 1e-6) * sLik[q]; g.m[sCells[q]] = v; s += v }
          for (let q = 0; q < n; q++) g.m[sCells[q]] /= s
          g.i0 = 0; g.i1 = G.cnx - 1; g.j0 = 0; g.j1 = G.cny - 1; g.born = k
          // shrink the box
          let a0 = G.cnx, a1 = -1, b0 = G.cny, b1 = -1; for (let q = 0; q < n; q++) { const c = sCells[q], i = c % G.cnx, j = (c / G.cnx) | 0; if (i < a0) a0 = i; if (i > a1) a1 = i; if (j < b0) b0 = j; if (j > b1) b1 = j }
          g.i0 = a0; g.i1 = a1; g.j0 = b0; g.j1 = b1
          if (ghosts.length < 12) { ghosts.push(g); Kpool -= 1; ghostsBorn++ }
          soundsNew++
        }
      }
    }
    stepMs += performance.now() - t0; steps++; layerSteps += layers.length + 1
    // ---- scoring (uses the truth; not part of the module)
    for (const t of ids) {
      if (t === o) continue
      const s = st[t]; if (!s.ever || s.tracked || s.dead) continue
      const b = R.m[t][k]; if (!b) continue
      const age = (k - s.lostK) / 10
      for (let a = 0; a < AGES.length; a++) {
        if (age >= AGES[a] && age < AGES[a] + STEP / 10) {
          const ct = G.cellOf(b[MX], b[MY]); const { rank, a90 } = hdr(s.L, ct)
          const C = cal[a]; C.n++; if (rank < 0.5) C.in50++; if (rank < 0.9) C.in90++
          let near = 0; const ci = ct % G.cnx, cj = (ct / G.cnx) | 0
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = ci + di, y = cj + dj; if (x >= 0 && y >= 0 && x < G.cnx && y < G.cny) near += s.L.m[y * G.cnx + x] }
          C.near.push(near); C.a90.push(a90 * G.cs * G.cs / 1e4)
          const tb = Math.atan2(b[MY] - oy, b[MX] - ox)
          const wd = G.bestWedge([s.L], [1], ox, oy, () => 1)
          if (Math.abs(angDiff(wd.yaw, tb)) <= Math.PI / 3) C.wedge++
          if (Math.abs(angDiff(Math.atan2(s.lky - oy, s.lkx - ox), tb)) <= Math.PI / 3) C.lastBear++
          const mm = modeMean(s.L)
          C.dMode.push(Math.hypot(G.repX[mm.mode] - b[MX], G.repY[mm.mode] - b[MY])); C.dMean.push(Math.hypot(mm.mx - b[MX], mm.my - b[MY])); C.dLast.push(Math.hypot(s.lkx - b[MX], s.lky - b[MY]))
        }
      }
    }
    // emptiness: expected untracked mechs within 80 m vs truth
    {
      let pred = 0
      const disc = (L, wgt) => { let m = 0; for (let j = L.j0; j <= L.j1; j++) for (let i = L.i0; i <= L.i1; i++) { const c = j * G.cnx + i; if (L.m[c] && Math.hypot(G.repX[c] - ox, G.repY[c] - oy) <= 80) m += L.m[c] } return m * wgt }
      for (const L of layers) pred += disc(L, L.alive)
      pred += disc(pool, Kpool)
      let act = 0
      for (const t of ids) { if (t === o) continue; const b = R.m[t][k]; if (!b || st[t].tracked) continue; if (Math.hypot(b[MX] - ox, b[MY] - oy) <= 80) act++ }
      empt.push([pred, act])
    }
    // first hits that land 0.5-1.0 s after this step
    for (const f of firstHits) {
      if (f.v !== o || f.k <= k + 4 || f.k > k + 9) continue
      const A = R.m[f.a][k]; if (!A) continue
      const s = st[f.a]
      const tb = Math.atan2(A[MY] - oy, A[MX] - ox), dist = Math.hypot(A[MX] - ox, A[MY] - oy)
      const status = vis[o * 16 + f.a][k] ? 'sight' : s.tracked ? 'memory' : s.ever ? 'lost' : 'never'
      const all = [...layers, pool], wts = [...layers.map(L => L.alive), Kpool]
      const wd = G.bestWedge(all, wts, ox, oy, gDanger)
      let busy = false; for (const t of ids) if (t !== o && t !== f.a && st[t].tracked && !st[t].dead && R.m[t][k] && Math.hypot(R.m[t][k][MX] - ox, R.m[t][k][MY] - oy) < 200) busy = true
      const rs = recent.filter(r => k - r.k <= 50); const lastS = rs.length ? rs[rs.length - 1].bearing : null
      // share of the danger mass inside the 120 deg wedge centred on the attacker (how much the belief "expected" that side)
      const ctr = G.bestWedge(all, wts, ox, oy, gDanger); let own = null
      if (s.ever && !s.tracked) { const w1 = G.bestWedge([s.L], [1], ox, oy, () => 1); own = Math.abs(angDiff(w1.yaw, tb)) <= Math.PI / 3 }
      fh.push({ status, dist, busy, torso60: Math.abs(angDiff(yaw, tb)) <= Math.PI / 3, torso90: Math.abs(angDiff(yaw, tb)) <= Math.PI / 2, belief60: Math.abs(angDiff(wd.yaw, tb)) <= Math.PI / 3, sound60: lastS === null ? null : Math.abs(angDiff(lastS, tb)) <= Math.PI / 3, own, cov: ctr.covered / (ctr.total || 1) })
    }
  }
}
// ---- report
console.log(`# belief replay validation: lam=${LAM} per 0.25 s sub-step (8 m cells), sounds=${USE_SOUND}, negative evidence=${USE_NEG}`)
if (!QUIET) console.log(`grid ${G.cnx} x ${G.cny} = ${G.cn} cells, open ${G.open.reduce((a, v) => a + v, 0)}; build ${tBuild.toFixed(0)} ms`)
console.log(`update cost: ${(stepMs / steps).toFixed(3)} ms per 0.5 s update (mean ${fmt(layerSteps / steps, 1)} live layers, ${fmt(visCells / steps, 0)} visible cells, ${fmt(G.rays / steps, 0)} rays); belief collapses ${collapses}`)
if (USE_SOUND) console.log(`sound clusters heard ${soundsHeard}: explained by a tracked mech ${soundsAttr}, assigned to a seen-before layer ${soundsToId} (right mech ${soundsRightId}), to a ghost ${soundsToGhost}, new ghost ${soundsNew} (ghosts born ${ghostsBorn})`)
console.log('\ncalibration of seen-before layers, by time since the track was lost (truth from the replay):')
console.log('| age s | n | truth in 50% region | in 90% region | mass within 12 m of truth (mean) | area of 90% region ha (p50) | error of mode m (p50) | error of last known position m (p50) | truth inside belief wedge | inside wedge on last known bearing |')
console.log('|---|---|---|---|---|---|---|---|---|---|')
cal.forEach((C, a) => { if (C.n) console.log(`| ${AGES[a]} | ${C.n} | ${fmt(100 * C.in50 / C.n, 0)}% | ${fmt(100 * C.in90 / C.n, 0)}% | ${fmt(mean(C.near), 2)} | ${fmt(pct(C.a90, .5), 2)} | ${fmt(pct(C.dMode, .5), 0)} | ${fmt(pct(C.dLast, .5), 0)} | ${fmt(100 * C.wedge / C.n, 0)}% | ${fmt(100 * C.lastBear / C.n, 0)}% |`) })
// emptiness
console.log('\n"is this area empty": expected number of untracked mechs within 80 m (belief) vs actual (replay), all observer steps')
const bins = [[0, 0.02], [0.02, 0.1], [0.1, 0.3], [0.3, 0.7], [0.7, 99]]
for (const [lo, hi] of bins) { const s = empt.filter(e => e[0] >= lo && e[0] < hi); if (s.length) console.log(`  predicted ${lo}-${hi}: n=${s.length}  mean predicted ${fmt(mean(s.map(e => e[0])), 3)}  actual mean ${fmt(mean(s.map(e => e[1])), 3)}  actual P(at least one) ${fmt(100 * s.filter(e => e[1] > 0).length / s.length, 1)}%`) }
{ const all = empt; console.log(`  base rate: an untracked mech within 80 m in ${fmt(100 * all.filter(e => e[1] > 0).length / all.length, 1)}% of steps`) }
// first hits
console.log(`\nfirst hits scored 0.5-1.0 s before impact: ${fh.length}`)
for (const stt of ['sight', 'memory', 'lost', 'never']) {
  const s = fh.filter(f => f.status === stt); if (!s.length) continue
  const p = (fn, arr = s) => arr.length ? `${arr.filter(fn).length}/${arr.length}` : '-'
  console.log(`  attacker ${stt}: n=${s.length}  median range ${fmt(pct(s.map(f => f.dist), .5), 0)} m | house torso had it within 60 deg ${p(f => f.torso60)}, within 90 deg ${p(f => f.torso90)} | belief danger wedge covers it ${p(f => f.belief60)} (victim not busy with another tracked mech: ${p(f => f.belief60, s.filter(f => !f.busy))}) | wedge on the last heard sound ${p(f => f.sound60, s.filter(f => f.sound60 !== null))} | its own layer's wedge ${p(f => f.own, s.filter(f => f.own !== null))}`)
}
{ const u = fh.filter(f => f.status === 'lost' || f.status === 'never'); const p = (fn) => `${u.filter(fn).length}/${u.length}`; console.log(`  untracked attackers together: house torso within 60 deg ${p(f => f.torso60)}; belief wedge ${p(f => f.belief60)}; random wedge would cover 33%`) }
