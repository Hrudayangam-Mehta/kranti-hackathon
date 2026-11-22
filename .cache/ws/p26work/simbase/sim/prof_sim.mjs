// p26work profiling: play squad matches in-process with stage timers on the brain (prof.* and the brain stages)
import { makeContext, playMatch } from './run.js'
import { brainBotFactory } from './ourbot.js'
import * as brainMod from '../bot/lib/brain.js'
const seeds = (process.argv[2] || '1,2,3').split(',').map(Number)
const ov = JSON.parse(process.argv[3] || '{"fuseMs":1e9}')
const o = { bot: 'ours', mode: 'squad', overrides: null, quiet: true }
const ctx = makeContext(o)
const T = {}, N = {}, MX = {}
const slow = []
const wrapMod = {
  createBrain(h, c, ovr) {
    const br = brainMod.createBrain(h, c, ov)
    const B = br._B
    const wrapObj = (obj, name) => { if (!obj) return; for (const k of Object.keys(obj)) if (typeof obj[k] === 'function') { const f = obj[k], key = name + '.' + k; obj[k] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a) } finally { const d = performance.now() - t0; T[key] = (T[key] || 0) + d; N[key] = (N[key] || 0) + 1; if (d > (MX[key] || 0)) MX[key] = d } } } }
    wrapObj(B.prof, 'prof'); wrapObj(B.hunt, 'hunt')
    const act = br.act
    br.act = (obs, dl) => { const t0 = performance.now(); const r = act(obs, dl); const d = performance.now() - t0; T.act = (T.act || 0) + d; N.act = (N.act || 0) + 1; if (d > (MX.act || 0)) MX.act = d; if (d > 20) slow.push([obs.t, d.toFixed(1), B.mode, B.legKind, B.p26 ? B.p26.leg : '']); return r }
    return br
  },
}
const factories = { team: brainBotFactory(wrapMod, { world: ctx.world, name: 'ours', overrides: ov, quiet: true }), opponents: [] }
for (const s of seeds) { const r = await playMatch(s, o, ctx, factories); console.log('seed', s, 'score', r.score, 'maxMs', r.maxMs, 'meanMs', r.meanMs, 'lates', r.lates) }
const keys = Object.keys(T).sort((a, b) => T[b] - T[a])
for (const k of keys) console.log(k.padEnd(24), 'total', T[k].toFixed(0).padStart(6), 'ms  n', String(N[k]).padStart(6), ' mean', (T[k] / N[k]).toFixed(3), ' max', MX[k].toFixed(1))
console.log('slow decisions > 20 ms:', slow.length, JSON.stringify(slow.slice(0, 30)))
process.exit(0)
