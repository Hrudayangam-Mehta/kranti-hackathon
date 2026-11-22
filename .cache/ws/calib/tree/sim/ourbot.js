// DEV ONLY: in-process adapter for our own bot. The shipped entry point (bot/bot.js) is a stdin/stdout program,
// so the simulator loads the brain the same way that file does: createBrain(hello, { world, nav, log }) from
// bot/lib/brain.js, then brain.act(obs, deadline). When the brain is missing or throws, a plain fallback policy
// answers instead (the real entry point has its own fallback; use `--bot "proc:bun bot/bot.js"` to test that).
// The brain resizes its navigation grid as the mech grows (nav.setBody), so it gets a Nav of its own.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Nav } from '../bot/lib/nav.js'
import { ROOT } from './config.js'

function fallbackAct(obs) {
  const me = obs.self, [x, y, z] = me.pos
  const c = obs.zone.next_center, d = Math.hypot(c[0] - x, c[1] - y) || 1
  const act = { tick: obs.tick, move: d > 10 ? [(c[0] - x) / d, (c[1] - y) / d] : [0, 0], boost: !me.in_zone, fire: [false, false] }
  let best = null, bd = Infinity
  for (const m of obs.mechs) { if (m.kind !== 'mech') continue; const q = Math.hypot(m.pos[0] - x, m.pos[1] - y); if (q < bd) { bd = q; best = m } }
  if (best) { act.aim = [Math.atan2(best.pos[1] - y, best.pos[0] - x), Math.atan2(best.pos[2] + 4.5 - z - 7, bd || 1)]; act.fire = [true, false] }
  if (obs.offer) act.pick = 0
  return act
}

/**
 * Wrap a brain-style module ({ createBrain(hello, ctx, overrides) }) as a simulator bot factory.
 * ctx: { world, name, overrides, quiet }. One Nav is built per factory and reused across matches.
 */
export function brainBotFactory(mod, ctx) {
  let nav = null
  return () => {
    let brain = null, hello = null
    const bot = {
      name: ctx.name || 'ours', errors: 0, slow: 0, maxMs: 0, sumMs: 0, n: 0, lates: 0, usedFallback: false,
      hello(h) {
        hello = h
        const mc = h.config.mech
        if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up ?? 1.2, maxSlopeDeg: mc.max_slope_deg ?? 50 })
        nav.setBody(mc.radius, mc.height)
        const log = ctx.quiet === false ? (...a) => console.error('[brain]', ...a) : () => {}
        try { brain = mod.createBrain(h, { world: ctx.world, nav, log }, ctx.overrides) } catch (e) { brain = null; bot.usedFallback = true; bot.initError = String(e?.stack || e) }
        return { type: 'ready', name: bot.name }
      },
      act(obs) {
        const t0 = performance.now()
        const budget = hello?.config?.bot?.tick_budget_ms ?? 50
        let a = null
        if (brain) {
          try { a = brain.act(obs, t0 + budget * 0.55) } catch (e) { bot.errors++; if (!bot.firstError) bot.firstError = String(e?.stack || e); a = null }
        }
        if (!a || typeof a !== 'object') { a = fallbackAct(obs); bot.usedFallback = true }
        a.tick = obs.tick
        const ms = performance.now() - t0
        bot.n++; bot.sumMs += ms
        if (ms > bot.maxMs) bot.maxMs = ms
        if (ms > budget) bot.lates++
        return a
      },
    }
    return bot
  }
}

/** Factory for our bot (bot/lib/brain.js), or null when the brain file does not exist. */
export async function ourBotFactory(ctx) {
  const file = join(ROOT, 'bot', 'lib', 'brain.js')
  if (!existsSync(file)) return null
  const mod = await import(pathToFileURL(file).href)
  if (typeof mod.createBrain !== 'function') return null
  return brainBotFactory(mod, { name: 'ours', ...ctx })
}
