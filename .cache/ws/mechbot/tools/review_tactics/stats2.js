// Review tool: targeted behaviour counters over N simulator squad matches (see the labels printed).
//   bun tools/review_tactics/stats2.js --seed 1 --matches 60 [--overrides '{...}']
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seed0 = parseInt(arg('seed', '1'), 10), n = parseInt(arg('matches', '40'), 10)
const overrides = arg('overrides', null) ? JSON.parse(arg('overrides')) : undefined
const S = { ticks: 0, score: 0, heal: 0, heal55: 0, heal70: 0, healDroneHit: 0, hideTicks: 0, hideJumps: 0, hideArrive: 0, hideEpisodes: 0, hideGrow: 0,
  vetoes: 0, vetoBlocked: 0, kills: 0, killCubes: 0, killCubes0: 0, laserSeen60: 0, laserSeenMatches: 0, laserGotMatches: 0, laserNearTicks: 0,
  fdCycles: 0, lsEntries: 0, lsEntryHpf: 0, lsStill: 0, lsTicks: 0, shotsBand: [0, 0, 0, 0, 0], hitsBand: [0, 0, 0, 0, 0], idle: 0, firstContact: 0, firstContactN: 0,
  ffa: 0, ffaT: [], drones: 0, standStillExposed: 0, exposed: 0, relocTicks: 0, fightExposedTicks: 0, nearJinkOff: 0, tgtDrone: 0, tgtDroneWhileMechHits: 0,
  rearWhileTgtOther: 0, dmgEv: 0, firstShotRange: 0, firstShotN: 0, attackers30: 0, boostHide: 0, energyLow: 0, healExitHp: 0, healExitN: 0, zoneOut: 0,
  noLaserTicks: 0, wantPickupKnown: 0, cratesKnownIdle: 0, idleWithCrate: 0, idleTicks: 0, holdStill: 0, pullTicks: 0, lootTicks: 0, offerDelay: 0 }
