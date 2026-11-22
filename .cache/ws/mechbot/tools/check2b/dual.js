// check2b: lockstep twin. NEW = bot/lib with preset pass2b=off forced (applied last by resolveParams); BASE = the pass 2a
// snapshot (scratchpad/snapshots/bot_pass2a/lib, == check2a/new_tree, sha256 list verified). Each act() runs both on the
// same observation (BASE gets a deep copy, its own Nav twin) and compares the JSON of the two actions, every decision
// (pre-latch and post-latch counted separately). DUAL_MODE=on keeps NEW at plain defaults (then only counts differences).
import { Nav } from '../../bot/lib/nav.js'
const NEW = await import('../../bot/lib/brain.js')
const BASE = await import('../../../snapshots/bot_pass2a/lib/brain.js')
export const PARAMS = NEW.PARAMS, MODE = NEW.MODE, warmBodies = NEW.warmBodies
export const DUAL = { brains: 0, decisions: 0, pre: 0, preMism: 0, post: 0, postMism: 0, envMism: 0, latched: 0, first: [], label: '' }
const OFF = process.env.DUAL_MODE !== 'on'
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
const withOff = (o) => {
  const ov = o && typeof o === 'object' ? structuredClone(o) : {}
  if (OFF) ov.select = { ...(ov.select || {}), pass2b: 'off' }
  return ov
}
export function createBrain(hello, ctx, overrides) {
  const ctx2 = ctx ? { ...ctx, nav: twinNav(ctx.nav), log: () => {} } : ctx
  const hello2 = structuredClone(hello)
  const ov2 = overrides === undefined ? undefined : structuredClone(overrides)
  const nb = NEW.createBrain(hello, ctx, withOff(overrides))
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
    const pre = envN !== 'FFA'
    if (pre) DUAL.pre++; else DUAL.post++
    if (sa !== sb) {
      if (pre) DUAL.preMism++; else DUAL.postMism++
      mism++
      if (DUAL.first.length < 20) DUAL.first.push({ brain: id, label: DUAL.label, pre, tick: obs && obs.tick, n, newA: sa.slice(0, 300), baseA: sb.slice(0, 300) })
    }
    return a
  }
  return { act, debugState: nb.debugState, _B: nb._B, _base: bb }
}
export function dualReport() { return JSON.stringify({ ...DUAL, first: DUAL.first.slice(0, 5) }) }
