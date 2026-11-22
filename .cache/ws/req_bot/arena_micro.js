// DEV ONLY. A small deterministic closed-loop stepper for tools/test_brain.js: one mech of ours driven by the
// real brain, scripted enemies, optional real terrain. It follows protocol sections 5-9 for the parts the
// tests need (movement limits, torso slew, gun / laser, mortar shells, vision wedge + memory, zone, regen).
// It is not the match simulator (see P/sim for that): no enemy AI, no loot spawning, no lightning chains.

const DT = 0.05
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI }
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export function rng32(seed) {
  let a = seed >>> 0
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export class Arena {
  /**
   * o: { cfg, world, nav, seed, me: {x, y, yaw, hp, weapons: ['gun', 'laser'|null], cubes}, enemies: [...], zone,
   *      spread (multiplier of spread_deg, default 1), fireDelayTicks (0 = shot leaves in the first sim tick) }
   * enemy: { id, x, y, hp, weapons, script(e, t, arena), dps, radius, height }
   */
  constructor(o) {
    this.cfg = o.cfg; this.world = o.world || null; this.nav = o.nav || null
    this.rand = rng32(o.seed || 1)
    this.t = 0; this.tick = 0
    this.spreadMul = o.spread ?? 1
    this.fireDelayTicks = o.fireDelayTicks ?? 0
    const m = this.cfg.mech
    const me = o.me || {}
    this.me = {
      id: 3, x: me.x || 0, y: me.y || 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: me.yaw || 0, pitch: 0, cmdYaw: me.yaw || 0, cmdPitch: 0,
      hp: me.hp ?? m.hp, maxHp: m.hp, energy: m.energy, grounded: true, cubes: me.cubes || 0, lastDmgT: -99, lastSpendT: -99,
      weapons: (me.weapons || ['gun', null]).map((k) => (k ? this._weapon(k) : null)), pinned: !!me.pinned,
    }
    this.me.z = this._ground(this.me.x, this.me.y)
    this.enemies = (o.enemies || []).map((e, i) => ({
      id: e.id ?? 10 + i, kind: e.kind || 'mech', x: e.x, y: e.y, z: 0, vx: 0, vy: 0, yaw: 0, pitch: 0, hp: e.hp ?? m.hp, maxHp: e.maxHp ?? e.hp ?? m.hp,
      weapons: e.weapons || ['gun'], script: e.script || null, dps: e.dps || 0, hitAcc: 0, radius: e.radius ?? m.radius, height: e.height ?? m.height,
      lastSeen: -99, charging: false, alive: true, cubes: 0,
    }))
    for (const e of this.enemies) e.z = this._ground(e.x, e.y)
    this.zone = o.zone || { center: [0, 0], radius: 5000, next_center: [0, 0], next_radius: 4000, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
    this.zc = { x: this.zone.center[0], y: this.zone.center[1], r: this.zone.radius }
    this.bullets = []; this.shells = []; this.events = []; this.pickups = o.pickups || []; this.cubes = o.cubes || []; this.crates = o.crates || []
    this.offer = null
    this.stats = { shots: 0, hits: 0, beams: 0, beamHits: 0, beamCharge: [], dmgTaken: 0, outsideTicks: 0, boostOutside: 0, shellImpacts: [], takes: [], fireTicks: 0 }
    this.nextId = 1; this.pendingFire = 0
    this.inZone = Math.hypot(this.me.x - this.zc.x, this.me.y - this.zc.y) <= this.zc.r
  }

  _weapon(kind) {
    const s = { ...this.cfg.weapons[kind] }
    return { kind, cooldown: 0, ammo: s.mag || 0, reload: 0, charge: 0, heldFull: 0, stats: s, releasing: false }
  }
  _ground(x, y) { return this.nav ? this.nav.levelAt(x, y) : this.world ? this.world.ground(x, y) : 0 }
  _los(ax, ay, az, bx, by, bz) { return !this.world || this.world.shotClear(ax, ay, az, bx, by, bz) }
  _gauss() { let u = 0, v = 0; while (u === 0) u = this.rand(); v = this.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

  obs() {
    const me = this.me, m = this.cfg.mech, vis = this.cfg.vision
    const eyeZ = me.z + m.eye_height
    const mechs = []
    for (const e of this.enemies) {
      if (!e.alive) continue
      const d = Math.hypot(e.x - me.x, e.y - me.y)
      const los = !this.world || this.world.canSee(me.x, me.y, eyeZ, e.x, e.y, e.z + e.height * 0.5) || this.world.canSee(me.x, me.y, eyeZ, e.x, e.y, e.z + e.height)
      const inWedge = Math.abs(wrap(Math.atan2(e.y - me.y, e.x - me.x) - me.yaw)) <= vis.fov_deg * Math.PI / 360
      if (los && (d <= vis.near_range || (d <= vis.range && inWedge))) e.lastSeen = this.t
      if (this.t - e.lastSeen <= vis.memory_s) {
        const r = { id: e.id, kind: e.kind, pos: [r2(e.x), r2(e.y), r2(e.z)], vel: [r2(e.vx), r2(e.vy), 0], aim: [r3(e.yaw), r3(e.pitch)], hp: e.hp, max_hp: e.maxHp }
        if (e.kind === 'mech') { r.cubes = e.cubes; r.weapons = e.weapons; r.charging = e.charging }
        mechs.push(r)
      }
    }
    const projectiles = []
    for (const s of this.shells) {
      const d = Math.hypot(s.x - me.x, s.y - me.y)
      const inWedge = Math.abs(wrap(Math.atan2(s.y - me.y, s.x - me.x) - me.yaw)) <= vis.fov_deg * Math.PI / 360
      if (d <= vis.near_range || (d <= vis.range && inWedge)) projectiles.push({ id: s.id, kind: 'mortar', pos: [r2(s.x), r2(s.y), r2(s.z)], vel: [r2(s.vx), r2(s.vy), r2(s.vz)] })
    }
    const near = (o) => Math.hypot(o.pos[0] - me.x, o.pos[1] - me.y) <= vis.range
    const stats = { ...m }
    const o = {
      type: 'obs', tick: this.tick, t: Math.round(this.t * 1000) / 1000, alive: 1 + this.enemies.filter((e) => e.alive && e.kind === 'mech').length,
      self: {
        id: me.id, pos: [r2(me.x), r2(me.y), r2(me.z)], vel: [r2(me.vx), r2(me.vy), r2(me.vz)], aim: [r3(me.yaw), r3(me.pitch)],
        hp: me.hp, max_hp: me.maxHp, energy: Math.round(me.energy * 10) / 10, max_energy: m.energy, grounded: me.grounded, cubes: me.cubes, upgrades: [], in_zone: this.inZone,
        weapons: me.weapons.map((w) => {
          if (!w) return null
          const r = { kind: w.kind, cooldown: Math.max(0, r2(w.cooldown)), stats: w.stats }
          if (w.kind === 'gun') { r.ammo = w.ammo; r.reload = Math.max(0, r2(w.reload)) }
          if (w.kind === 'laser') r.charge = r2(w.charge)
          return r
        }),
        stats,
      },
      mechs, projectiles, crates: this.crates.filter(near), cubes: this.cubes.filter(near), pickups: this.pickups.filter(near),
      sounds: [], beams: [], events: this.events, drops: [],
      zone: { center: [r2(this.zc.x), r2(this.zc.y)], radius: r2(this.zc.r), next_center: this.zone.next_center, next_radius: this.zone.next_radius,
        shrink_start: this.zone.shrink_start, shrink_end: this.zone.shrink_end, dps: this.zone.dps },
      offer: this.offer,
    }
    this.events = []
    return o
  }

  step(a) {
    const me = this.me
    if (a.aim) { me.cmdYaw = a.aim[0]; me.cmdPitch = a.aim[1] }
    if (Number.isInteger(a.take)) this._take(a.take, a.drop)
    for (let k = 0; k < 2; k++) this._tick(a, k)
  }

  _take(id, drop) {
    const me = this.me, i = this.pickups.findIndex((p) => p.id === id)
    this.stats.takes.push({ id, drop: drop ?? null, t: this.t })
    if (i < 0) { this.events.push({ type: 'take_failed', id, reason: 'gone' }); return }
    const p = this.pickups[i]
    if (Math.hypot(p.pos[0] - me.x, p.pos[1] - me.y) > this.cfg.loot.pickup_radius) { this.events.push({ type: 'take_failed', id, reason: 'range' }); return }
    if (me.weapons.some((w) => w && w.kind === p.kind)) { this.events.push({ type: 'take_failed', id, reason: 'have' }); return }
    let slot = me.weapons.findIndex((w) => !w)
    if (slot < 0) { if (drop !== 0 && drop !== 1) { this.events.push({ type: 'take_failed', id, reason: 'full' }); return } slot = drop }
    me.weapons[slot] = this._weapon(p.kind); me.weapons[slot].cooldown = Math.max(1, me.weapons[slot].stats.cooldown)
    this.pickups.splice(i, 1)
    this.events.push({ type: 'took', id, kind: p.kind, slot })
  }

  _tick(a, sub) {
    const me = this.me, m = this.cfg.mech, dt = DT
    this.t += dt; this.tick++
    // 1. torso slew
    const dy = clamp(wrap(me.cmdYaw - me.yaw), -m.turn_rate * dt, m.turn_rate * dt)
    me.yaw = wrap(me.yaw + dy)
    const cp = clamp(me.cmdPitch, m.min_pitch, m.max_pitch)
    me.pitch += clamp(cp - me.pitch, -m.pitch_rate * dt, m.pitch_rate * dt)
    // 2. legs
    let mx = a.move ? a.move[0] : 0, my = a.move ? a.move[1] : 0
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml }
    const charging = me.weapons.some((w) => w && w.kind === 'laser' && w.charge > 0)
    let boosting = !!a.boost && me.energy > 0 && ml > 0.01 && me.grounded
    let sp = (boosting ? m.boost_speed : m.walk_speed) * (charging ? m.charge_move_mult : 1)
    if (me.pinned) { mx = 0; my = 0 }
    const tvx = mx * sp, tvy = my * sp
    const acc = (me.grounded ? m.ground_accel : m.air_accel) * dt
    const dvx = tvx - me.vx, dvy = tvy - me.vy, dv = Math.hypot(dvx, dvy)
    if (dv <= acc) { me.vx = tvx; me.vy = tvy } else { me.vx += dvx / dv * acc; me.vy += dvy / dv * acc }
    if (a.jump && me.grounded) { me.vz = m.jump_speed; me.grounded = false }
    if (!me.grounded) {
      if (a.boost && me.energy > 0) { me.vz = Math.min(m.max_rise_speed, me.vz + m.jet_accel * dt); me.energy = Math.max(0, me.energy - m.jet_drain * dt); me.lastSpendT = this.t }
      me.vz -= m.gravity * dt
    }
    let nx = me.x + me.vx * dt, ny = me.y + me.vy * dt
    if (this.world) {
      const blocked = (x, y) => this.world.bodyBlocked(x, y, me.z, m.radius, m.height, m.step_up) || (this.nav && me.grounded && !this._stepOk(me.x, me.y, x, y))
      if (blocked(nx, ny)) {
        if (!blocked(nx, me.y)) { ny = me.y; me.vy = 0 } else if (!blocked(me.x, ny)) { nx = me.x; me.vx = 0 } else { nx = me.x; ny = me.y; me.vx = 0; me.vy = 0 }
      }
    }
    me.x = nx; me.y = ny
    const gz = this._ground(me.x, me.y)
    if (me.grounded) me.z = gz
    else { me.z += me.vz * dt; if (me.z <= gz) { me.z = gz; me.vz = 0; me.grounded = true } }
    if (boosting) { me.energy = Math.max(0, me.energy - m.boost_drain * dt); me.lastSpendT = this.t }
    else if (this.t - me.lastSpendT >= m.energy_regen_delay) me.energy = Math.min(m.energy, me.energy + m.energy_regen * dt)
    // 3. enemies
    for (const e of this.enemies) {
      if (!e.alive) continue
      if (e.script) e.script(e, this.t, this, dt)
      e.z = this._ground(e.x, e.y) + (e.hz || 0)          // req_bot: scripted height above the ground (hops)
      if (e.dps > 0 && this._los(e.x, e.y, e.z + 7, me.x, me.y, me.z + m.height * 0.5) &&
          (!this.world || this.world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + m.height * 0.5) || this.world.canSee(e.x, e.y, e.z + 8, me.x, me.y, me.z + m.height))) {
        e.hitAcc += e.dps * dt
        if (e.hitAcc >= 45) { e.hitAcc -= 45; this._hurt(45, 'gun', e) }
      }
    }
    // 4. weapons
    for (let s = 0; s < 2; s++) {
      const w = me.weapons[s]
      if (!w) continue
      const held = !!(a.fire && a.fire[s]) && !(this.fireDelayTicks > 0 && sub < this.fireDelayTicks && w.kind === 'gun' && !w.wasHeld)
      if (w.cooldown > 0) w.cooldown -= dt
      if (w.kind === 'gun') {
        if (w.reload > 0) { w.reload -= dt; if (w.reload <= 0) { w.reload = 0; w.ammo = w.stats.mag } }
        else if (a.reload && w.ammo < w.stats.mag) w.reload = w.stats.reload
        if (held && w.cooldown <= 1e-9 && w.ammo > 0 && w.reload <= 0) {
          this._fireGun(w)
          w.cooldown = Math.max(w.cooldown, -dt) + w.stats.cooldown
          if (--w.ammo === 0) w.reload = w.stats.reload
        } else if (w.cooldown < 0) w.cooldown = 0
      } else if (w.kind === 'laser') {
        if (w.cooldown < 0) w.cooldown = 0
        if (held && w.cooldown <= 0 && !w.releasing) {
          if (w.charge >= w.stats.charge) { w.heldFull += dt; if (w.heldFull >= w.stats.hold_s) this._fireLaser(w) }
          w.charge = Math.min(w.stats.charge, w.charge + dt)
          if (w.charge <= dt + 1e-9) this.stats.chargeStarts = (this.stats.chargeStarts || 0) + 1
        } else if (w.charge > 0) {
          if (w.charge >= w.stats.min_charge) this._fireLaser(w)
          else { w.releasing = true; w.charge += dt }
        }
      }
      if (sub === 1) w.wasHeld = !!(a.fire && a.fire[s])
    }
    if (a.fire && (a.fire[0] || a.fire[1])) this.stats.fireTicks++
    // 5. our bullets
    for (const b of this.bullets) {
      if (!b.alive) continue
      const steps = 14
      for (let k = 0; k < steps && b.alive; k++) {
        const px = b.x, py = b.y, pz = b.z
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.z += b.vz * dt / steps
        b.travel += b.speed * dt / steps
        if (this.world && !this.world.shotClear(px, py, pz, b.x, b.y, b.z)) { b.alive = false; break }
        for (const e of this.enemies) {
          if (!e.alive) continue
          // the enemy moves during the tick: compare against its interpolated position
          const f = (k + 1) / steps - 1, ex = e.x + e.vx * dt * f, ey = e.y + e.vy * dt * f
          if (Math.hypot(b.x - ex, b.y - ey) <= e.radius + this.cfg.projectile.gun_radius && b.z >= e.z - 0.3 && b.z <= e.z + e.height + 0.3) {
            b.alive = false; this._hit(e, b.damage, 'gun'); if (b.counted) this.stats.hits++
            break
          }
        }
        for (const c of this.crates) {
          if (c.hp > 0 && Math.hypot(b.x - c.pos[0], b.y - c.pos[1]) <= 1.4 + 0.3 && b.z >= c.pos[2] - 0.3 && b.z <= c.pos[2] + 2.7) {
            b.alive = false; c.hp -= b.damage; this.events.push({ type: 'hit', target: c.id, amount: b.damage, weapon: 'gun' }); this.me.lastDmgT = this.t
            if (c.hp <= 0) { this.cubes.push({ id: 5000 + c.id, pos: [c.pos[0], c.pos[1], c.pos[2]] }) }
            break
          }
        }
        if (b.travel >= b.range) b.alive = false
      }
    }
    this.crates = this.crates.filter((c) => c.hp > 0)
    if (this.bullets.length > 64) this.bullets = this.bullets.filter((b) => b.alive)
    // cubes
    for (let i = this.cubes.length - 1; i >= 0; i--) {
      const c = this.cubes[i]
      if (Math.hypot(c.pos[0] - me.x, c.pos[1] - me.y) <= this.cfg.cubes.pickup_radius && Math.abs(c.pos[2] - me.z) <= 4) { this.cubes.splice(i, 1); me.cubes++; this.events.push({ type: 'pickup', cubes: me.cubes }); this.stats.cubesTaken = (this.stats.cubesTaken || 0) + 1 }
    }
    // 6. enemy shells
    const mo = this.cfg.weapons.mortar
    for (const s of this.shells) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vz -= mo.gravity * dt; s.z += s.vz * dt
      if (s.z <= this._ground(s.x, s.y)) {
        s.dead = true
        const d = Math.hypot(s.x - me.x, s.y - me.y)
        this.stats.shellImpacts.push({ d, t: this.t })
        if (d <= mo.splash_radius + m.radius) this._hurt(mo.splash * (1 - 0.7 * Math.min(1, d / mo.splash_radius)), 'mortar', s.by)
      }
    }
    this.shells = this.shells.filter((s) => !s.dead)
    // 7. zone and regeneration
    const z = this.zone
    const u = this.t <= z.shrink_start ? 0 : this.t >= z.shrink_end ? 1 : (this.t - z.shrink_start) / (z.shrink_end - z.shrink_start)
    this.zc.x = z.center[0] + (z.next_center[0] - z.center[0]) * u; this.zc.y = z.center[1] + (z.next_center[1] - z.center[1]) * u
    this.zc.r = z.radius + (z.next_radius - z.radius) * u
    this.inZone = Math.hypot(me.x - this.zc.x, me.y - this.zc.y) <= this.zc.r
    if (!this.inZone) {
      this.stats.outsideTicks++
      if (a.boost) this.stats.boostOutside++
      me.hp -= z.dps * dt; me.lastDmgT = this.t
      this.zoneAcc = (this.zoneAcc || 0) + z.dps * dt
      if (this.zoneAcc >= 5) { this.events.push({ type: 'damaged', amount: this.zoneAcc, weapon: 'zone', bearing: null, by: null }); this.zoneAcc = 0 }
    } else if (this.t - me.lastDmgT >= m.regen_delay && me.hp < me.maxHp) me.hp = Math.min(me.maxHp, me.hp + m.regen_per_s * dt)
  }

  _stepOk(x0, y0, x1, y1) {
    const nav = this.nav
    const c1 = nav.idx(x1, y1)
    if (c1 < 0) return false
    const c0 = nav.idx(x0, y0)
    if (c0 === c1) return true
    // slope limit: use the navigation grid's directed step test
    const i0 = c0 % nav.nx, j0 = (c0 / nav.nx) | 0, i1 = c1 % nav.nx, j1 = (c1 / nav.nx) | 0
    if (Math.abs(i1 - i0) > 1 || Math.abs(j1 - j0) > 1) return true
    return Math.abs(nav.level[c1] - nav.level[c0]) <= this.cfg.mech.step_up * 2.2 || nav.canStep(i0, j0, i1, j1)
  }

  _fireGun(w) {
    const me = this.me, m = this.cfg.mech
    const sd = w.stats.spread_deg * Math.PI / 180 * this.spreadMul
    const yaw = me.yaw + this._gauss() * sd, pitch = me.pitch + this._gauss() * sd
    const c = Math.cos(pitch), dx = c * Math.cos(yaw), dy = c * Math.sin(yaw), dz = Math.sin(pitch)
    const off = m.radius + 0.5
    const dmg = w.stats.damage * (1 + this.cfg.cubes.damage_per_cube * Math.min(me.cubes, this.cfg.cubes.stat_cap))
    this.bullets.push({ x: me.x + dx * off, y: me.y + dy * off, z: me.z + m.muzzle_height + dz * off, vx: dx * w.stats.speed, vy: dy * w.stats.speed, vz: dz * w.stats.speed,
      speed: w.stats.speed, travel: 0, range: w.stats.range, alive: true, damage: dmg, counted: this.countShots !== false })
    if (this.countShots !== false) this.stats.shots++
    this.stats.lastShotT = this.t
  }

  _fireLaser(w) {
    const me = this.me, m = this.cfg.mech
    const frac = w.stats.min_frac + (1 - w.stats.min_frac) * Math.min(1, w.charge / w.stats.charge)
    const c = Math.cos(me.pitch), dx = c * Math.cos(me.yaw), dy = c * Math.sin(me.yaw), dz = Math.sin(me.pitch)
    const ox = me.x, oy = me.y, oz = me.z + m.muzzle_height
    let hit = null
    // march the beam in 0.5 m steps (hitscan)
    const range = w.stats.range
    let blockT = 1
    if (this.world) blockT = this.world.rayShot(ox, oy, oz, ox + dx * range, oy + dy * range, oz + dz * range)
    for (let s = 3; s <= range * blockT && !hit; s += 0.5) {
      const x = ox + dx * s, y = oy + dy * s, z = oz + dz * s
      for (const e of this.enemies) if (e.alive && Math.hypot(x - e.x, y - e.y) <= e.radius && z >= e.z && z <= e.z + e.height) { hit = e; break }
    }
    this.stats.beams++; this.stats.beamCharge.push(w.charge)
    if (hit) { this.stats.beamHits++; this._hit(hit, w.stats.damage * frac, 'laser') }
    w.charge = 0; w.heldFull = 0; w.releasing = false; w.cooldown = w.stats.cooldown
    this.stats.lastShotT = this.t
  }

  _hit(e, amount, weapon) {
    e.hp -= amount
    this.me.lastDmgT = this.t
    this.events.push({ type: 'hit', target: e.id, amount, weapon })
    if (e.hp <= 0 && e.alive) { e.alive = false; this.events.push({ type: 'kill', target: e.id }) }
  }

  _hurt(amount, weapon, e) {
    const me = this.me
    me.hp -= amount; me.lastDmgT = this.t; this.stats.dmgTaken += amount
    this.events.push({ type: 'damaged', amount, weapon, bearing: e ? Math.atan2(e.y - me.y, e.x - me.x) : null, by: e ? e.id : null })
  }

  /** Enemy `e` lobs a mortar shell at the ground point (tx, ty). */
  lob(e, tx, ty) {
    const mo = this.cfg.weapons.mortar, g = mo.gravity, v = mo.speed
    const sz = e.z + e.height + 0.5, tz = this._ground(tx, ty)
    const D = Math.hypot(tx - e.x, ty - e.y), h = tz - sz
    const disc = v ** 4 - g * (g * D * D + 2 * h * v * v)
    if (disc < 0 || D < 1) return false
    const th = Math.atan((v * v - Math.sqrt(disc)) / (g * D)), yaw = Math.atan2(ty - e.y, tx - e.x)
    this.shells.push({ id: 300 + this.nextId++, x: e.x, y: e.y, z: sz, vx: v * Math.cos(th) * Math.cos(yaw), vy: v * Math.cos(th) * Math.sin(yaw), vz: v * Math.sin(th), by: e })
    return true
  }
}
const r2 = (v) => Math.round(v * 100) / 100
const r3 = (v) => Math.round(v * 1000) / 1000