const band = (d) => (d < 60 ? 0 : d < 100 ? 1 : d < 130 ? 2 : d < 170 ? 3 : 4)
for (let s = seed0; s < seed0 + n; s++) {
  let pickupsNear = false, gotLaser = false
  const hook = (row, obs, a, B) => {
    row.vetoes = B.counters.aimVetoes || 0
    row.tNpc = !!(B.target && B.target.npc)
    row.tgtBearing = B.target ? B.target.bearing : null
    row.gunReady = !!(B.me.gun && B.me.gun.cooldown <= 0.1 && B.me.gun.ammo > 0 && B.me.gun.reload <= 0)
    let lp = Infinity
    for (const p of B.pickups.values()) if (p.kind === 'laser') lp = Math.min(lp, Math.hypot(p.x - B.me.x, p.y - B.me.y))
    row.laserPickupD = lp
    row.hasLaser = !!B.me.laser
    let cr = 0
    for (const c of B.crates.values()) if (Math.hypot(c.x - B.me.x, c.y - B.me.y) < 150) cr++
    row.cratesKnown = cr
    row.relocating = B.legKind === 'relocate'
  }
  const { rows, rec, brainLogs } = await runTrace(s, { overrides, hook })
  S.score += rec.score
  const latch = brainLogs.find((l) => l.includes('FFA latched'))
  if (latch) { S.ffa++; S.ffaT.push(`seed ${s}: ${latch}`) }
  let prev = null, hideEp = null, lastModes = [], firstContact = -1, firstShot = false, prevAmmo = -1, attackers = new Set(), lsOn = false, prevVeto = 0
  const killT = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    S.ticks++
    if (r.mode === 'HEAL') { S.heal++; if (r.hpf >= 0.55) S.heal55++; if (r.hpf >= 0.7) S.heal70++; if (r.evs.some((e) => e.type === 'damaged' && e.weapon === 'npc')) S.healDroneHit++ }
    if (prev && prev.mode === 'HEAL' && r.mode !== 'HEAL') { S.healExitHp += r.hpf; S.healExitN++ }
    if (r.leg === 'hide') {
      S.hideTicks++
      if (!hideEp) { hideEp = { d0: r.hd, hx: r.hx, hy: r.hy, jumps: 0 }; S.hideEpisodes++ }
      if (Math.hypot(r.hx - hideEp.hx, r.hy - hideEp.hy) > 6) { S.hideJumps++; hideEp.jumps++; hideEp.hx = r.hx; hideEp.hy = r.hy; if (prev && r.hd > prev.hd + 3) S.hideGrow++ }
      if (r.hd < 3) { if (!hideEp.arrived) { hideEp.arrived = true; S.hideArrive++ } }
      if (r.boostB) S.boostHide++
    } else hideEp = null
    if (r.vetoes > prevVeto) { S.vetoes++; if (r.tLosOut && r.gunReady && !r.f0 && r.tgtBearing !== null && Math.abs(Math.atan2(Math.sin(r.aimYaw - r.tgtBearing), Math.cos(r.aimYaw - r.tgtBearing))) > 0.3) S.vetoBlocked++ }
    prevVeto = r.vetoes
    if (prev && prev.mode !== r.mode) { lastModes.push([r.t, prev.mode, r.mode]); const L = lastModes.length; if (L >= 2 && lastModes[L - 2][1] === 'FIGHT' && lastModes[L - 2][2] === 'DISENGAGE' && r.mode === 'FIGHT' && r.t - lastModes[L - 2][0] < 2.5) S.fdCycles++ }
    if (r.st === 'LAST-STAND') { S.lsTicks++; if (r.spd < 2) S.lsStill++; if (!lsOn) { lsOn = true; S.lsEntries++; S.lsEntryHpf += r.hpf } } else lsOn = false
    if (prevAmmo >= 0 && r.ammo >= 0 && r.ammo < prevAmmo && r.td > 0 && !r.tNpc) { S.shotsBand[band(r.td)] += prevAmmo - r.ammo; if (!firstShot) { firstShot = true; S.firstShotRange += r.td; S.firstShotN++ } }
    prevAmmo = r.ammo
    for (const e of r.evs) {
      if (e.type === 'hit' && e.weapon === 'gun' && e.target < 100 && r.td > 0) S.hitsBand[band(r.td)]++
      if (e.type === 'kill') { S.kills++; killT.push({ t: r.t, c: r.cubes }) }
      if (e.type === 'damaged' && e.by !== null) {
        S.dmgEv++
        if (firstContact < 0) firstContact = r.t
        if (r.t - firstContact < 30 && e.by < 100) attackers.add(e.by)
        if (e.rear && r.tgt >= 0 && r.tgt !== e.by) S.rearWhileTgtOther++
        if (e.by < 100 && r.tNpc) S.tgtDroneWhileMechHits++
      }
    }
    if (firstContact < 0) { S.idleTicks++; if (r.mode === 'HOLD' && r.spd < 0.5) { S.idle++; if (r.cratesKnown > 0) S.idleWithCrate++ } if (r.leg === 'pull') S.pullTicks++; if (r.mode === 'LOOT') S.lootTicks++ }
    const exposed = r.losInAge <= 0.15
    if (exposed) { S.exposed++; if (r.spd < 2) S.standStillExposed++; if (r.mode === 'FIGHT') { S.fightExposedTicks++; if (r.relocating) S.relocTicks++; if (r.td >= 0 && r.td < 60 && r.leg === 'standoff') S.nearJinkOff++ } }
    if (r.tNpc) S.tgtDrone++
    if (!r.hasLaser) { S.noLaserTicks++; if (r.laserPickupD < 60) { S.laserNearTicks++; pickupsNear = true } }
    if (r.hasLaser) gotLaser = true
    if (!r.inZone) S.zoneOut++
    if (r.en < 35) S.energyLow++
    prev = r
  }
  for (const k of killT) { const later = rows.find((r) => r.t >= k.t + 20) || rows[rows.length - 1]; const gain = later.cubes - k.c; S.killCubes += gain; if (gain <= 0) S.killCubes0++ }
  if (firstContact >= 0) { S.firstContact += firstContact; S.firstContactN++; S.attackers30 += attackers.size }
  if (pickupsNear) S.laserSeenMatches++
  if (gotLaser) S.laserGotMatches++
}
const f = (a, b, d = 3) => (b ? (a / b).toFixed(d) : 'n/a')
console.log(JSON.stringify({
  matches: n, meanScore: f(S.score, n, 2),
  'HEAL share of all decisions': f(S.heal, S.ticks), 'HEAL decisions at hp >= 55%': f(S.heal55, S.heal), 'HEAL decisions at hp >= 70%': f(S.heal70, S.heal), 'HEAL decisions hit by a drone': S.healDroneHit, 'mean hp fraction when HEAL ends': f(S.healExitHp, S.healExitN),
  'hide-leg episodes': S.hideEpisodes, 'episodes that reached the cell (<3 m)': S.hideArrive, 'hide cell jumped >6 m during an episode': S.hideJumps, 'of those jumps the new cell was farther': S.hideGrow, 'hide decisions with boost': f(S.boostHide, S.hideTicks),
  'aim-veto decisions per match': f(S.vetoes, n, 1), 'veto decisions with gun ready, line to target, torso >17 deg off, no shot': S.vetoBlocked,
  'FIGHT->DISENGAGE->FIGHT inside 2.5 s per match': f(S.fdCycles, n, 2),
  'LAST-STAND entries per match': f(S.lsEntries, n, 2), 'mean hp fraction at LAST-STAND entry': f(S.lsEntryHpf, S.lsEntries), 'LAST-STAND share of decisions': f(S.lsTicks, S.ticks), 'standing still in LAST-STAND': f(S.lsStill, S.lsTicks),
  'gun shots by range band [<60,60-100,100-130,130-170,>170]': S.shotsBand, 'hit rate by band': S.shotsBand.map((v, i) => f(S.hitsBand[i], v, 2)),
  'mean range of first gun shot at a mech': f(S.firstShotRange, S.firstShotN, 0),
  'kills': S.kills, 'mean cubes gained within 20 s of a kill': f(S.killCubes, S.kills, 2), 'kills with no cube gained': S.killCubes0,
  'matches with a laser pickup known within 60 m while holding no laser': S.laserSeenMatches, 'matches ending with / ever holding a laser': S.laserGotMatches, 'decisions laser pickup <60 m and none held': S.laserNearTicks,
  'before first damage: s per match standing still in HOLD': f(S.idle * 0.1, n, 1), 'of that with a crate known within 150 m': f(S.idleWithCrate * 0.1, n, 1), 's in LOOT': f(S.lootTicks * 0.1, n, 1), 's in pull': f(S.pullTicks * 0.1, n, 1), 'mean time of first damage': f(S.firstContact, S.firstContactN, 1),
  'distinct mechs that damaged us in the 30 s after first damage': f(S.attackers30, S.firstContactN, 2),
  'exposed decisions standing still': f(S.standStillExposed, S.exposed), 'FIGHT exposed decisions in relocate (no jink)': f(S.relocTicks, S.fightExposedTicks), 'FIGHT exposed standoff decisions under 60 m (no jink)': f(S.nearJinkOff, S.fightExposedTicks),
  'decisions with a drone as target': S.tgtDrone, 'mech hits taken while the target was a drone': S.tgtDroneWhileMechHits, 'rear hits taken from a mech that was not the target': S.rearWhileTgtOther, 'damage events': S.dmgEv,
  'FFA latches': S.ffa, ffaT: S.ffaT, 'decisions outside zone': S.zoneOut,
}, null, 1))
process.exit(0)
