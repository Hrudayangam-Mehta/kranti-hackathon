import sys, re
path = sys.argv[1]
s = open(path).read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit(f"pattern count {n} != {count}: {old[:80]!r}")
    s = s.replace(old, new)

# 1. constructor: optional trace
rep("""    this.log = []                   // match events for analysis: {t, e, ...}
""", """    this.log = []                   // match events for analysis: {t, e, ...}
    // optional per-match trace of one slot (analysis only; off by default): { slot, hook(match, frame), worldEvery }
    this.trace = o.trace || null
    this.tr = this.trace ? { slot: this.trace.slot, frames: [], dmg: [], npc: [], cubes: [], world: [], zaps: 0 } : null
""")
# 2. _hurtMech: damage between mechs touching the traced slot
rep("""    if (a && a !== e) {
      a.dmgDealt += amt; a.lastCombatT = t""", """    if (this.tr && (e.id === this.tr.slot || by === this.tr.slot)) {
      const dd = a && a !== e ? Math.hypot(a.x - e.x, a.y - e.y, a.z - e.z) : -1
      this.tr.dmg.push([r2(t), by, e.id, amt, weapon, r1(dd), rear ? 1 : 0, r1(e.hp)])
    }
    if (a && a !== e) {
      a.dmgDealt += amt; a.lastCombatT = t""")
# 3. npc / crate damage by the traced slot
rep("""    const amt = r2(Math.min(n.hp, base))
    n.hp -= amt
""", """    const amt = r2(Math.min(n.hp, base))
    n.hp -= amt
    if (this.tr && by === this.tr.slot) this.tr.npc.push([r2(this.t), 'n', n.id, amt, weapon, n.hp <= 1e-9 ? 1 : 0])
""")
rep("""    const amt = r2(Math.min(c.hp, base))
    c.hp -= amt
""", """    const amt = r2(Math.min(c.hp, base))
    c.hp -= amt
    if (this.tr && by === this.tr.slot) this.tr.npc.push([r2(this.t), 'c', c.id, amt, weapon, c.hp <= 1e-9 ? 1 : 0])
""")
# 4. cube pickups
rep("""        this._giveCubes(best, 1)
""", """        this._giveCubes(best, 1)
        if (this.tr && best.id === this.tr.slot) this.tr.cubes.push([r2(this.t), best.cubes])
""")
# 5. laser log: number of mechs struck
rep("""    this.log.push({ t: this.t, e: 'laser', id: m.id, frac })
""", """    const lzr = { t: this.t, e: 'laser', id: m.id, frac }
    this.log.push(lzr)
""")
rep("""    const base = st.damage * frac * m.dmgMul
    for (let i = 0; i < n; i++) {""", """    const base = st.damage * frac * m.dmgMul
    if (this.tr) { let mh = 0; for (let i = 0; i < n; i++) if (hits[i][1] === 0) mh++; lzr.mh = mh; lzr.nh = n }
    for (let i = 0; i < n; i++) {""")
# 6. zap count
rep("""    this._sound('lightning', m.x, m.y, m.id)
    // candidates""", """    this._sound('lightning', m.x, m.y, m.id)
    if (this.tr && m.id === this.tr.slot) this.tr.zaps++
    // candidates""")
# 7. frame recorder called after each decision's answers
rep("""  _tickEnds() {""", """  /** Trace only: one frame of the traced slot per decision (plus every mech every `worldEvery` decisions). */
  _traceFrame() {
    const tr = this.tr, m = this.mechs[tr.slot]
    if (!m.alive) return
    const z = this.zone
    const fr = {
      t: r2(this.t), x: r1(m.x), y: r1(m.y), z: r1(m.z), hp: Math.round(m.hp), mhp: Math.round(m.maxHp), en: Math.round(m.energy), cu: m.cubes, up: m.upgrades.length,
      ld: m.slots.filter(Boolean).map((w) => w.kind[0] + (w.kind === 'lightning' ? 'i' : '')).join(''), mv: [r2(m.mvx), r2(m.mvy)], b: m.boost ? 1 : 0,
      v: r1(Math.hypot(m.vx, m.vy)), g: m.grounded ? 1 : 0, iz: m.inZone ? 1 : 0, ze: r1(z.r - Math.hypot(m.x - z.x, m.y - z.y)), f: (m.fire0 ? 1 : 0) + (m.fire1 ? 2 : 0),
      ch: m.charging ? 1 : 0,
    }
    if (this.trace.hook) { try { this.trace.hook(this, fr) } catch (e) { fr.hookErr = String(e).slice(0, 80) } }
    tr.frames.push(fr)
    const we = this.trace.worldEvery || 5
    if (this.decisions % we === 0) tr.world.push([r2(this.t), this.mechs.filter((q) => q.alive).map((q) => [q.id, r1(q.x), r1(q.y), r1(q.z), Math.round(q.hp), this.bots[q.id].target ?? -1])])
  }

  _tickEnds() {""")
# call sites: after _applyAnswers in runSync and run
rep("""      this._applyAnswers(answers)
      this.decisions++""", """      this._applyAnswers(answers)
      if (this.tr) this._traceFrame()
      this.decisions++""", count=2)
# result(): attach the trace and per-mech shot counts already there
rep("""      mechs: per, stats: this.stats(),
    }""", """      mechs: per, stats: this.stats(),
      ...(this.tr ? { trace: this.tr } : {}),
    }""")
open(path, 'w').write(s)
print("patched", path)
