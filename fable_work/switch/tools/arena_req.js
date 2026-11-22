// DEV ONLY. Extensions of the micro-arena (arena_micro.js) for the owner-request tests (test_requests.js):
//   - our laser beams listed in obs.beams (by = our id, path muzzle -> stop point, age 0.1 = one tick after the
//     release as in the protocol example and the simulator), option ownBeams;
//   - a hidden systematic aim error of the beam direction (laserBias [dyaw, dpitch]);
//   - rear flags on `damaged` events (attacker outside our 180 deg front arc) and rear_mult damage;
//   - scripted loot: other mechs shooting crates (shootCrate), deaths that drop cubes / pickups (kill);
//   - cubes go to the closest mech within the pickup radius (us or a scripted enemy);
//   - extra sounds injected per observation (sounds hook).

import { Arena } from './arena_micro.js'

const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI }

export class ArenaReq extends Arena {
  constructor(o) {
    super(o)
    this.ownBeams = !!o.ownBeams
    this.laserBias = o.laserBias || [0, 0]
    this.myBeams = []
    this.soundsHook = o.sounds || null
    this.log = []
    this.nextPick = 8100; this.nextCube = 5100
  }

  obs() {
    const o = super.obs()
    if (this.ownBeams && this.myBeams.length) o.beams = o.beams.concat(this.myBeams)
    this.myBeams = []
    if (this.soundsHook) o.sounds = o.sounds.concat(this.soundsHook(this) || [])
    // rear flags (protocol 7: outside the front arc centred on our torso yaw)
    for (const e of o.events) {
      if (e.type !== 'damaged' || typeof e.bearing !== 'number') continue
      if (Math.abs(wrap(e.bearing - this.me.yaw)) > Math.PI / 2) e.rear = true
    }
    return o
  }

  _hurt(amount, weapon, e) {
    const me = this.me
    const bearing = e ? Math.atan2(e.y - me.y, e.x - me.x) : null
    const rear = bearing !== null && Math.abs(wrap(bearing - me.yaw)) > Math.PI / 2
    super._hurt(rear ? amount * (this.cfg.mech.rear_mult || 1.5) : amount, weapon, e)
    if (rear) this.stats.rearHits = (this.stats.rearHits || 0) + 1
  }

  _fireLaser(w) {
    const me = this.me, m = this.cfg.mech
    const frac = w.stats.min_frac + (1 - w.stats.min_frac) * Math.min(1, w.charge / w.stats.charge)
    const yaw = me.yaw + this.laserBias[0], pitch = me.pitch + this.laserBias[1]
    const c = Math.cos(pitch), dx = c * Math.cos(yaw), dy = c * Math.sin(yaw), dz = Math.sin(pitch)
    const ox = me.x, oy = me.y, oz = me.z + m.muzzle_height
    let hit = null, stop = w.stats.range
    const range = w.stats.range
    let blockT = 1
    if (this.world) blockT = this.world.rayShot(ox, oy, oz, ox + dx * range, oy + dy * range, oz + dz * range)
    stop = range * blockT
    for (let s = 3; s <= range * blockT && !hit; s += 0.25) {
      const x = ox + dx * s, y = oy + dy * s, z = oz + dz * s
      for (const e of this.enemies) if (e.alive && Math.hypot(x - e.x, y - e.y) <= e.radius && z >= e.z && z <= e.z + e.height) { hit = e; stop = s; break }
    }
    this.stats.beams++; this.stats.beamCharge.push(w.charge)
    this.stats.beamLog = this.stats.beamLog || []
    this.stats.beamLog.push({ t: this.t, hit: !!hit })
    if (hit) { this.stats.beamHits++; this._hit(hit, w.stats.damage * frac, 'laser') }
    const off = m.radius + 0.5
    this.myBeams.push({ by: me.id, kind: 'laser', path: [[r2(ox + dx * off), r2(oy + dy * off), r2(oz + dz * off)], [r2(ox + dx * stop), r2(oy + dy * stop), r2(oz + dz * stop)]], age: 0.1 })
    w.charge = 0; w.heldFull = 0; w.releasing = false; w.cooldown = w.stats.cooldown
    this.stats.lastShotT = this.t
  }

  /** Scripted: mech `e` shoots crate `c` (dps) and faces it; the crate breaks into a cube (+ weapon pickup). */
  shootCrate(e, c, dps, dt, weapon) {
    if (!c || c.hp <= 0) return
    e.yaw = Math.atan2(c.pos[1] - e.y, c.pos[0] - e.x)
    c.acc = (c.acc || 0) + dps * dt
    if (c.acc >= 45) { c.acc -= 45; c.hp -= 45 }
    if (c.hp <= 0) {
      this.cubes.push({ id: this.nextCube++, pos: [c.pos[0], c.pos[1], c.pos[2]] })
      if (weapon) this.pickups.push({ id: this.nextPick++, kind: weapon, pos: [c.pos[0], c.pos[1], c.pos[2]] })
      this.log.push({ t: this.t, e: 'crate', id: c.id })
    }
  }

  /** Scripted death of enemy `e`: its cubes (+2) land around it, its non-gun weapons lie at its feet. */
  kill(e) {
    if (!e.alive) return
    e.alive = false
    const n = (e.cubes || 0) + 2
    for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; this.cubes.push({ id: this.nextCube++, pos: [e.x + Math.cos(a) * 1.5, e.y + Math.sin(a) * 1.5, e.z] }) }
    for (const k of e.weapons) if (k !== 'gun') this.pickups.push({ id: this.nextPick++, kind: k, pos: [e.x, e.y, e.z] })
    this.log.push({ t: this.t, e: 'death', id: e.id })
  }

  _tick(a, sub) {
    super._tick(a, sub)
    // cubes the scripted enemies walk onto (closest mech within the radius takes it)
    const R = this.cfg.cubes.pickup_radius
    for (let i = this.cubes.length - 1; i >= 0; i--) {
      const c = this.cubes[i]
      for (const e of this.enemies) {
        if (!e.alive || e.kind !== 'mech') continue
        const de = Math.hypot(c.pos[0] - e.x, c.pos[1] - e.y)
        if (de <= R && de < Math.hypot(c.pos[0] - this.me.x, c.pos[1] - this.me.y)) { this.cubes.splice(i, 1); e.cubes = (e.cubes || 0) + 1; this.stats.enemyCubes = (this.stats.enemyCubes || 0) + 1; break }
      }
    }
    // pickups the scripted enemies take (when they stand on them)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]
      for (const e of this.enemies) {
        if (!e.alive || e.kind !== 'mech' || !e.takes) continue
        if (Math.hypot(p.pos[0] - e.x, p.pos[1] - e.y) <= 2) { this.pickups.splice(i, 1); this.stats.enemyTakes = (this.stats.enemyTakes || 0) + 1; break }
      }
    }
  }
}
const r2 = (v) => Math.round(v * 100) / 100
