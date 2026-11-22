// checkR4a: compare the batch (out/id): identity tables, FFA inertness, latch, health, sim summary.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
const O = process.argv[2] || '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/checkR4a/out/id'
const meta = (n) => existsSync(`${O}/${n}.meta.json`) ? JSON.parse(readFileSync(`${O}/${n}.meta.json`, 'utf8')) : null
const body = (n) => readFileSync(`${O}/${n}.jsonl`, 'utf8')
const ST = ['kit', 'l4800', 'l11', 'l23p', 'cfg1200', 'f1', 'f2', 'f3', 'f4'], FS = ['kit', 'f1', 'f2', 'f3', 'f4']
const full = []
for (const s of ST) for (const e of ['auto', 'squad']) full.push(`${s}_${e}`)
for (const s of FS) full.push(`${s}_ffa`)
for (let k = 1; k <= 10; k++) full.push(`sq${k}`)
for (const k of [411, 412, 413, 414]) full.push(`ff${k}`)
const ffaSrc = []
for (const s of FS) { ffaSrc.push(`${s}_auto`); ffaSrc.push(`${s}_ffa`) }
for (const k of [411, 412, 413, 414]) ffaSrc.push(`ff${k}`)
const firstDiff = (a, b) => { const A = a.split('\n'), Bb = b.split('\n'); for (let i = 0; i < Math.max(A.length, Bb.length); i++) if (A[i] !== Bb[i]) return i; return -1 }
const out = []
function pair(x, y, srcs, title) {
  let same = 0, tot = 0
  const rows = []
  for (const s of srcs) {
    const a = meta(`${x}_${s}`), b = meta(`${y}_${s}`)
    tot++
    if (!a || !b) { rows.push(`${s}: MISSING`); continue }
    const eq = body(`${x}_${s}`) === body(`${y}_${s}`)
    if (eq) same++
    const fz = (a.fuse || 0) + (b.fuse || 0)
    rows.push(`${s.padEnd(13)} n ${String(a.n).padStart(5)} ${a.hash.slice(0, 16)} ${eq ? 'IDENTICAL' : 'DIFFERENT at decision ' + firstDiff(body(`${x}_${s}`), body(`${y}_${s}`)) + ' / ' + a.n + ` (${y} ${b.hash.slice(0, 16)})`} env ${a.env} latch ${a.latchTick}${fz ? ' FUSE ' + fz : ''}${b.huntOn !== undefined && b.huntOn ? ' huntOn ' + b.huntOn : ''}`)
  }
  out.push(`## ${title}: ${same}/${tot} byte-identical`)
  for (const l of rows) out.push('  ' + l)
  return same === tot
}
pair('SNAP1', 'OFF1', full, 'T14 V1 SELECT: snapshot bot_r3a2 vs bot/lib hunt off + seek off')
pair('SNAP4', 'OFF4', full, 'T14 V4 SELECT: snapshot bot_r3a2 vs bot/lib hunt off + seek off')
pair('SNAP1', 'DEF1', full, 'defaults (no select) vs snapshot V1')
pair('SNAP4', 'H4', ffaSrc, 'T15 FFA inert: H (V4 + hunt h50) vs snapshot V4')
pair('SNAP4', 'HL4', ffaSrc, 'T15 FFA inert: HL (V4 + hunt lite) vs snapshot V4')
pair('SNAP4', 'S4', ffaSrc, 'T15 FFA inert: S (V4 + seek on) vs snapshot V4')
pair('SNAP1', 'H1', ffaSrc, 'T15 FFA inert: V1 + hunt h50 vs snapshot V1')
// latch and foreign deaths in squad matches
out.push('## FFA latch / foreign death before the latch in simulator squad matches ("-" = never)')
for (const [c, seeds] of [['SNAP4', 10], ['H4', 20], ['HL4', 10], ['S4', 10], ['H1', 10], ['SNAP1', 10]]) {
  const r = [], f = []
  for (let k = 1; k <= seeds; k++) { const m = meta(`${c}_sq${k}`); r.push(m ? (m.latchTick < 0 && m.env === 'SQUAD' ? '-' : `L@${m.latchTick}`) : '?'); f.push(m ? (m.ffBeforeLatchT >= 0 ? `${k}@${m.ffBeforeLatchT.toFixed(1)}` : null) : '?') }
  out.push(`  ${c.padEnd(6)} latch ${r.join(' ')}  latched ${r.filter((x) => x !== '-').length}/${seeds}; foreign death before latch: ${f.filter(Boolean).join(' ') || 'none'} (${f.filter(Boolean).length}/${seeds})`)
}
// health
let bad = 0
const all = readdirSync(O).filter((f) => f.endsWith('.meta.json'))
let maxPath = 0
for (const f of all) { const m = JSON.parse(readFileSync(`${O}/${f}`, 'utf8')); if (m.maxPath > maxPath) maxPath = m.maxPath; if (m.errors || m.fuse) { bad++; out.push(`  errors/fuse in ${f}: ${m.errors}/${m.fuse}`) } }
out.push(`## recordings: ${all.length}, with brain errors or fuse trips: ${bad}; most path searches in one decision: ${maxPath}`)
// sim summary (information only)
const sum = (c, seeds) => {
  let sc = 0, k = 0, al = 0, n = 0, st = 0, zd = 0, hold = 0, holdRoam = 0, holdHunt = 0, com = 0, pul = 0, pd = 0, prm = 0, pb = 0, pnd = 0, mx = 0, mh = 0
  for (const s of seeds) { const m = meta(`${c}_sq${s}`); if (!m) continue; n++; sc += m.score; k += m.kills; al += m.alive; st += m.stuck || 0; if (m.cause === 'zone') zd++
    hold += m.holdN; holdRoam += m.holdRoam; holdHunt += m.holdHunt; com += m.h50Commits; pul += m.h50Pulses; pd += m.pulseDec; prm = Math.max(prm, m.pulseRunMax || 0); pb += m.pulseBack || 0; pnd += m.pulseNotDis || 0
    mx = Math.max(mx, m.maxPath); mh = Math.max(mh, m.maxHuntMs || 0) }
  const dec = Math.round(al * 10)
  return `${c.padEnd(6)} n ${n} score ${(sc / n).toFixed(2)} kills/min ${(k / (al / 60)).toFixed(2)} alive ${(al / n).toFixed(1)} s stuck ${st} zoneDeaths ${zd} roam ${(100 * holdRoam / dec).toFixed(1)}% hunt-legs ${(100 * holdHunt / dec).toFixed(1)}% commits ${com} pulses ${pul} (decisions ${pd}, longest run ${prm}, back-to-back ${pb}, not DISENGAGE ${pnd}) maxA* ${mx} maxHuntMs ${mh.toFixed(2)}`
}
const s10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], s6 = [1, 2, 3, 4, 5, 6], s20 = Array.from({ length: 20 }, (_, i) => i + 1)
out.push('## simulator squad seeds 1-10 (information only; uncalibrated)')
for (const c of ['SNAP1', 'SNAP4', 'H4', 'HL4', 'S4', 'H1']) out.push('  ' + sum(c, s10))
out.push('  seeds 1-6:'); for (const c of ['SNAP1', 'SNAP4', 'H4', 'HL4', 'S4', 'HS4']) out.push('  ' + sum(c, s6))
out.push('  seeds 1-20: ' + sum('H4', s20))
console.log(out.join('\n'))
