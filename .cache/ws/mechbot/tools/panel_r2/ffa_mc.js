// Panel R2: Monte-Carlo model of a 16-mech free-for-all under (16 - place) scoring.
// A deliberately small model: discs on a plane, measured line-of-fire probabilities (map_stats.js), config HP / gun /
// regen / zone numbers. It answers ORDER-OF-MAGNITUDE questions about aggression thresholds; it is not the game.
// Run: node ffa_mc.js [matches]      (see the experiment list at the bottom)
const HP = 1400, DPS = 107, REGEN = 45, REGEN_DELAY = 5, WALK = 11.7, GUN_RANGE = 230, VIS = 200, NEAR = 45, SOUND = 320, MEM = 5
const ZR = [560, 380, 240, 140, 70, 25, 0], ZT0 = [60, 155, 230, 295, 350, 390], ZT1 = [110, 195, 265, 325, 375, 415], ZD = [20, 35, 60, 100, 160, 260]
const DT = 0.5, N = 16
// measured on the real map (map_stats.js): P(line of fire), P(sight) for two ground mechs
const LB = [30, 45, 60, 80, 100, 130, 160, 200, 230, 320], LF = [0.99, 0.94, 0.86, 0.76, 0.67, 0.58, 0.48, 0.40, 0.29, 0.19], LS = [0.82, 0.70, 0.58, 0.48, 0.38, 0.30, 0.23, 0.16, 0.10, 0.07]
function band(d) { for (let k = 0; k < LB.length; k++) if (d < LB[k]) return k; return LB.length - 1 }
// gun hit probability by range: house-bot hit rate vs flight time, rescaled to the 252 m/s bullet (notes/housebot_model.json)
function q(d) { return d < 76 ? 0.97 : d < 101 ? 0.85 : d < 126 ? 0.65 : d < 151 ? 0.45 : 0.25 }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const DEF = {
  hide: 0.35,          // multiplier on line-of-fire probability for a mech that is using cover (evading / healing / stealth)
  tauLos: 4,           // s, mean lifetime of a line-of-fire state between two moving mechs
  hunterHeal: 0.35,    // hunters break off below this hp fraction ...
  hunterResume: 0.8,   // ... and come back above this
  seekSound: 1,        // probability an idle hunter walks toward gunfire it hears
  lootRate: 1 / 35,    // cubes per idle second from crates/drones, to a cap
  lootCap: 4,
  killCubes: 0.5,      // share of a victim's cubes (+2) the killer collects
  jink: 0.6,           // our hit-probability multiplier on enemy guns beyond 78 m (dodging a linear lead)
  ourSkill: 1.0,       // our dps multiplier relative to the field
  react: 1.0,          // s before a hunter answers an attacker it was not looking at
  bandLo: 70, bandHi: 110, // hunters' stand-off band (m)
  chase: 1.0,          // hunters' speed multiplier while closing on a target (boost, shortcuts)
  lethal: 1.0,         // multiplier on every gun's damage (calibration knob: 0.5 reproduces the replay's death timeline)
}
function maxHp(c) { return HP * (1 + 0.04 * Math.min(c, 10)) }
function dmgMul(c) { return 1 + 0.04 * Math.min(c, 10) }
// policy for bot 0 ("us"):  {kind:'hunter'} or {kind:'th', th:[>=9, 5-8, 4, 3, 2], third:bool, first:bool, fightBelow:k}
function thr(pol, alive) { const t = pol.th; return alive >= 9 ? t[0] : alive >= 5 ? t[1] : alive === 4 ? t[2] : alive === 3 ? t[3] : t[4] }
export function match(seed, pol, par = DEF, field = null) {
  const R = mulberry(seed)
  const x = new Float64Array(N), y = new Float64Array(N), hp = new Float64Array(N), cub = new Float64Array(N), last = new Float64Array(N).fill(-99)
  const tgt = new Int32Array(N).fill(-1), alive = new Uint8Array(N).fill(1), flee = new Uint8Array(N), yaw = new Float64Array(N), hiding = new Uint8Array(N)
  const seen = new Float64Array(N * N).fill(-99), fl = new Uint8Array(N * N), sl = new Uint8Array(N * N), hitBy = new Float64Array(N * N).fill(-99)
  const heardT = new Float64Array(N).fill(-99), heardX = new Float64Array(N), heardY = new Float64Array(N), gx = new Float64Array(N), gy = new Float64Array(N)
  const firing = new Uint8Array(N), deathT = new Float64Array(N).fill(-1), place = new Int32Array(N), kills = new Int32Array(N), dmgIn = new Float64Array(N)
  const kind = []; for (let i = 0; i < N; i++) kind.push(i === 0 ? pol : (field && field[i] ? field[i] : { kind: 'hunter' }))
  // spawns: inside 0.8 * 560 m, at least 130 m apart
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 500; k++) {
      const a = R() * 6.2832, r = 448 * Math.sqrt(R()); x[i] = r * Math.cos(a); y[i] = r * Math.sin(a)
      let ok = true; for (let j = 0; j < i; j++) if (Math.hypot(x[i] - x[j], y[i] - y[j]) < 130) { ok = false; break }
      if (ok) break
    }
    hp[i] = HP; gx[i] = x[i]; gy[i] = y[i]; yaw[i] = R() * 6.2832
  }
  // zone centres
  const zc = [[0, 0]]; for (let k = 1; k < ZR.length; k++) { const a = R() * 6.2832, r = (ZR[k - 1] - ZR[k]) * Math.sqrt(R()); zc.push([zc[k - 1][0] + r * Math.cos(a), zc[k - 1][1] + r * Math.sin(a)]) }
  let nAlive = N, ourScore = -1, t = 0
  const stats = { firstShotT: -1, dmgDealt: 0, dmgTaken: 0 }
  for (let step = 0; step < 1000 && nAlive > 1; step++, t += DT) {
    // zone now / next
    let ph = 0; while (ph < 6 && t >= ZT1[ph]) ph++
    let zx, zy, zr, nx, ny, nr, zdps
    if (ph >= 6) { zx = zc[6][0]; zy = zc[6][1]; zr = 0; nx = zx; ny = zy; nr = 0; zdps = 260 } else {
      const u = t <= ZT0[ph] ? 0 : (t - ZT0[ph]) / (ZT1[ph] - ZT0[ph])
      zx = zc[ph][0] + (zc[ph + 1][0] - zc[ph][0]) * u; zy = zc[ph][1] + (zc[ph + 1][1] - zc[ph][1]) * u; zr = ZR[ph] + (ZR[ph + 1] - ZR[ph]) * u
      nx = zc[ph + 1][0]; ny = zc[ph + 1][1]; nr = ZR[ph + 1]; zdps = ZD[ph]
    }
    // line-of-fire / sight states
    for (let i = 0; i < N; i++) if (alive[i]) for (let j = i + 1; j < N; j++) if (alive[j]) {
      const d = Math.hypot(x[i] - x[j], y[i] - y[j]), k = i * N + j
      if (d > 330) { fl[k] = 0; sl[k] = 0; continue }
      if (R() < DT / par.tauLos || (d < 25 && !fl[k])) {
        const b = band(d); let h = 1
        if (d > 25) { const f = Math.min(1, (d - 25) / 35); if (hiding[i]) h *= 1 - (1 - par.hide) * f; if (hiding[j]) h *= 1 - (1 - par.hide) * f }
        fl[k] = R() < LF[b] * h ? 1 : 0; sl[k] = fl[k] && R() < LS[b] / LF[b] ? 1 : 0
        if (d < 25) sl[k] = fl[k]
      }
      fl[j * N + i] = fl[k]; sl[j * N + i] = sl[k]
    }
    // perception: who is seen now
    for (let i = 0; i < N; i++) if (alive[i]) for (let j = 0; j < N; j++) if (j !== i && alive[j] && sl[i * N + j]) {
      const dx = x[j] - x[i], dy = y[j] - y[i], d = Math.hypot(dx, dy)
      if (d > VIS) continue
      let da = Math.atan2(dy, dx) - yaw[i]; da = Math.atan2(Math.sin(da), Math.cos(da))
      const scan = kind[i].kind === 'hunter' ? 0.12 : 0.35      // chance per tick to notice a visible mech outside the wedge (torso sweep)
      if (d <= NEAR || Math.abs(da) <= 1.047 || t - hitBy[i * N + j] < 2 || R() < scan) seen[i * N + j] = t
    }
    // decisions
    firing.fill(0)
    for (let i = 0; i < N; i++) if (alive[i]) {
      const mh = maxHp(cub[i]), hf = hp[i] / mh, K = kind[i]
      // attackers = mechs that damaged me in the last 2 s
      let topAtt = -1, nAtt = 0
      for (let j = 0; j < N; j++) if (alive[j] && t - hitBy[i * N + j] < 2) { nAtt++; if (topAtt < 0 || hitBy[i * N + j] > hitBy[i * N + topAtt]) topAtt = j }
      // visible candidates
      let best = -1, bestD = 1e9, nearAny = 1e9
      for (let j = 0; j < N; j++) if (j !== i && alive[j] && t - seen[i * N + j] <= MEM) { const d = Math.hypot(x[j] - x[i], y[j] - y[i]); if (d < bestD) { bestD = d; best = j } }
      const toward = (px, py, s) => { const d = Math.hypot(px - x[i], py - y[i]) || 1; gx[i] = x[i] + (px - x[i]) / d * s; gy[i] = y[i] + (py - y[i]) / d * s }
      const away = (px, py, s) => { const d = Math.hypot(px - x[i], py - y[i]) || 1; gx[i] = x[i] - (px - x[i]) / d * s; gy[i] = y[i] - (py - y[i]) / d * s }
      hiding[i] = 0
      if (K.kind === 'hunter') {
        if (flee[i]) { if (hf >= par.hunterResume || (nAtt === 0 && t - last[i] > 12)) flee[i] = 0 } else if (hf < par.hunterHeal && nAtt > 0) flee[i] = 1
        if (flee[i]) {
          hiding[i] = 1; tgt[i] = topAtt
          if (topAtt >= 0) { away(x[topAtt], y[topAtt], WALK * DT); if (fl[i * N + topAtt]) firing[i] = 1 } else if (best >= 0) away(x[best], y[best], WALK * DT)
        } else if (topAtt >= 0 && (tgt[i] < 0 || !alive[tgt[i]] || t - seen[i * N + tgt[i]] > 1) && t - hitBy[i * N + topAtt] >= 0 && t - seen[i * N + topAtt] <= MEM) { tgt[i] = topAtt }
        if (!flee[i]) {
          if (tgt[i] >= 0 && (!alive[tgt[i]] || t - seen[i * N + tgt[i]] > MEM)) tgt[i] = -1
          if (tgt[i] < 0 && best >= 0) tgt[i] = best
          else if (tgt[i] >= 0 && best >= 0 && best !== tgt[i] && bestD < 0.7 * Math.hypot(x[tgt[i]] - x[i], y[tgt[i]] - y[i])) tgt[i] = best
          if (tgt[i] >= 0) {
            const j = tgt[i], d = Math.hypot(x[j] - x[i], y[j] - y[i])
            if (d > par.bandHi) toward(x[j], y[j], WALK * DT * par.chase); else if (d < par.bandLo) away(x[j], y[j], WALK * DT * 0.5); else { gx[i] = x[i]; gy[i] = y[i] }
            if (fl[i * N + j] && d <= GUN_RANGE) firing[i] = 1
          } else if (t - heardT[i] < 10 && R() < par.seekSound) toward(heardX[i], heardY[i], WALK * DT)
          else { if (cub[i] < par.lootCap && R() < par.lootRate * DT) { cub[i]++; hp[i] += HP * 0.04 } toward(nx + (R() - 0.5) * nr, ny + (R() - 0.5) * nr, WALK * DT * 0.6) }
        }
      } else {
        // threshold policy
        const th = thr(K, nAlive)
        let eng = -1, engD = 0
        for (let j = 0; j < N; j++) if (j !== i && alive[j] && t - seen[i * N + j] <= 1) {
          const d = Math.hypot(x[j] - x[i], y[j] - y[i]); if (d > GUN_RANGE) continue
          const jk = d > 78 ? par.jink : 1
          const b = DPS * par.ourSkill * dmgMul(cub[i]) * q(d), a = DPS * dmgMul(cub[j]) * q(d) * jk
          const Pr = (hp[i] * b) / (hp[j] * a)
          // isolation: nobody else known within 120 m of us
          let iso = true; for (let m = 0; m < N; m++) if (m !== i && m !== j && alive[m] && t - seen[i * N + m] <= MEM && Math.hypot(x[m] - x[i], y[m] - y[i]) < 120) iso = false
          const busy = tgt[j] >= 0 && tgt[j] !== i && firing[j] !== undefined && t - last[j] < 2      // it is fighting someone else
          let ok = (Pr >= th && iso && hf >= 0.6) || hp[j] <= 300
          if (K.third && busy && hp[j] <= 0.5 * maxHp(cub[j]) && d <= 140 && hf >= 0.6) ok = true
          if (K.first && tgt[j] === i && d < 140 && Pr >= Math.min(th, K.firstTh || 1)) ok = true         // it is coming for us anyway: hit first
          if (ok && (eng < 0 || hp[j] < hp[eng])) { eng = j; engD = d }
        }
        if (eng < 0 && topAtt >= 0 && K.cornered !== false) {
          // attacked and not engaging by choice: answer the attacker if we cannot shake it (it is within 60 m) or we out-power it
          const j = topAtt, d = Math.hypot(x[j] - x[i], y[j] - y[i])
          if (fl[i * N + j] && d <= GUN_RANGE) firing[i] = K.returnFire === false ? 0 : 1
          tgt[i] = j
        }
        if (eng >= 0) {
          tgt[i] = eng; if (fl[i * N + eng]) firing[i] = 1
          if (engD > 120) toward(x[eng], y[eng], WALK * DT * 0.5); else if (engD < 85) away(x[eng], y[eng], WALK * DT * 0.6); else { gx[i] = x[i]; gy[i] = y[i] }
        } else {
          hiding[i] = 1
          // move away from the weighted centroid of known mechs and recent gunfire, staying in the next circle
          let ax = 0, ay = 0, w = 0
          for (let j = 0; j < N; j++) if (j !== i && alive[j] && t - seen[i * N + j] <= 8) { const d = Math.hypot(x[j] - x[i], y[j] - y[i]) + 1; const ww = 1 / (d * d); ax += (x[i] - x[j]) / d * ww; ay += (y[i] - y[j]) / d * ww; w += ww }
          if (t - heardT[i] < 10) { const d = Math.hypot(heardX[i] - x[i], heardY[i] - y[i]) + 1; const ww = 0.3 / (d * d); ax += (x[i] - heardX[i]) / d * ww; ay += (y[i] - heardY[i]) / d * ww; w += ww }
          if (w > 0) { const m = Math.hypot(ax, ay) || 1; const sp = (topAtt >= 0 || bestD < 150) ? WALK : 5; gx[i] = x[i] + ax / m * sp * DT; gy[i] = y[i] + ay / m * sp * DT }
          else { gx[i] = x[i]; gy[i] = y[i]; if (cub[i] < par.lootCap && R() < par.lootRate * DT * (K.loot ?? 1)) { cub[i]++; hp[i] += HP * 0.04 } }
          if (tgt[i] >= 0 && topAtt < 0) tgt[i] = -1
        }
        if (firing[i] && stats.firstShotT < 0 && i === 0) stats.firstShotT = t
      }
      // zone discipline (everyone): be inside the next circle before it closes; late game sit near the centre
      const dn = Math.hypot(x[i] - nx, y[i] - ny), tLeft = (ph < 6 ? ZT1[ph] : t) - t
      const want = K.kind === 'hunter' ? 0.85 * nr : (nr <= 70 ? 0.3 * nr : 0.8 * nr)
      if (dn > want && (dn - want) / WALK > tLeft - 6) { const d = dn || 1; gx[i] = x[i] + (nx - x[i]) / d * WALK * DT; gy[i] = y[i] + (ny - y[i]) / d * WALK * DT }
      if (Math.hypot(x[i] - zx, y[i] - zy) > zr) { const d = Math.hypot(x[i] - nx, y[i] - ny) || 1; gx[i] = x[i] + (nx - x[i]) / d * WALK * DT; gy[i] = y[i] + (ny - y[i]) / d * WALK * DT }
    }
    // move + facing
    for (let i = 0; i < N; i++) if (alive[i]) {
      const mx = gx[i] - x[i], my = gy[i] - y[i]
      if (tgt[i] >= 0 && alive[tgt[i]]) yaw[i] = Math.atan2(y[tgt[i]] - y[i], x[tgt[i]] - x[i]); else if (mx * mx + my * my > 1e-6) yaw[i] = Math.atan2(my, mx) + (kind[i].kind === 'hunter' ? Math.sin(t * 1.34 + i) * 0.8 : t * 1.6)
      x[i] = gx[i]; y[i] = gy[i]
    }
    // damage
    const dmg = new Float64Array(N)
    for (let i = 0; i < N; i++) if (alive[i] && firing[i] && tgt[i] >= 0 && alive[tgt[i]]) {
      const j = tgt[i], d = Math.hypot(x[j] - x[i], y[j] - y[i])
      if (!fl[i * N + j] || d > GUN_RANGE) continue
      // reaction delay of a hunter to an attacker it was not looking at
      let amt = par.lethal * DPS * DT * dmgMul(cub[i]) * q(d) * (kind[i].kind === 'hunter' ? 1 : par.ourSkill)
      if (kind[j].kind !== 'hunter' && d > 78) amt *= par.jink
      let da = Math.atan2(y[i] - y[j], x[i] - x[j]) - yaw[j]; da = Math.atan2(Math.sin(da), Math.cos(da))
      if (Math.abs(da) > 1.5708) amt *= 1.5
      dmg[j] += amt; if (hitBy[j * N + i] < t - 2) hitBy[j * N + i] = t + (kind[j].kind === 'hunter' && Math.abs(da) > 1.047 ? par.react : 0); else hitBy[j * N + i] = Math.max(hitBy[j * N + i], t)
      last[i] = t; last[j] = t
      if (i === 0) stats.dmgDealt += amt; if (j === 0) stats.dmgTaken += amt
      // sound
      for (let m = 0; m < N; m++) if (m !== i && alive[m] && Math.hypot(x[m] - x[i], y[m] - y[i]) < SOUND) { heardT[m] = t; heardX[m] = x[i] + (R() - 0.5) * 40; heardY[m] = y[i] + (R() - 0.5) * 40 }
      if (hp[j] - dmg[j] <= 0 && deathT[j] < 0) { deathT[j] = t; kills[i]++; cub[i] += Math.round(par.killCubes * (cub[j] + 2)); }
    }
    // zone damage, regen, deaths
    const dead = []
    for (let i = 0; i < N; i++) if (alive[i]) {
      const out = Math.hypot(x[i] - zx, y[i] - zy) > zr
      if (out) { dmg[i] += zdps * DT; last[i] = Math.max(last[i], t - REGEN_DELAY + 0.01) }
      hp[i] -= dmg[i]
      if (hp[i] <= 0) dead.push(i)
      else if (!out && t - last[i] >= REGEN_DELAY) hp[i] = Math.min(maxHp(cub[i]), hp[i] + REGEN * DT)
      if (hp[i] > maxHp(cub[i])) hp[i] = maxHp(cub[i])
    }
    if (dead.length) { for (const i of dead) { alive[i] = 0; place[i] = nAlive; deathT[i] = t; tgt[i] = -1 } nAlive -= dead.length; for (let i = 0; i < N; i++) if (alive[i] && tgt[i] >= 0 && !alive[tgt[i]]) tgt[i] = -1 }
  }
  for (let i = 0; i < N; i++) if (alive[i]) place[i] = 1
  return { place: place[0], score: 16 - place[0], deathT: alive[0] ? t : deathT[0], endT: t, kills: kills[0], stats, places: place, cubes: cub[0], deathTs: deathT, aliveEnd: alive }
}
export function run(pol, n, par = DEF, field = null, seed0 = 1) {
  let s = 0, s2 = 0, top4 = 0, win = 0, dT = 0, eT = 0, k = 0; const hist = new Array(17).fill(0)
  for (let m = 0; m < n; m++) { const r = match(seed0 + m * 7919, pol, par, field); s += r.score; s2 += r.score * r.score; if (r.place <= 4) top4++; if (r.place === 1) win++; dT += r.deathT; eT += r.endT; k += r.kills; hist[r.place]++ }
  const mean = s / n, sd = Math.sqrt(Math.max(0, s2 / n - mean * mean))
  return { mean, se: sd / Math.sqrt(n), top4: top4 / n, win: win / n, deathT: dT / n, endT: eT / n, kills: k / n, hist }
}
const fmt = r => `${r.mean.toFixed(2)} ±${r.se.toFixed(2)}  top4 ${(r.top4 * 100).toFixed(0)}%  win ${(r.win * 100).toFixed(0)}%  kills ${r.kills.toFixed(2)}  our death ${r.deathT.toFixed(0)} s  match end ${r.endT.toFixed(0)} s`
if (process.argv[1] && process.argv[1].endsWith('ffa_mc.js')) {
  const n = +(process.argv[2] || 1000), INF = 1e9
  const H = { kind: 'hunter' }
  const PB = [1.85, 1.6, 1.35, 1.25, 1.0]
  const EV = { kind: 'th', th: [INF, INF, 1.35, 1.25, 1.0] }
  console.log(`matches per row: ${n}; field = 15 hunters unless stated; score = 16 - place (field mean is 7.5 by construction)`)
  { // calibration: when does the k-th death happen in an all-hunter field? (replay, older balance: 41.7 / 69.5 / 125.1 / 160.7 / 209.7 s)
    const ks = [1, 5, 8, 12, 15], acc = ks.map(() => 0); const M = 300
    for (let k = 0; k < M; k++) {
      const r = match(1 + k * 7919, H), ts = []
      for (let i = 0; i < N; i++) if (!r.aliveEnd[i]) ts.push(r.deathTs[i])
      ts.sort((a, b) => a - b); ks.forEach((q, n) => { acc[n] += ts[Math.min(q, ts.length) - 1] })
    }
    console.log('calibration, all-hunter field: mean time of death number 1/5/8/12/15 =', acc.map(v => (v / M).toFixed(0)).join(' / '), 's   (replay: 42 / 70 / 125 / 161 / 210 s)')
    if (process.argv[3] === 'calib') process.exit(0)
  }
  console.log('\n-- A. our policy vs 15 hunters --')
  const pols = {
    'hunter (same as field)': H,
    'playbook thresholds 1.85/1.6/1.35/1.25/1.0': { kind: 'th', th: PB },
    'playbook + shoot first when targeted': { kind: 'th', th: PB, first: true },
    'playbook + third-party': { kind: 'th', th: PB, third: true },
    'evade until 4 alive, then 1.35/1.25/1.0': EV,
    'evade until 4 + third-party': { ...EV, third: true },
    'evade until 4, then fight at P>=0.8': { kind: 'th', th: [INF, INF, 0.8, 0.8, 0.8], third: true },
    'evade until 2 alive (return fire only)': { kind: 'th', th: [INF, INF, INF, INF, 1.0] },
    'never fire (pure hider)': { kind: 'th', th: [INF, INF, INF, INF, INF], returnFire: false },
    'fight when P>=1 in every phase': { kind: 'th', th: [1, 1, 1, 1, 1], first: true },
    'fight when P>=1.85 in every phase': { kind: 'th', th: [1.85, 1.85, 1.85, 1.85, 1.85] },
  }
  const out = {}
  for (const k in pols) { out[k] = run(pols[k], n); console.log(k.padEnd(46), fmt(out[k])) }
  console.log('\n-- A2. continuation value V(n) = E[final score | still alive with n alive] and the duel threshold it implies --')
  console.log('p*(n) = (V(n) - (16-n)) / (V(n-1) - (16-n));  P* = (p*/(1-p*))^(1/3) (panel 1 mapping p = P^3/(1+P^3))')
  for (const k of ['evade until 4 alive, then 1.35/1.25/1.0', 'hunter (same as field)']) {
    const h = out[k].hist, V = {}
    for (let a = 2; a <= 16; a++) { let num = 0, den = 0; for (let p = 1; p <= a; p++) { num += (16 - p) * h[p]; den += h[p] } V[a] = den ? num / den : NaN }
    V[1] = 15
    const row = []
    for (const a of [16, 12, 8, 6, 4, 3, 2]) { const ps = (V[a] - (16 - a)) / (V[a - 1] - (16 - a)); const Ps = Math.cbrt(ps / (1 - ps)); row.push(`n=${a}: V=${V[a].toFixed(1)} p*=${ps.toFixed(2)} P*=${Ps.toFixed(2)}`) }
    console.log(k.slice(0, 22).padEnd(24), row.join(' | '))
  }
  console.log('\n-- C. sensitivity (evade-until-4  vs  a clone of the field) --')
  for (const [name, ch] of [['base', {}], ['cover works badly (hide 0.7)', { hide: 0.7 }], ['no cover at all (hide 1.0)', { hide: 1 }], ['hunters rush to 40-70 m, chase x1.25', { bandLo: 40, bandHi: 70, chase: 1.25 }], ['rush + no cover + no jink', { bandLo: 40, bandHi: 70, chase: 1.25, hide: 1, jink: 1 }], ['hunters ignore sound', { seekSound: 0 }], ['our aim 20% worse', { ourSkill: 0.8 }], ['killers collect all cubes', { killCubes: 1 }]]) {
    const par = { ...DEF, ...ch }
    console.log(name.padEnd(38), 'evader:', fmt(run(EV, n, par)).slice(0, 34), '| clone:', fmt(run(H, n, par)).slice(0, 34))
  }
  console.log('\n-- D. field composition: k of the 15 opponents also evade-until-4 (the rest hunters) --')
  for (const kk of [0, 2, 4, 8, 15]) {
    const field = []; for (let i = 0; i < N; i++) field.push(i >= 1 && i <= kk ? EV : H)
    console.log(`${kk} evaders in field`.padEnd(22), 'we evade:', fmt(run(EV, n, DEF, field)), '\n'.padEnd(23), 'we hunt: ', fmt(run(H, n, DEF, field)))
  }
  console.log('\n-- E. endgame among evaders (8 evaders + 7 hunters): our threshold once <=4 alive --')
  { const field = []; for (let i = 0; i < N; i++) field.push(i >= 1 && i <= 8 ? EV : H)
    for (const c of [0.8, 1.0, 1.35, 2, INF]) console.log(`th<=4 = ${c > 1e6 ? 'inf' : c}`.padEnd(22), fmt(run({ kind: 'th', th: [INF, INF, c, Math.min(c, 1.25), Math.min(c, 1.0)], third: true }, n, DEF, field))) }
}
