// Gap analysis: per-match metrics from run.js --trace files.  node analyze.js <traceDir> <tag> [<tag> ...] [--json out.json]
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const args = process.argv.slice(2)
const dir = args[0]
let jsonOut = null
const tags = []
for (let i = 1; i < args.length; i++) { if (args[i] === '--json') jsonOut = args[++i]; else tags.push(args[i]) }
const parseLd = (s) => (s || '').match(/li|l|g|m/g) || []
const KIND = { g: 'gun', l: 'laser', li: 'lightning', m: 'mortar' }
function load(tag, seed) {
  const f = path.join(dir, `${tag}_m${seed}.json.gz`)
  if (!fs.existsSync(f)) return null
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(f)))
}
function lkind(ld) { const w = parseLd(ld); if (w.includes('l')) return 'laser'; if (w.includes('li')) return 'lightning'; if (w.includes('m')) return 'mortar'; return 'gun' }
function metrics(tr) {
  const slot = tr.slot, F = tr.frames, rec = tr.rec
  const T = rec.timeAlive
  const out = { seed: tr.seed, score: rec.score, kills: rec.kills, alive: T, cause: rec.alive ? 'alive' : rec.cause, killer: rec.killerName, killRange: rec.killRange, hunters: rec.hunters, cubes: rec.cubes, loadout: rec.loadout.join('+') }
  const deaths = tr.deaths.filter((d) => d.id !== slot)
  out.killT = deaths.filter((d) => d.by === slot).map((d) => d.t)
  out.otherDeaths = deaths.filter((d) => d.by !== slot && d.t <= T).length
  const dmgIn = tr.dmg.filter((d) => d[2] === slot), dmgOut = tr.dmg.filter((d) => d[1] === slot && d[2] !== slot)
  const mechIn = dmgIn.filter((d) => d[1] >= 0 && d[1] < 100 && d[1] !== slot), npcIn = dmgIn.filter((d) => d[1] >= 100)
  out.firstContact = Math.min(mechIn.length ? mechIn[0][0] : 1e9, dmgOut.length ? dmgOut[0][0] : 1e9)
  if (out.firstContact > 1e8) out.firstContact = null
  out.firstTaken = mechIn.length ? mechIn[0][0] : null
  out.firstDealt = dmgOut.length ? dmgOut[0][0] : null
  const sum = (a) => a.reduce((s, d) => s + d[3], 0)
  out.dealt = sum(dmgOut); out.takenMech = sum(mechIn); out.takenNpc = sum(npcIn)
  out.dealtPerMin = out.dealt / (T / 60); out.takenPerMin = out.takenMech / (T / 60)
  out.firstKill = out.killT.length ? out.killT[0] : null
  // TTK per victim: first hit -> death, and our damage into it
  const victims = {}
  for (const d of dmgOut) { const v = victims[d[2]] || (victims[d[2]] = { first: d[0], last: d[0], dmg: 0, n: 0 }); v.last = d[0]; v.dmg += d[3]; v.n++ }
  const killed = deaths.filter((d) => d.by === slot)
  out.ttk = killed.map((d) => victims[d.id] ? d.t - victims[d.id].first : null).filter((x) => x !== null)
  out.dmgWasted = Object.entries(victims).filter(([id]) => !killed.some((d) => d.id === +id)).reduce((s, [, v]) => s + v.dmg, 0)
  out.victimsHit = Object.keys(victims).length
  // was the victim a hunter at death?
  const frameAt = (t) => { let lo = 0, hi = F.length - 1; if (!F.length) return null; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m].t <= t) lo = m; else hi = m - 1 } return F[lo] }
  out.killedHunters = killed.filter((d) => { const f = frameAt(d.t); return f && f.hu && f.hu.includes(d.id) }).length
  out.killedTiers = killed.map((d) => (tr.tiers[d.id] || '').replace('squad:', ''))
  // cubes / upgrades / weapons by time
  for (const tt of [30, 60, 90, 120, 180]) { const f = T >= tt ? frameAt(tt) : null; out['cu' + tt] = f ? f.cu : null; out['up' + tt] = f ? f.up : null }
  const firstWith = (pred) => { for (const f of F) if (pred(parseLd(f.ld))) return f.t; return null }
  out.tLaser = firstWith((w) => w.includes('l'))
  out.tSecond = firstWith((w) => w.length >= 2)
  out.tLightning = firstWith((w) => w.includes('li'))
  out.everLaser = out.tLaser !== null
  // fatal fight: streak of mech damage taken with gaps <= 5 s ending at death
  if (!rec.alive && F.length) {
    let i = dmgIn.length - 1, start = T
    const allIn = dmgIn
    while (i >= 0 && (start - allIn[i][0]) <= 5) { start = allIn[i][0]; i-- }
    out.fatalStart = start; out.fatalLen = T - start
    const f0 = frameAt(start - 0.11) || F[0]
    out.fatalHp0 = f0.hp; out.fatalHpf0 = f0.hp / f0.mhp; out.fatalMhp = f0.mhp
    const fatal = allIn.filter((d) => d[0] >= start - 1e-6)
    out.fatalAttackers = new Set(fatal.filter((d) => d[1] < 100).map((d) => d[1])).size
    out.fatalWeapons = {}
    for (const d of fatal) out.fatalWeapons[d[4]] = (out.fatalWeapons[d[4]] || 0) + d[3]
    out.fatalDealt = dmgOut.filter((d) => d[0] >= start - 1e-6).reduce((s, d) => s + d[3], 0)
    out.fatalKills = out.killT.filter((t) => t >= start - 1e-6).length
    const fl = F[F.length - 1]
    out.deathFrame = fl
    out.deathHu = fl.hu ? fl.hu.length : null
    out.deathOutZone = F.slice(-20).some((f) => !f.iz)
    // stuck: commanded move but speed < 1 for >= 1 s within the last 5 s
    let st = 0, stMax = 0
    for (const f of F.filter((f) => f.t >= T - 5)) { const cm = Math.hypot(f.mv[0], f.mv[1]); if (cm > 0.5 && f.v < 1 && f.g) { st += 0.1; stMax = Math.max(stMax, st) } else st = 0 }
    out.deathStuck = stMax >= 1
    // looting just before death: npc/crate damage or cube pickups in the last 5 s
    out.deathLooting = tr.npc.some((d) => d[0] >= T - 5) || tr.cubes.some((c) => c[0] >= T - 5)
    // retreating: distance to the killer growing over the last 3 s (from world snapshots)
    const W = tr.world, kid = rec.killedBy
    if (kid !== null && kid !== undefined) {
      const near = W.filter((w) => w[0] >= T - 3.2)
      const dists = near.map((w) => { const me = w[1].find((q) => q[0] === slot), k = w[1].find((q) => q[0] === kid); return me && k ? Math.hypot(me[1] - k[1], me[2] - k[2]) : null }).filter((x) => x !== null)
      out.deathDistTrend = dists.length >= 2 ? (dists[dists.length - 1] - dists[0]) : null
    }
    // our brain's state in the last 3 s
    if (fl.md !== undefined) {
      const lm = {}
      for (const f of F.filter((f) => f.t >= T - 3)) { const k = f.md + '/' + f.lg; lm[k] = (lm[k] || 0) + 1 }
      out.deathModes = lm
      out.deathMode = fl.md + '/' + fl.lg
      const fm = {}
      for (const f of F.filter((f) => f.t >= start - 0.05)) { const k = f.md; fm[k] = (fm[k] || 0) + 0.1 }
      out.fatalModes = fm
    }
  }
  // simultaneous attackers (mechs that hit us in the last 3 s), time-weighted over frames in contact
  const att = { 0: 0, 1: 0, 2: 0, 3: 0 }
  let j = 0
  const win = []
  // activity classification and movement shares
  const act = { fight: 0, loot: 0, heal: 0, travel: 0, idle: 0 }
  const mov = { stand: 0, walk: 0, boost: 0, air: 0 }
  const distBy = {}            // loadout kind -> [sum, n, list]
  let iO = 0, iI = 0, iN = 0, iC = 0
  let lastOutT = -99, lastInT = -99, lastNpcT = -99, lastCubeT = -99, lastTgt = -1, lastTgtT = -99, lastAtt = -1, lastAttT = -99
  const ins = mechIn, outs = dmgOut
  const npcs = tr.npc, cubes = tr.cubes
  const hits3 = []
  let prevHp = null
  const modes = {}
  let wi = 0
  for (let k = 0; k < F.length; k++) {
    const f = F[k], t = f.t
    while (iO < outs.length && outs[iO][0] <= t) { lastOutT = outs[iO][0]; lastTgt = outs[iO][2]; lastTgtT = lastOutT; iO++ }
    while (iI < ins.length && ins[iI][0] <= t) { lastInT = ins[iI][0]; lastAtt = ins[iI][1]; lastAttT = lastInT; hits3.push(ins[iI]); iI++ }
    while (iN < npcs.length && npcs[iN][0] <= t) { lastNpcT = npcs[iN][0]; iN++ }
    while (iC < cubes.length && cubes[iC][0] <= t) { lastCubeT = cubes[iC][0]; iC++ }
    while (hits3.length && hits3[0][0] < t - 3) hits3.shift()
    const nA = new Set(hits3.map((d) => d[1])).size
    const fighting = t - lastOutT <= 2 || t - lastInT <= 2
    if (fighting) att[Math.min(3, nA)] += 0.1
    const kprev = k >= 10 ? F[k - 10] : null
    const healing = !fighting && kprev && f.hp > kprev.hp && f.hp < f.mhp + 1
    const looting = t - lastNpcT <= 2 || t - lastCubeT <= 1
    const a = fighting ? 'fight' : looting ? 'loot' : healing ? 'heal' : f.v > 1.5 ? 'travel' : 'idle'
    act[a] += 0.1
    if (!f.g) mov.air += 0.1; else if (f.b && f.v > 1.5) mov.boost += 0.1; else if (f.v > 1.5) mov.walk += 0.1; else mov.stand += 0.1
    if (f.md !== undefined) { const key = f.md; modes[key] = (modes[key] || 0) + 0.1 }
  }
  // distance to the engaged opponent from the world snapshots (every 0.5 s)
  {
    let iO2 = 0, iI2 = 0, lt = -1, ltT = -99, la = -1, laT = -99
    for (const w of tr.world) {
      const t = w[0]
      while (iO2 < outs.length && outs[iO2][0] <= t) { lt = outs[iO2][2]; ltT = outs[iO2][0]; iO2++ }
      while (iI2 < ins.length && ins[iI2][0] <= t) { la = ins[iI2][1]; laT = ins[iI2][0]; iI2++ }
      let opp = -1
      if (t - ltT <= 2 && lt < 100) opp = lt; else if (t - laT <= 2 && la < 100) opp = la
      if (opp < 0) continue
      const me = w[1].find((q) => q[0] === slot), o = w[1].find((q) => q[0] === opp)
      if (!me || !o) continue
      const fr = frameAt(t)
      const kd = lkind(fr ? fr.ld : 'g')
      const d = Math.hypot(me[1] - o[1], me[2] - o[2])
      const e = distBy[kd] || (distBy[kd] = [])
      e.push(d)
    }
  }
  // velocity changes during fights (exact-intercept aim misses a target that changes velocity in flight)
  { let n = 0, ch = 0, ch2 = 0
    let iO3 = 0, iI3 = 0, lo = -99, li = -99
    for (let k = 3; k < F.length; k++) {
      const f = F[k], p = F[k - 3], t = f.t
      while (iO3 < outs.length && outs[iO3][0] <= t) { lo = outs[iO3][0]; iO3++ }
      while (iI3 < ins.length && ins[iI3][0] <= t) { li = ins[iI3][0]; iI3++ }
      if (!(t - lo <= 2 || t - li <= 2) || f.vx === undefined) continue
      n++
      const dv = Math.hypot(f.vx - p.vx, f.vy - p.vy)
      if (dv > 4) ch++
      if (dv > 8) ch2++
    }
    out.vchange4 = n ? ch / n : null; out.vchange8 = n ? ch2 / n : null }
  // lightning carriers near us (world snapshots: [id,x,y,z,hp,target,loadout,charging])
  { let near45 = 0, near60 = 0, snaps = 0
    for (const w of tr.world) {
      const me = w[1].find((q) => q[0] === slot); if (!me) continue
      snaps++
      let dmin = 1e9
      for (const q of w[1]) { if (q[0] === slot || !q[6] || !q[6].includes('li')) continue; const d = Math.hypot(q[1] - me[1], q[2] - me[2]); if (d < dmin) dmin = d }
      if (dmin < 45) near45++
      if (dmin < 60) near60++
    }
    out.nearLight45 = near45 * 0.5; out.nearLight60 = near60 * 0.5 }
  out.attackersTime = att
  out.activity = act
  out.movement = mov
  out.modes = modes
  out.distBy = {}
  for (const [k, v] of Object.entries(distBy)) { v.sort((a, b) => a - b); out.distBy[k] = { n: v.length, med: v[v.length >> 1], p25: v[Math.floor(v.length * 0.25)], p75: v[Math.floor(v.length * 0.75)], mean: v.reduce((s, x) => s + x, 0) / v.length } }
  // hit rates
  const myShots = tr.shots.filter((s) => s[1] === slot && s[2] < 100)
  const atMe = tr.shots.filter((s) => s[2] === slot)
  const band = (L, lo, hi) => { const q = L.filter((s) => s[3] >= lo && s[3] < hi); return [q.length, q.filter((s) => s[4]).length] }
  out.gunShots = myShots.length; out.gunHits = myShots.filter((s) => s[4]).length
  out.gunBands = [[0, 75], [75, 100], [100, 130], [130, 1e9]].map(([a, b]) => band(myShots, a, b))
  out.shotsAtMe = atMe.length; out.hitsOnMe = atMe.filter((s) => s[4]).length
  out.atMeBands = [[0, 75], [75, 100], [100, 130], [130, 1e9]].map(([a, b]) => band(atMe, a, b))
  out.shotRangeMed = myShots.length ? myShots.map((s) => s[3]).sort((a, b) => a - b)[myShots.length >> 1] : null
  const lz = tr.events.filter((e) => e.e === 'laser' && e.id === slot)
  out.laserShots = lz.length; out.laserMechHits = lz.filter((e) => e.mh > 0).length; out.laserAnyHits = lz.filter((e) => e.nh > 0).length
  out.laserFrac = lz.length ? lz.reduce((s, e) => s + e.frac, 0) / lz.length : null
  out.zaps = tr.zaps
  out.dmgByWeapon = {}
  for (const d of dmgOut) out.dmgByWeapon[d[4]] = (out.dmgByWeapon[d[4]] || 0) + d[3]
  out.dmgInByWeapon = {}
  for (const d of mechIn) out.dmgInByWeapon[d[4]] = (out.dmgInByWeapon[d[4]] || 0) + d[3]
  out.npcKills = tr.npc.filter((d) => d[5] && d[1] === 'n').length; out.crateKills = tr.npc.filter((d) => d[5] && d[1] === 'c').length
  out.cubePickups = tr.cubes.length
  out.takes = tr.events.filter((e) => e.e === 'take' && e.id === slot).map((e) => [Math.round(e.t), e.kind])
  out.upgrades = tr.events.filter((e) => e.e === 'upgrade' && e.id === slot).map((e) => e.up)
  // hunters over time: mean hunters while alive
  out.huMean = F.length && F[0].hu ? F.reduce((s, f) => s + f.hu.length, 0) / F.length : null
  return out
}
const all = {}
for (const tag of tags) {
  all[tag] = []
  for (let seed = 1; seed <= 21; seed++) { const tr = load(tag, seed); if (tr) all[tag].push(metrics(tr)) }
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 0))
// aggregate printout
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN
const med = (a) => { const b = a.filter((x) => x !== null && x !== undefined).sort((p, q) => p - q); return b.length ? b[b.length >> 1] : NaN }
const f1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? '-' : (Math.round(x * 100) / 100).toString())
const rows = []
const add = (name, fn) => rows.push([name, ...tags.map((t) => f1(fn(all[t])))])
add('n', (M) => M.length)
add('score', (M) => mean(M.map((m) => m.score)))
add('kills', (M) => mean(M.map((m) => m.kills)))
add('time alive', (M) => mean(M.map((m) => m.alive)))
add('kills/min alive', (M) => mean(M.map((m) => m.kills)) / mean(M.map((m) => m.alive)) * 60)
add('first contact s (med)', (M) => med(M.map((m) => m.firstContact)))
add('first dealt s (med)', (M) => med(M.map((m) => m.firstDealt)))
add('first kill s (med)', (M) => med(M.map((m) => m.firstKill)))
add('dealt/min', (M) => mean(M.map((m) => m.dealt)) / mean(M.map((m) => m.alive)) * 60)
add('taken mech/min', (M) => mean(M.map((m) => m.takenMech)) / mean(M.map((m) => m.alive)) * 60)
add('taken npc total', (M) => mean(M.map((m) => m.takenNpc)))
add('dealt total', (M) => mean(M.map((m) => m.dealt)))
add('taken mech total', (M) => mean(M.map((m) => m.takenMech)))
add('dealt/taken', (M) => mean(M.map((m) => m.dealt)) / mean(M.map((m) => m.takenMech)))
add('wasted dmg (no kill)', (M) => mean(M.map((m) => m.dmgWasted)))
add('TTK med s', (M) => med(M.flatMap((m) => m.ttk)))
add('killed hunters share', (M) => M.reduce((s, m) => s + m.killedHunters, 0) / Math.max(1, M.reduce((s, m) => s + m.kills, 0)))
for (const tt of [30, 60, 120, 180]) add(`alive at ${tt}s`, (M) => M.filter((m) => m.alive >= tt).length / M.length)
for (const tt of [60, 120]) add(`cubes@${tt} (alive)`, (M) => mean(M.filter((m) => m['cu' + tt] !== null).map((m) => m['cu' + tt])))
for (const tt of [60, 120]) add(`upgrades@${tt} (alive)`, (M) => mean(M.filter((m) => m['up' + tt] !== null).map((m) => m['up' + tt])))
add('cubes at death', (M) => mean(M.map((m) => m.cubes)))
add('ever laser', (M) => M.filter((m) => m.everLaser).length / M.length)
add('t laser med', (M) => med(M.map((m) => m.tLaser)))
add('t 2nd weapon med', (M) => med(M.map((m) => m.tSecond)))
add('npc kills', (M) => mean(M.map((m) => m.npcKills)))
add('crate kills', (M) => mean(M.map((m) => m.crateKills)))
add('gun hit rate', (M) => M.reduce((s, m) => s + m.gunHits, 0) / M.reduce((s, m) => s + m.gunShots, 0))
add('gun shots/min', (M) => mean(M.map((m) => m.gunShots)) / mean(M.map((m) => m.alive)) * 60)
add('gun shot range med', (M) => med(M.map((m) => m.shotRangeMed)))
for (let b = 0; b < 4; b++) add(`gun hit ${['<75', '75-100', '100-130', '130+'][b]}`, (M) => { const n = M.reduce((s, m) => s + m.gunBands[b][0], 0); return n ? M.reduce((s, m) => s + m.gunBands[b][1], 0) / n : NaN })
for (let b = 0; b < 4; b++) add(`  shots ${['<75', '75-100', '100-130', '130+'][b]}/match`, (M) => mean(M.map((m) => m.gunBands[b][0])))
add('vel change >4 m/s in 0.3 s (fight)', (M) => mean(M.filter((m) => m.vchange4 !== null).map((m) => m.vchange4)))
add('vel change >8 m/s in 0.3 s (fight)', (M) => mean(M.filter((m) => m.vchange8 !== null).map((m) => m.vchange8)))
add('s within 45 m of lightning /min', (M) => mean(M.map((m) => m.nearLight45)) / mean(M.map((m) => m.alive)) * 60)
add('s within 60 m of lightning /min', (M) => mean(M.map((m) => m.nearLight60)) / mean(M.map((m) => m.alive)) * 60)
add('enemy gun shots at us /min', (M) => mean(M.map((m) => m.shotsAtMe)) / mean(M.map((m) => m.alive)) * 60)
add('enemy gun hit rate on us', (M) => M.reduce((s, m) => s + m.hitsOnMe, 0) / M.reduce((s, m) => s + m.shotsAtMe, 0))
for (let b = 0; b < 4; b++) add(`  on us ${['<75', '75-100', '100-130', '130+'][b]}`, (M) => { const n = M.reduce((s, m) => s + m.atMeBands[b][0], 0); return n ? M.reduce((s, m) => s + m.atMeBands[b][1], 0) / n : NaN })
add('laser shots/match', (M) => mean(M.map((m) => m.laserShots)))
add('laser mech-hit rate', (M) => M.reduce((s, m) => s + m.laserMechHits, 0) / Math.max(1, M.reduce((s, m) => s + m.laserShots, 0)))
add('laser mean charge frac', (M) => mean(M.filter((m) => m.laserFrac !== null).map((m) => m.laserFrac)))
add('zaps/match', (M) => mean(M.map((m) => m.zaps)))
for (const w of ['gun', 'laser', 'lightning', 'mortar']) add(`dealt by ${w}/match`, (M) => mean(M.map((m) => m.dmgByWeapon[w] || 0)))
for (const w of ['gun', 'laser', 'lightning', 'mortar']) add(`taken from ${w}/match`, (M) => mean(M.map((m) => m.dmgInByWeapon[w] || 0)))
for (const k of ['fight', 'loot', 'heal', 'travel', 'idle']) add(`time ${k} share`, (M) => M.reduce((s, m) => s + m.activity[k], 0) / M.reduce((s, m) => s + Object.values(m.activity).reduce((a, b) => a + b, 0), 0))
for (const k of ['stand', 'walk', 'boost', 'air']) add(`move ${k} share`, (M) => M.reduce((s, m) => s + m.movement[k], 0) / M.reduce((s, m) => s + Object.values(m.movement).reduce((a, b) => a + b, 0), 0))
for (const k of [0, 1, 2, 3]) add(`attackers=${k}${k === 3 ? '+' : ''} share of fight`, (M) => M.reduce((s, m) => s + m.attackersTime[k], 0) / M.reduce((s, m) => s + Object.values(m.attackersTime).reduce((a, b) => a + b, 0), 0))
for (const k of ['gun', 'laser', 'lightning']) add(`dist to opp med (${k})`, (M) => med(M.flatMap((m) => (m.distBy[k] ? [m.distBy[k].med] : []))))
for (const k of ['gun', 'laser', 'lightning']) add(`  fight samples (${k})`, (M) => mean(M.map((m) => (m.distBy[k] ? m.distBy[k].n * 0.5 : 0))))
add('fatal fight hp0 frac', (M) => mean(M.filter((m) => m.fatalHpf0 !== undefined).map((m) => m.fatalHpf0)))
add('fatal fight len s', (M) => mean(M.filter((m) => m.fatalLen !== undefined).map((m) => m.fatalLen)))
add('fatal attackers', (M) => mean(M.filter((m) => m.fatalAttackers !== undefined).map((m) => m.fatalAttackers)))
add('fatal dealt', (M) => mean(M.filter((m) => m.fatalDealt !== undefined).map((m) => m.fatalDealt)))
add('fatal kills', (M) => mean(M.filter((m) => m.fatalKills !== undefined).map((m) => m.fatalKills)))
add('hunters at death', (M) => mean(M.filter((m) => m.deathHu !== null && m.deathHu !== undefined).map((m) => m.deathHu)))
add('mean hunters alive', (M) => mean(M.filter((m) => m.huMean !== null).map((m) => m.huMean)))
add('death: retreating (dist up >5m/3s)', (M) => M.filter((m) => m.deathDistTrend > 5).length / M.length)
add('death: looting', (M) => M.filter((m) => m.deathLooting).length / M.length)
add('death: stuck', (M) => M.filter((m) => m.deathStuck).length / M.length)
add('death: out of zone', (M) => M.filter((m) => m.deathOutZone).length / M.length)
add('kill range med', (M) => med(M.map((m) => m.killRange)))
const w0 = Math.max(...rows.map((r) => r[0].length))
console.log(['metric'.padEnd(w0), ...tags.map((t) => t.slice(0, 12).padStart(12))].join(' '))
for (const r of rows) console.log([r[0].padEnd(w0), ...r.slice(1).map((v) => v.padStart(12))].join(' '))
// cause tables
for (const tag of tags) {
  const c = {}
  for (const m of all[tag]) { const k = `${m.cause}:${(m.killer || '').replace('squad:', '')}`; c[k] = (c[k] || 0) + 1 }
  console.log(tag, 'deaths', JSON.stringify(c))
  const ld = {}
  for (const m of all[tag]) ld[m.loadout] = (ld[m.loadout] || 0) + 1
  console.log(tag, 'loadout at death', JSON.stringify(ld))
}
