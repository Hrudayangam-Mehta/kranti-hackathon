// checkR3a2: compare the identity batch (out/id). Prints the identity tables, latch / inertness checks and a summary.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
const O = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/checkR3a2/out/id'
const meta = (n) => existsSync(`${O}/${n}.meta.json`) ? JSON.parse(readFileSync(`${O}/${n}.meta.json`, 'utf8')) : null
const body = (n) => readFileSync(`${O}/${n}.jsonl`, 'utf8')
const srcs = []
for (const s of ['kit', 'l4800', 'l11', 'l23p', 'cfg1200', 'f1', 'f2', 'f3', 'f4']) for (const e of ['auto', 'squad']) srcs.push(`${s}_${e}`)
for (let k = 1; k <= 10; k++) srcs.push(`sq${k}`)
for (const k of [411, 412, 413, 414]) srcs.push(`ff${k}`)
const firstDiff = (a, b) => { const A = a.split('\n'), Bb = b.split('\n'); for (let i = 0; i < Math.max(A.length, Bb.length); i++) if (A[i] !== Bb[i]) return i; return -1 }
function pair(x, y, filter) {
  let same = 0, tot = 0
  const rows = []
  for (const s of srcs) {
    if (filter && !filter(s)) continue
    const a = meta(`${x}_${s}`), b = meta(`${y}_${s}`)
    if (!a || !b) { rows.push(`${s}: MISSING`); tot++; continue }
    tot++
    const eq = body(`${x}_${s}`) === body(`${y}_${s}`)
    if (eq) same++
    rows.push(`${s.padEnd(13)} n ${String(a.n).padStart(5)} ${a.hash} ${eq ? 'IDENTICAL' : 'DIFFERENT at decision ' + firstDiff(body(`${x}_${s}`), body(`${y}_${s}`)) + ' / ' + a.n + ` (${y} ${b.hash})`} env ${a.env} latch ${a.latchTick}`)
  }
  return { same, tot, rows }
}
const out = []
const show = (title, r) => { out.push(`## ${title}: ${r.same}/${r.tot} byte-identical`); for (const l of r.rows) out.push('  ' + l) }
const squadOnly = (s) => s.endsWith('_squad') || s.startsWith('sq')
show('SNAP vs O502 (bot/lib, every changed preset at its 5.02 value, written out by the checker)', pair('SNAP', 'O502'))
show('SNAP vs OFF (bot/lib, r3a2 off)', pair('SNAP', 'OFF'))
show('SNAP vs FON (5.02 practice values + five final-only items on), SQUAD-only sources', pair('SNAP', 'FON', squadOnly))
show('V1 vs V1F (defaults vs defaults with the five final-only items off), SQUAD-only sources', pair('V1', 'V1F', squadOnly))
// latch: no FFA latch in squad matches (V1..V4 and the snapshot)
const lat = []
for (const c of ['SNAP', 'V1', 'V2', 'V3', 'V4']) {
  const r = []
  for (let k = 1; k <= 10; k++) { const m = meta(`${c}_sq${k}`); r.push(m ? (m.latchTick < 0 && m.env === 'SQUAD' ? '-' : `LATCH@${m.latchTick}`) : '?') }
  lat.push(`${c.padEnd(5)} ${r.join(' ')}  latched ${r.filter((x) => x !== '-').length}/10`)
}
out.push('## FFA latch in 10 simulator squad matches (seeds 1-10; "-" = never latched)'); for (const l of lat) out.push('  ' + l)
// health of every recording
let bad = 0
const all = readdirSync(O).filter((f) => f.endsWith('.meta.json'))
for (const f of all) { const m = JSON.parse(readFileSync(`${O}/${f}`, 'utf8')); if (m.errors || m.fuse) { bad++; out.push(`  errors/fuse in ${f}: ${m.errors}/${m.fuse}`) } }
out.push(`## recordings: ${all.length}, with brain errors or fuse trips: ${bad}`)
// squad-match outcome summary (information only; uncalibrated simulator)
const sum = (c) => { let sc = 0, k = 0, al = 0, heal = 0, n = 0; for (let s = 1; s <= 10; s++) { const m = meta(`${c}_sq${s}`); if (!m) continue; n++; sc += m.score; k += m.kills; al += m.alive; heal += m.modes.HEAL || 0 } return `${c.padEnd(5)} mean score ${(sc / n).toFixed(2)}, kills ${(k / n).toFixed(2)}, alive ${(al / n).toFixed(1)} s, kills/min alive ${(k / (al / 60)).toFixed(2)}, HEAL decisions ${heal}` }
out.push('## simulator squad seeds 1-10 (information only)'); for (const c of ['SNAP', 'V1', 'V2', 'V3', 'V4']) out.push('  ' + sum(c))
const ffs = (c) => [411, 412, 413, 414].map((s) => { const m = meta(`${c}_ff${s}`); return m ? `${s}: score ${m.score} alive ${m.alive} s latch ${m.latchTick}` : `${s}: ?` }).join(' | ')
out.push('## simulator FFA seeds 411-414 (information only)'); for (const c of ['SNAP', 'V1']) out.push(`  ${c.padEnd(5)} ${ffs(c)}`)
console.log(out.join('\n'))
