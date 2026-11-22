// export.js OUTDIR STREAM...  : dump the map arrays (world + nav base body) and record the real ray casts and
// A* searches the brain makes over the given streams (base body only for A*, costFn null only).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const P = new URL('../../../', import.meta.url).pathname
const { World } = await import(P + 'bot/lib/world.js')
const { Nav } = await import(P + 'bot/lib/nav.js')
const { createBrain } = await import(P + 'bot/lib/brain.js')
const out = process.argv[2]
mkdirSync(out, { recursive: true })
const casts = [], searches = []
const castOrig = World.prototype._cast
World.prototype._cast = function (ax, ay, az, bx, by, bz, mode) {
  const r = castOrig.call(this, ax, ay, az, bx, by, bz, mode)
  if (casts.length < 8 * 400000) casts.push(ax, ay, az, bx, by, bz, mode, r)
  return r
}
const searchOrig = Nav.prototype._search
Nav.prototype._search = function (s, t, bx, by, rGoal, maxExpand, weight, costFn) {
  const r = searchOrig.call(this, s, t, bx, by, rGoal, maxExpand, weight, costFn)
  if (costFn === null && this.radius === this.baseRadius && this.height === this.baseHeight)
    searches.push(s, t, bx, by, rGoal, maxExpand, weight, r, this._expanded, this._best)
  return r
}
let world, nav
for (const file of process.argv.slice(3)) {
  let raw = readFileSync(file)
  if (file.endsWith('.gz')) raw = gunzipSync(raw)
  const lines = raw.toString('utf8').split('\n').filter((l) => l.trim())
  const hello = JSON.parse(lines.find((l) => l.includes('"type":"hello"')))
  if (!world) {
    world = World.loadSync(P + 'kit/arena')
    const m = hello.config.mech || {}
    nav = new Nav(world, { cell: 2, stepUp: m.step_up ?? 1.2, maxSlopeDeg: m.max_slope_deg ?? 50 })
  }
  const brain = createBrain(hello, { world, nav, log: () => {} }, { warmup: false })
  for (const l of lines) if (l.includes('"type":"obs"')) brain.act(JSON.parse(l), performance.now() + 27.5)
}
nav.setBody(nav.baseRadius, nav.baseHeight)
const w = world
const bin = (name, arr) => writeFileSync(`${out}/${name}.bin`, Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength))
const meta = {
  gnx: w._gnx, gny: w._gny, gx0: w._gx0, gy0: w._gy0, tnx: w.tnx, tny: w.tny, tMinX: w.tMinX, tMinY: w.tMinY,
  tStep: w.tStep, tInv: w._tInv, fxMax: w._fxMax, fyMax: w._fyMax, bnx: w._bnx, bny: w._bny, bSize: w._bSize,
  maxCanopyChord: w.maxCanopyChord, nP: w._pBase.length, nT: w._T.length / 10,
  nav: { nx: nav.nx, ny: nav.ny, cell: nav.cell, x0: nav.x0, y0: nav.y0, n: nav.n, heapCap: nav._heapCap, off: Array.from(nav._off) },
  casts: casts.length / 8, searches: searches.length / 10,
}
writeFileSync(`${out}/meta.json`, JSON.stringify(meta))
bin('E', w._E); bin('pe0', w._pe0); bin('pe1', w._pe1); bin('pBase', w._pBase); bin('pTop', w._pTop)
bin('pMinX', w._pMinX); bin('pMinY', w._pMinY); bin('pMaxX', w._pMaxX); bin('pMaxY', w._pMaxY)
bin('gpS', w._gpS); bin('gpI', w._gpI); bin('gtS', w._gtS); bin('gtI', w._gtI); bin('T', w._T); bin('h', w.h); bin('bmax', w._bmax)
bin('steps', nav.steps)
bin('casts', new Float64Array(casts)); bin('searches', new Float64Array(searches))
const modes = [0, 0, 0, 0, 0]; for (let i = 6; i < casts.length; i += 8) modes[casts[i]]++
console.log(JSON.stringify({ casts: meta.casts, modes, searches: meta.searches, h: w.h.constructor.name, bmax: w._bmax.constructor.name }))
