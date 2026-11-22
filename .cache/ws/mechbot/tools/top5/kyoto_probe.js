// Black-box behaviour probe for one traced slot (our own analysis code; reads sim/run.js --trace files only).
// node kyoto_probe.js <traceDir> <tag> [seedFrom seedTo]
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, tag, a0, a1] = process.argv.slice(2)
const S0 = +(a0 || 1), S1 = +(a1 || 6)
const pct = (a, q) => { const b = a.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).sort((p, r) => p - r); return b.length ? b[Math.min(b.length - 1, Math.floor(q * b.length))] : null }
const r1 = (x) => (x === null || x === undefined ? '-' : Math.round(x * 10) / 10)
const pooled = { laserDist: [], gunDist: [], ltDist: [], fightNearest: { g: [], gl: [], gli: [] }, retreatHp: [], approachHp: [], boostStartEn: [], boostStopEn: [], laserFrac: [], laserLethalPartial: 0, laserPartial: 0, flipsPerS: [], chargeBoost: [0, 0], fireBoost: [0, 0], underFireBoost: [0, 0], idleBoost: [0, 0], ze: [], firstMechShot: [], firstMechDmg: [], firstFarm: [], spawnDisp30: [], farmShare60: [], rows: [] }
for (let seed = S0; seed <= S1; seed++) {
  const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
  const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)))
  const slot = tr.slot, F = tr.frames, W = tr.world, rec = tr.rec, T = rec.timeAlive
  const at = (t) => { let lo = 0, hi = F.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m].t <= t) lo = m; else hi = m - 1 } return F[lo] }
  const dOut = tr.dmg.filter((d) => d[1] === slot && d[2] !== slot), dIn = tr.dmg.filter((d) => d[2] === slot && d[1] >= 0 && d[1] < 100 && d[1] !== slot)
  // opening
  const myGun = tr.shots.filter((s) => s[1] === slot && s[2] >= 0 && s[2] < 100)
  const myLz = tr.events.filter((e) => e.e === 'laser' && e.id === slot)
  const firstShot = Math.min(myGun.length ? myGun[0][0] : 1e9, ...myLz.filter((e) => e.mh > 0).map((e) => e.t), dOut.length ? dOut[0][0] : 1e9)
  pooled.firstMechShot.push(firstShot < 1e8 ? firstShot : null)
  pooled.firstMechDmg.push(dOut.length ? dOut[0][0] : null)
  const npcMe = tr.npc
  pooled.firstFarm.push(npcMe.length ? npcMe[0][0] : null)
  const f30 = at(Math.min(30, T)), f0 = F[0]
  pooled.spawnDisp30.push(Math.hypot(f30.x - f0.x, f30.y - f0.y))
  // farming share of the first 60 s: frames with npc/crate damage dealt in the last 2 s or a cube pickup in the last 1 s
  let farm60 = 0, n60 = 0
  for (const fr of F) { if (fr.t > 60) break; n60++; if (npcMe.some((d) => d[0] <= fr.t && d[0] > fr.t - 2) || tr.cubes.some((c) => c[0] <= fr.t && c[0] > fr.t - 1)) farm60++ }
  pooled.farmShare60.push(n60 ? farm60 / n60 : null)
  // economy timeline
  const snap = {}
  for (const tt of [30, 60, 90, 120, 180]) { if (T >= tt) { const fr = at(tt); snap[tt] = `${fr.cu}c/${fr.up}u/${fr.ld}` } else snap[tt] = 'dead' }
  const ups = tr.events.filter((e) => e.e === 'upgrade' && e.id === slot).map((e) => `${Math.round(e.t)}:${e.up}`)
  const takes = tr.events.filter((e) => e.e === 'take' && e.id === slot).map((e) => `${Math.round(e.t)}:${e.kind}`)
  // weapon damage distances
  for (const d of dOut) { (d[4] === 'laser' ? pooled.laserDist : d[4] === 'gun' ? pooled.gunDist : d[4] === 'lightning' ? pooled.ltDist : []).push(d[5]) }
  // fights: snapshots with mech damage dealt/taken within 2 s; nearest enemy distance by loadout
  let iO = 0, iI = 0, lo = -99, li = -99, lastAtt = -1
  const snapsFight = []
  for (const w of W) {
    const t = w[0]
    while (iO < dOut.length && dOut[iO][0] <= t) { lo = dOut[iO][0]; iO++ }
    while (iI < dIn.length && dIn[iI][0] <= t) { li = dIn[iI][0]; lastAtt = dIn[iI][1]; iI++ }
    const me = w[1].find((q) => q[0] === slot); if (!me) continue
    const others = w[1].filter((q) => q[0] !== slot).map((q) => ({ id: q[0], d: Math.hypot(q[1] - me[1], q[2] - me[2]), x: q[1], y: q[2] }))
    others.sort((p, q) => p.d - q.d)
    const fr = at(t)
    if (t - lo <= 2 || t - li <= 2) {
      const k = fr.ld.includes('l') && !fr.ld.includes('li') ? 'gl' : fr.ld.includes('li') ? 'gli' : 'g'
      if (others[0]) pooled.fightNearest[k].push(others[0].d)
    }
    snapsFight.push({ t, me, others, hurt: t - li <= 3, lastAtt, fr })
  }
  // retreat / approach episodes: while hurt in the last 3 s, radial speed to the last attacker over 1 s
  for (let k = 2; k < snapsFight.length; k++) {
    const s = snapsFight[k], p = snapsFight[k - 2]
    if (!s.hurt || s.lastAtt < 0) continue
    const a = s.others.find((o) => o.id === s.lastAtt), ap = p.others.find((o) => o.id === s.lastAtt)
    if (!a || !ap) continue
    const vr = (a.d - ap.d) / (s.t - p.t)
    const hpf = s.fr.hp / s.fr.mhp
    if (vr > 3) pooled.retreatHp.push(hpf); else if (vr < -3) pooled.approachHp.push(hpf)
  }
  // boost behaviour
  for (let k = 1; k < F.length; k++) {
    const fr = F[k], pr = F[k - 1]
    if (fr.b && !pr.b) pooled.boostStartEn.push(pr.en)
    if (!fr.b && pr.b) pooled.boostStopEn.push(pr.en)
    const hurt = dIn.some((d) => d[0] <= fr.t && d[0] > fr.t - 2)
    const moving = Math.hypot(fr.mv[0], fr.mv[1]) > 0.3
    if (fr.ch) { pooled.chargeBoost[0]++; if (fr.b) pooled.chargeBoost[1]++ }
    if (fr.ch && hurt) { pooled.fireBoost[0]++; if (fr.b) pooled.fireBoost[1]++ }
    if (!fr.ch && hurt && moving) { pooled.underFireBoost[0]++; if (fr.b) pooled.underFireBoost[1]++ }
    if (!hurt && !(dOut.some((d) => d[0] <= fr.t && d[0] > fr.t - 2))) { pooled.idleBoost[0]++; if (fr.b) pooled.idleBoost[1]++ }
    pooled.ze.push(fr.ze)
  }
  // strafe flips: commanded-move direction reversals (> 120 deg) per second while fighting
  { let flips = 0, ft = 0, prev = null
    for (const fr of F) {
      const fighting = dOut.some((d) => d[0] <= fr.t && d[0] > fr.t - 2) || dIn.some((d) => d[0] <= fr.t && d[0] > fr.t - 2)
      if (!fighting) { prev = null; continue }
      ft += 0.1
      const m = Math.hypot(fr.mv[0], fr.mv[1]); if (m < 0.3) continue
      const u = [fr.mv[0] / m, fr.mv[1] / m]
      if (prev && u[0] * prev[0] + u[1] * prev[1] < -0.5) flips++
      prev = u
    }
    pooled.flipsPerS.push(ft > 5 ? flips / ft : null) }
  // laser releases
  for (const e of myLz) { pooled.laserFrac.push(e.frac); if (e.frac < 0.99) { pooled.laserPartial++; const kill = tr.deaths.some((d) => d.by === slot && Math.abs(d.t - e.t) < 0.15 && d.weapon === 'laser'); if (kill) pooled.laserLethalPartial++ } }
  // death
  let fatal = null
  if (!rec.alive) {
    let i = dIn.length - 1, start = T
    while (i >= 0 && start - dIn[i][0] <= 5) { start = dIn[i][0]; i-- }
    const fs0 = at(start - 0.11)
    const attackers = new Set(dIn.filter((d) => d[0] >= start - 1e-6).map((d) => d[1])).size
    const lastW = W[W.length - 1], me = lastW[1].find((q) => q[0] === slot)
    const alive = lastW[1].length
    fatal = { start: r1(start), hp0: r1(fs0.hp / fs0.mhp), attackers, alive, hunters: (F[F.length - 1].hu || []).length, ze: F[F.length - 1].ze }
  }
  const killsByW = {}
  for (const d of tr.deaths.filter((d) => d.by === slot)) killsByW[d.weapon] = (killsByW[d.weapon] || 0) + 1
  pooled.rows.push({ seed, score: rec.score, kills: rec.kills, alive: rec.timeAlive, cause: `${rec.cause}:${(rec.killerName || '').replace('squad:', '')}@${rec.killRange}m`, firstShot: r1(firstShot < 1e8 ? firstShot : null), firstFarm: r1(npcMe.length ? npcMe[0][0] : null), disp30: r1(Math.hypot(f30.x - f0.x, f30.y - f0.y)), snap, ups, takes, killsByW, fatal, cubesEnd: rec.cubes, killT: tr.deaths.filter((d) => d.by === slot).map((d) => Math.round(d.t)) })
}
console.log(`== ${tag}: per match`)
for (const r of pooled.rows) {
  console.log(`seed ${r.seed}: score ${r.score} kills ${r.kills} alive ${r.alive}s died ${r.cause}; first mech shot ${r.firstShot}s, first farm hit ${r.firstFarm}s, moved ${r.disp30} m by 30 s`)
  console.log(`   economy 30/60/90/120/180: ${[30, 60, 90, 120, 180].map((t) => r.snap[t]).join('  ')}; cubes at end ${r.cubesEnd}`)
  console.log(`   takes ${r.takes.join(' ')} | upgrades ${r.ups.join(' ')}`)
  console.log(`   kills at ${r.killT.join(',')} by ${JSON.stringify(r.killsByW)} | fatal fight from ${r.fatal && r.fatal.start}s at hp ${r.fatal && r.fatal.hp0}, attackers ${r.fatal && r.fatal.attackers}, alive ${r.fatal && r.fatal.alive}, hunters ${r.fatal && r.fatal.hunters}, zone margin ${r.fatal && r.fatal.ze}`)
}
const q = (a) => `p25 ${r1(pct(a, 0.25))} med ${r1(pct(a, 0.5))} p75 ${r1(pct(a, 0.75))} (n ${a.length})`
console.log(`== ${tag}: pooled`)
console.log('first mech shot s:', q(pooled.firstMechShot), '| first mech damage s:', q(pooled.firstMechDmg), '| first farm hit s:', q(pooled.firstFarm))
console.log('displacement from spawn at 30 s (m):', q(pooled.spawnDisp30), '| farming share of first 60 s:', q(pooled.farmShare60))
console.log('hit distance m  laser:', q(pooled.laserDist), ' gun:', q(pooled.gunDist), ' lightning:', q(pooled.ltDist))
for (const k of ['g', 'gl', 'gli']) console.log(`nearest enemy in fights, loadout ${k}:`, q(pooled.fightNearest[k]))
console.log('hp fraction while retreating from last attacker (>3 m/s away):', q(pooled.retreatHp), '| while closing (>3 m/s in):', q(pooled.approachHp))
console.log('retreat samples with hp<0.4:', pooled.retreatHp.filter((x) => x < 0.4).length, 'of', pooled.retreatHp.length, '; closing samples with hp<0.4:', pooled.approachHp.filter((x) => x < 0.4).length, 'of', pooled.approachHp.length)
console.log('boost start energy:', q(pooled.boostStartEn), '| boost stop energy:', q(pooled.boostStopEn))
const sh = (a) => `${a[0] ? r1(100 * a[1] / a[0]) : '-'}% of ${a[0]} frames`
console.log('boost while charging laser:', sh(pooled.chargeBoost), '| while charging and hit in last 2 s:', sh(pooled.fireBoost), '| moving, hit in last 2 s, not charging:', sh(pooled.underFireBoost), '| calm (no damage either way 2 s):', sh(pooled.idleBoost))
console.log('move-direction flips per s in fights:', q(pooled.flipsPerS))
console.log('laser releases:', pooled.laserFrac.length, 'charge frac', q(pooled.laserFrac), 'partial', pooled.laserPartial, 'partial that killed', pooled.laserLethalPartial)
console.log('zone margin m (frames):', q(pooled.ze), 'min', r1(Math.min(...pooled.ze)))
