// D6 farming gates, roof loot, power grabs in contact, kill cubes, supply drops.
import { createBrain, hello, ctxNone, check, fx, mkObs, mech, dmgBy, cfg, wpn, Arena, mapCtx } from './common.js'
const H = cfg.mech.hp
function lootAfter(o, secs = 1.5, over = {}, ctx = ctxNone) {
  const b = createBrain(hello, ctx, { warmup: false, ...over })
  let l = null, mode = null
  for (let k = 0; k < secs * 10; k++) { const t = (o.t ?? 60) + k * 0.1; b.act(mkObs({ ...o.obs(k, t), t }), performance.now() + 27); l = b._B.loot; mode = b.debugState().mode }
  return { type: l ? l.type : null, mode }
}
const crate = (x, y, z = 0) => ({ id: 1001, pos: [x, y, z], hp: 300 })
const drone = (x, y) => ({ id: 150, kind: 'npc', pos: [x, y, 0], vel: [0, 0, 0], aim: [0, 0], hp: 350, max_hp: 350 })
{
  const rows = [
    ['crate 100 m, hp 100%, t 60', { obs: () => ({ crates: [crate(100, 0)] }) }, {}, 'crate'],
    ['crate 100 m, hp 85%', { obs: () => ({ crates: [crate(100, 0)], self: { hp: 0.85 * H } }) }, {}, null],
    ['crate 100 m, hp 85%, preset farmHp=50', { obs: () => ({ crates: [crate(100, 0)], self: { hp: 0.85 * H } }) }, { select: { farmHp: '50' } }, 'crate'],
    ['crate 100 m, t 215', { t: 215, obs: () => ({ crates: [crate(100, 0)] }) }, {}, null],
    ['crate 100 m, 10 cubes + laser', { obs: () => ({ crates: [crate(100, 0)], self: { cubes: 10, weapons: [wpn('gun'), wpn('laser')] } }) }, {}, null],
    ['crate 100 m, 10 cubes, no laser', { obs: () => ({ crates: [crate(100, 0)], self: { cubes: 10 } }) }, {}, 'crate'],
    ['crate 160 m (> 150)', { obs: () => ({ crates: [crate(160, 0)] }) }, {}, null],
    ['drone 160 m', { obs: () => ({ mechs: [drone(160, 0)] }) }, {}, 'drone'],
    ['drone 180 m (> 170)', { obs: () => ({ mechs: [drone(180, 0)] }) }, {}, null],
    ['crate 100 m, a mech hit us 1 s ago (contact)', { obs: (k) => ({ crates: [crate(100, 0)], mechs: k < 3 ? [mech(10, -150, 0)] : [], events: k === 4 ? [dmgBy(10, 45, Math.PI)] : [] }) }, {}, null],
  ]
  const bad = [], out = []
  for (const [label, o, over, want] of rows) { const r = lootAfter(o, 1.5, over); out.push(`${label}: ${r.type}`); if (r.type !== want) bad.push(`${label}: ${r.type} (want ${want})`) }
  check('D6 farming gates (hp >= farmHp, t < 210, 10 cubes + laser, crates 150 m, drones 170 m, out of contact)', bad.length === 0, bad.length ? bad.join(' | ') : out.join(' | '))
}
// roof loot: a crate on a roof (> 2 m above terrain) on the real map is not farmed; the same crate on the ground is
{
  const ctx = await mapCtx()
  const { world, nav } = ctx
  // find a building prism top near a walkable cell, and a ground cell
  let roof = null, ground = null, start = null
  const bd = world.bounds
  for (let y = bd.minY + 60; y < bd.maxY - 60 && !roof; y += 7) for (let x = bd.minX + 60; x < bd.maxX - 60 && !roof; x += 7) {
    const top = world.surfaceZ ? world.surfaceZ(x, y, 1e4) : null, g = world.ground(x, y)
    if (top !== null && top - g > 5 && top - g < 30) {
      // a walkable cell 40-70 m away in the main component
      for (let a = 0; a < 12 && !roof; a++) { const sx = x + 55 * Math.cos(a), sy = y + 55 * Math.sin(a); if (nav.passableAt(sx, sy) && nav.component(sx, sy) === nav.mainComponent) { roof = [x, y, top]; start = [sx, sy] } }
    }
  }
  if (!roof) check('D6 no roof loot (real map)', false, 'no roof found by the probe')
  else {
    const sz = nav.levelAt(start[0], start[1])
    const run = (z) => {
      const b = createBrain(hello, ctx, { warmup: false })
      let l = null
      for (let k = 0; k < 15; k++) { const t = 60 + k * 0.1; const o = mkObs({ t, crates: [{ id: 1001, pos: [roof[0], roof[1], z], hp: 300 }], zone: { center: start, radius: 1500, next_center: start, next_radius: 1200, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } }); o.self.pos = [start[0], start[1], sz]; b.act(o, performance.now() + 27); l = b._B.loot }
      return l ? l.type : null
    }
    const onRoof = run(roof[2]), g = world.ground(roof[0], roof[1])
    // control: a ground crate at a passable cell 50 m away
    let gx = null
    for (let a = 0; a < 24 && !gx; a++) { const x = start[0] + 50 * Math.cos(a * 0.26), y = start[1] + 50 * Math.sin(a * 0.26); if (nav.passableAt(x, y) && nav.component(x, y) === nav.mainComponent && Math.abs(nav.levelAt(x, y) - world.ground(x, y)) < 0.5) gx = [x, y, nav.levelAt(x, y)] }
    const b2 = createBrain(hello, ctx, { warmup: false })
    let l2 = null
    for (let k = 0; k < 15; k++) { const t = 60 + k * 0.1; const o = mkObs({ t, crates: [{ id: 1002, pos: gx, hp: 300 }], zone: { center: start, radius: 1500, next_center: start, next_radius: 1200, shrink_start: 1e6, shrink_end: 2e6, dps: 20 } }); o.self.pos = [start[0], start[1], sz]; b2.act(o, performance.now() + 27); l2 = b2._B.loot }
    check('D6 no roof loot: crate on a roof not farmed, a ground crate is', onRoof === null && l2 && l2.type === 'crate', `roof crate at (${fx(roof[0], 0)}, ${fx(roof[1], 0)}) ${fx(roof[2] - g, 1)} m above terrain: ${onRoof} | ground crate: ${l2 ? l2.type : null}`)
  }
}
// power grabs in contact (closed loop, arena, no map): a hunter at 80 m shooting us; laser pickup at 50 m to the side
function grabRun(pick, hp0, enemyDps = 30, secs = 10, weapons = ['gun', null]) {
  const ar = new Arena({ cfg, seed: 21, me: { x: 0, y: 0, yaw: 0, hp: hp0 * H, weapons }, enemies: [{ id: 10, x: 80, y: 0, hp: 1e7, dps: enemyDps, script: (e, t, a) => { e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } }], ...pick })
  ar.t = 60
  const b = createBrain(hello, ctxNone, { warmup: false })
  let fights = 0
  for (let k = 0; k < secs * 10; k++) { const o = ar.obs(); o.self.hp = Math.max(o.self.hp, 1); const a = b.act(o, performance.now() + 27); if (b.debugState().mode === 'FIGHT') fights++; ar.step(a); if (ar.me.hp < hp0 * H * 0.7) ar.me.hp = hp0 * H }
  return { ar, b, fights }
}
{
  const r1 = grabRun({ pickups: [{ id: 8001, kind: 'laser', pos: [0, 50, 0] }] }, 1.0)
  const r2 = grabRun({ pickups: [{ id: 8001, kind: 'laser', pos: [0, 75, 0] }] }, 1.0)
  const r3 = grabRun({ pickups: [{ id: 8002, kind: 'lightning', pos: [0, 30, 0] }] }, 1.0)
  const r4 = grabRun({ pickups: [{ id: 8002, kind: 'lightning', pos: [0, 45, 0] }] }, 1.0)
  const k = (r) => r.ar.me.weapons[1] ? r.ar.me.weapons[1].kind : 'empty'
  check('D6 power grab in contact: laser within 60 m taken, at 75 m not; lightning within 35 m taken, at 45 m not', k(r1) === 'laser' && k(r2) === 'empty' && k(r3) === 'lightning' && k(r4) === 'empty',
    `laser 50 m: ${k(r1)} | laser 75 m: ${k(r2)} | lightning 30 m: ${k(r3)} | lightning 45 m: ${k(r4)} (fight decisions ${r1.fights}/${r2.fights}/${r3.fights}/${r4.fights})`)
  const c = (x, y, id) => ({ id, pos: [x, y, 0] })
  const g1 = grabRun({ cubes: [c(0, 60, 5001)] }, 1.0), g2 = grabRun({ cubes: [c(0, 60, 5001)] }, 0.45), g3 = grabRun({ cubes: [c(0, 35, 5001)] }, 0.45)
  check('D6 cube grab in contact: 60 m taken at hp > 50%, not at 45% (40 m limit); 35 m taken at 45%', g1.ar.me.cubes === 1 && g2.ar.me.cubes === 0 && g3.ar.me.cubes === 1,
    `60 m @100%: ${g1.ar.me.cubes} | 60 m @45%: ${g2.ar.me.cubes} | 35 m @45%: ${g3.ar.me.cubes}`)
}
// kill cubes: kill a weak mech at 60 m while a second hunter at 120 m keeps shooting; its cubes (dropped where it died) are collected at once
{
  const ar = new Arena({ cfg, seed: 23, me: { x: 0, y: 0, yaw: 0 }, enemies: [
    { id: 10, x: 60, y: 10, hp: 300, dps: 20, script: (e, t, a) => { e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } },
    { id: 11, x: -40, y: 110, hp: 1e7, dps: 25, script: (e, t, a) => { e.yaw = Math.atan2(a.me.y - e.y, a.me.x - e.x) } }] })
  ar.t = 60
  const b = createBrain(hello, ctxNone, { warmup: false })
  let killedAt = -1, gotAt = -1, contactAtPickup = false
  for (let k = 0; k < 250; k++) {
    const o = ar.obs(); const a = b.act(o, performance.now() + 27); ar.step(a)
    if (killedAt < 0 && !ar.enemies[0].alive) { killedAt = ar.t; const e = ar.enemies[0]; ar.cubes.push({ id: 6001, pos: [e.x + 1.5, e.y, 0] }, { id: 6002, pos: [e.x - 1, e.y + 1.5, 0] }) }
    if (killedAt > 0 && gotAt < 0 && ar.me.cubes >= 2) { gotAt = ar.t; contactAtPickup = ar.enemies[1].alive }
    if (ar.me.hp < 500) ar.me.hp = 900
  }
  check('D6 kill cubes collected at once while still in contact', killedAt > 0 && gotAt > 0 && gotAt - killedAt < 12 && contactAtPickup, `killed at ${fx(killedAt, 1)} s, both cubes at ${fx(gotAt, 1)} s (${fx(gotAt - killedAt, 1)} s later), second hunter alive: ${contactAtPickup}`)
}
// supply drop: unheld drop 40 m away lands in 20 s -> no DROP before lands_in <= 3 + walk; a mech within 60 m of the ring -> never; held -> never
{
  const run = (extra, secs = 20) => {
    const b = createBrain(hello, ctxNone, { warmup: false })
    let first = -1
    for (let k = 0; k < secs * 10; k++) { const t = 100 + k * 0.1; const landsIn = 20 - k * 0.1; b.act(mkObs({ t, drops: [{ id: 20000, pos: [40, 0, 0], radius: 8, lands_in: landsIn, capture_s: 4, progress: 0, holder: extra.holder ?? null }], mechs: extra.mechs || [] }), performance.now() + 27); if (first < 0 && b.debugState().mode === 'DROP') first = landsIn }
    return first
  }
  const free = run({}), held = run({ holder: 7 }), contested = run({ mechs: [mech(10, 80, 30, { yaw: Math.PI / 2 })] })
  const walk = 40 * 1.3 / cfg.mech.walk_speed
  check('D6 supply drop: start <= 3 s + walk before landing; never when held or contested (mech within 60 m)', free > 0 && free <= 3 + walk + 0.2 && held < 0 && contested < 0,
    `free: DROP first at lands_in ${fx(free, 1)} s (limit ${fx(3 + walk, 1)}) | held: ${held} | contested: ${contested}`)
}
