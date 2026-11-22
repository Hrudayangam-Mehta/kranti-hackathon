// Scenario 19: why are trigger opportunities lost at 150 m and beyond? Standing brain, steadily walking target.
// For every decision with the gun loaded and cooldown <= 0.10 s and no trigger pull, classify what the brain saw.
import { brainBot, runScenario, scripted, OPEN } from './scen.js'
const walker = (period) => scripted('walker', (obs, s) => {
  if (s.next === undefined) { s.sign = 1; s.next = period / 2 }
  if (obs.t >= s.next) { s.sign = -s.sign; s.next += period }
  return { move: [0, s.sign] }
})
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
for (const R of [110, 150, 190]) {
  const c = { n: 0, fire: 0, cooling: 0, noTarget: 0, notListed: 0, noLine: 0, gate: 0, mode: {}, gateErr: [] }
  for (let seed = 1; seed <= 4; seed++) {
    let M = null
    const ours = brainBot({ readyCd: 0.1, rPrefGun: R, bandLo: 0, bandHi: 400, radialGain: 0, strafeGain: 0 }, (row, obs, a, B) => {
      if (M) { M.mechs[1].hp = 1400; M.mechs[0].hp = 1400 }
      const g = B.me.gun, tg = B.target
      c.n++
      if (a.fire[0]) { c.fire++; return }
      if (!(g.ammo > 0 && g.reload <= 0 && g.cooldown <= 0.1)) { c.cooling++; return }
      c.mode[B.mode] = (c.mode[B.mode] || 0) + 1
      if (!tg) { c.noTarget++; return }
      if (!tg.listed) { c.notListed++; return }
      if (!B.gunLos) { c.noLine++; return }
      c.gate++
      // error between the torso now and the command, in units of the yaw gate
      const Rr = Math.hypot(tg.x - B.me.x, tg.y - B.me.y)
      const gate = Math.max(0.004, (tg.radius + 0.3) / Rr - g.spread)
      if (c.gateErr.length < 8) c.gateErr.push(`yaw ${(Math.abs(wrap(a.aim[0] - B.me.yaw)) * 1000).toFixed(1)} mrad, pitch ${(Math.abs(a.aim[1] - B.me.pitch) * 1000).toFixed(1)} mrad (yaw gate ${(gate * 1000).toFixed(1)}, pitch gate ${(Math.max(0.004, (tg.height * 0.5 + 0.3) / Rr - g.spread) * 1000).toFixed(1)}; pitch rate allows ${(B.me.pitchRate * 100).toFixed(0)} mrad per decision) aimKind ${B.aimKind} tgt vz ${tg.vz.toFixed(2)} dz ${(tg.z - B.me.z).toFixed(1)}`)
    })
    runScenario({ bots: [ours, walker(12)], seed, place: [{ x: OPEN.x, y: OPEN.y, yaw: 0 }, { x: OPEN.x + R, y: OPEN.y, yaw: Math.PI }], maxT: 60, setup(m) { M = m } })
  }
  console.log(`R=${R}: decisions ${c.n}, trigger down ${c.fire}, cooling/reloading ${c.cooling}; trigger up with a ready gun: no target ${c.noTarget}, target not listed ${c.notListed}, muzzle line blocked ${c.noLine}, aim gate ${c.gate}; modes ${JSON.stringify(c.mode)}`)
  for (const l of c.gateErr.slice(0, 4)) console.log('     gate miss: ' + l)
}
