// check2a: lockstep twin of the pass-2a brain (bot/lib) and the pre-pass-2a snapshot (check2a/base_tree/lib, rebuilt
// bundle = 125650 bytes = fix2 package_final). Every act() runs both on the same observation (the base gets a deep copy)
// and compares the JSON of the two actions. A difference while the new brain is still SQUAD after the decision is a
// pre-latch violation; differences from the latch decision on are counted separately (expected in FFA).
import { Nav } from '../../bot/lib/nav.js'
const NEW = await import('../../bot/lib/brain.js')
const BASE = await import('./base_tree/lib/brain.js')
export const PARAMS = NEW.PARAMS, MODE = NEW.MODE, warmBodies = NEW.warmBodies
export const DUAL = { brains: 0, decisions: 0, pre: 0, preMism: 0, post: 0, postMism: 0, envMism: 0, latched: 0, firstPre: [], label: '' }
const twins = new WeakMap()
function twinNav(nav) {
  if (!nav) return null
  let tw = twins.get(nav)
  if (!tw) {
    tw = new Nav(nav.world, { cell: nav.cell, stepUp: nav.stepUp, maxSlopeDeg: nav.maxSlopeDeg, radius: nav.baseRadius, height: nav.baseHeight, maxScale: nav.maxScale, wallMargin: nav.wallMargin, headMargin: nav.headMargin })
    twins.set(nav, tw)
  }
  if (tw.radius !== nav.radius || tw.height !== nav.height) tw.setBody(nav.radius, nav.height)
  return tw
}
export function createBrain(hello, ctx, overrides) {
  const ctx2 = ctx ? { ...ctx, nav: twinNav(ctx.nav), log: () => {} } : ctx
  const hello2 = structuredClone(hello)
  const ov2 = overrides === undefined ? undefined : structuredClone(overrides)
  const nb = NEW.createBrain(hello, ctx, overrides)
  const bb = BASE.createBrain(hello2, ctx2, ov2)
  const id = ++DUAL.brains
  let n = 0, latchedAt = -1, mism = 0
  function act(obs, deadline) {
    const o2 = structuredClone(obs)
    if (ctx && ctx.nav) twinNav(ctx.nav)
    const a = nb.act(obs, deadline)
    const sa = JSON.stringify(a)
    const b = bb.act(o2, deadline)
    const sb = JSON.stringify(b)
    n++; DUAL.decisions++
    const envN = nb._B.env, envB = bb._B.env
    if (envN !== envB) DUAL.envMism++
    if (envN === 'FFA' && latchedAt < 0) { latchedAt = obs && obs.tick; DUAL.latched++ }
    if (envN !== 'FFA') {
      DUAL.pre++
      if (sa !== sb) { DUAL.preMism++; mism++; if (DUAL.firstPre.length < 20) DUAL.firstPre.push({ brain: id, label: DUAL.label, tick: obs && obs.tick, n, newA: sa.slice(0, 300), baseA: sb.slice(0, 300) }) ; if (mism === 1) console.log(`DUAL-PRE-MISMATCH brain ${id} tick ${obs && obs.tick} decision ${n}`) }
    } else { DUAL.post++; if (sa !== sb) DUAL.postMism++ }
    return a
  }
  return { act, debugState: nb.debugState, _B: nb._B, _base: bb }
}
export function dualReport() { return JSON.stringify({ ...DUAL, firstPre: DUAL.firstPre.slice(0, 5) }) }
