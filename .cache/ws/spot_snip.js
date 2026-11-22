  const zOn = zoneRun(ON), zOff = zoneRun(OFF), rOn = rushRun(ON), rOff = rushRun(OFF)
  check('D11 boost rarely: FFA still boosts for the zone (ZONE mode), but not on the lightning rush-in at a 32% mech 80 m away (rules off boosts in)',
    zOn.boost > 3 && zOn.zoneDec > 10 && rOn.boost === 0 && rOff.boost > 0, `zone on ${JSON.stringify(zOn)} off ${JSON.stringify(zOff)} | rush on ${JSON.stringify(rOn)} off ${JSON.stringify(rOff)}`)
}

// ---------------------------------------------------------------- map spots with cover: rules 1, 3, 4, 9
function spot(seed, dLo, dHi) {
  const rnd = rng32(seed), Bd = world.bounds
  for (let k = 0; k < 300000; k++) {
    const x = Bd.minX + 120 + rnd() * (Bd.maxX - Bd.minX - 240), y = Bd.minY + 120 + rnd() * (Bd.maxY - Bd.minY - 240)
    if (!nav.passableAt(x, y) || nav.component(x, y) !== nav.mainComponent) continue
    const wd = nav.wallDistAt(x, y)
    if (!(wd >= 3 && wd <= 6)) continue
    const a = rnd() * 2 * Math.PI, d = dLo + rnd() * (dHi - dLo), ex = x + d * Math.cos(a), ey = y + d * Math.sin(a)
    if (!nav.passableAt(ex, ey) || nav.component(ex, ey) !== nav.mainComponent) continue
    const z = nav.levelAt(x, y), ez = nav.levelAt(ex, ey)
    if (!world.shotClear(x, y, z + 7, ex, ey, ez + 4.5) || !world.shotClear(ex, ey, ez + 7, x, y, z + 4.5) || !world.canSee(x, y, z + 8, ex, ey, ez + 6)) continue
    return { x, y, ex, ey }
  }
  return null
}
const mid = (a, o) => { o.alive = 12 }          // mid-game FFA (12 alive): not the last-four OFFENSIVE posture
const shooterAt = (dps) => (e, t, A) => { face(e, A); e.vx = 0; e.vy = 0; e.dps = world.shotClear(e.x, e.y, e.z + 7, A.me.x, A.me.y, A.me.z + 4.5) ? dps : 0 }

