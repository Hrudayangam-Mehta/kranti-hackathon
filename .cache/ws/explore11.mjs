import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const nav = new Nav(w)
let seed = 2024; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const cells = []; for (let c = 0; c < nav.n; c++) if (nav.comp[c] === nav.mainComponent) cells.push(c)
const Q = []; for (let k = 0; k < 400; k++) { const a = cells[(rnd() * cells.length) | 0], b = cells[(rnd() * cells.length) | 0]; Q.push([nav.cellX(a), nav.cellY(a), nav.cellX(b), nav.cellY(b)]) }
const opt = Q.map(q => nav.findPath(...q, { maxExpand: 1e9, weight: 1 }))
const optRaw = Q.map(q => nav.findPath(...q, { maxExpand: 1e9, weight: 1, smooth: false }))
for (const wt of [1, 1.001, 1.02, 1.05, 1.1, 1.2, 1.3, 1.5, 2]) {
  for (let k = 0; k < 50; k++) nav.findPath(...Q[k], { weight: wt })
  let ok = 0, sumE = 0, maxE = 0, sumR = 0, maxR = 0, sumRaw = 0, n = 0; const times = []
  for (let k = 0; k < Q.length; k++) {
    const t = performance.now(); const r = nav.findPath(...Q[k], { weight: wt }); times.push(performance.now() - t)
    sumE += r.expanded; maxE = Math.max(maxE, r.expanded)
    if (r.ok) { ok++; const ratio = r.len / opt[k].len; sumR += ratio; maxR = Math.max(maxR, ratio); n++ }
    const rr = nav.findPath(...Q[k], { weight: wt, smooth: false, maxExpand: 1e9 }); sumRaw += rr.len / optRaw[k].len
  }
  times.sort((a, b) => a - b)
  console.log('weight', wt, 'ok', ok + '/' + Q.length, 'meanExp', Math.round(sumE / Q.length), 'maxExp', maxE, 'mean ms', (times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), 'p50', times[200].toFixed(3), 'p99', times[395].toFixed(3), 'len/opt smoothed mean', (sumR / n).toFixed(4), 'max', maxR.toFixed(3), 'raw mean', (sumRaw / Q.length).toFixed(4))
}
