// release R4a: compare the fix recordings (variants_tools/r4a/id) with the checker's (mechbot/tools/checkR4a/out/id).
import { readFileSync, existsSync } from 'node:fs'
const SP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const MY = SP + '/variants_tools/r4a/id', CK = SP + '/mechbot/tools/checkR4a/out/id'
const dir = (n) => (/^(OFF1F|OFF4F|H4F|HL4F|H4P|HL4P)_/.test(n) ? MY : CK)
const meta = (n) => existsSync(`${dir(n)}/${n}.meta.json`) ? JSON.parse(readFileSync(`${dir(n)}/${n}.meta.json`, 'utf8')) : null
const body = (n) => readFileSync(`${dir(n)}/${n}.jsonl`, 'utf8')
const ST = ['kit', 'l4800', 'l11', 'l23p', 'cfg1200', 'f1', 'f2', 'f3', 'f4'], FS = ['kit', 'f1', 'f2', 'f3', 'f4']
const str2 = []; for (const s of ST) for (const e of ['auto', 'squad']) str2.push(`${s}_${e}`)
const full = [...str2]; for (const s of FS) full.push(`${s}_ffa`); for (let k = 1; k <= 10; k++) full.push(`sq${k}`); for (const k of [411, 412, 413, 414]) full.push(`ff${k}`)
const ffaSrc = []; for (const s of FS) { ffaSrc.push(`${s}_auto`); ffaSrc.push(`${s}_ffa`) } for (const k of [411, 412, 413, 414]) ffaSrc.push(`ff${k}`)
const sq = (a, b) => { const o = []; for (let k = a; k <= b; k++) o.push(`sq${k}`); return o }
const firstDiff = (a, b) => { const A = a.split('\n'), B = b.split('\n'); for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return i; return -1 }
let allOk = true
function pair(x, y, srcs, title, expectAll = true) {
  let same = 0, miss = 0; const rows = []
  for (const s of srcs) {
    const a = meta(`${x}_${s}`), b = meta(`${y}_${s}`)
    if (!a || !b) { miss++; rows.push(`${s}: MISSING`); continue }
    const eq = body(`${x}_${s}`) === body(`${y}_${s}`)
    if (eq) same++
    else rows.push(`${s}: DIFFERENT at decision ${firstDiff(body(`${x}_${s}`), body(`${y}_${s}`))} / ${a.n} | ${x} pulseRunMax ${a.pulseRunMax} back ${a.pulseBack} runs ${JSON.stringify(a.pulseRuns)} | ${y} pulseRunMax ${b.pulseRunMax} back ${b.pulseBack} runs ${JSON.stringify(b.pulseRuns)}`)
  }
  const ok = same === srcs.length
  if (expectAll && !ok) allOk = false
  console.log(`## ${title}: ${same}/${srcs.length} byte-identical${miss ? ' (' + miss + ' missing)' : ''}`)
  for (const r of rows) console.log('   ' + r)
}
pair('SNAP1', 'OFF1F', full, 'V1 SELECT, hunt off: snapshot bot_r3a2 vs fixed bot/lib')
pair('SNAP4', 'OFF4F', full, 'V4 SELECT, hunt off: snapshot bot_r3a2 vs fixed bot/lib')
pair('SNAP4', 'H4F', ffaSrc, 'FFA inert: H fixed vs snapshot V4')
pair('SNAP4', 'HL4F', ffaSrc, 'FFA inert: HL fixed vs snapshot V4')
pair('HL4', 'HL4F', [...ffaSrc, ...sq(1, 10)], 'HL: checked build (pre-fix) vs fixed, checker sources')
pair('HL4P', 'HL4F', str2, 'HL: pre-fix vs fixed, 9 streams auto + squad')
pair('H4', 'H4F', [...ffaSrc, ...sq(1, 20)], 'H: checked build (pre-fix) vs fixed, checker sources', false)
pair('H4P', 'H4F', str2, 'H: pre-fix vs fixed, 9 streams auto + squad', false)
// health and latch over every fixed recording
const names = []
for (const c of ['H4F', 'HL4F']) for (const s of full) names.push(`${c}_${s}`)
for (const s of sq(11, 20)) names.push(`H4F_${s}`)
for (const c of ['OFF1F', 'OFF4F']) for (const s of full) names.push(`${c}_${s}`)
let err = 0, fuse = 0, stuck = 0, maxPath = 0, missing = 0, latch = [], back = 0, runMax = 0, maxMs = 0
for (const n of names) {
  const m = meta(n); if (!m) { missing++; continue }
  err += m.errors || 0; fuse += m.fuse || 0; stuck += m.stuck || 0; maxPath = Math.max(maxPath, m.maxPath || 0); maxMs = Math.max(maxMs, m.maxMs || 0)
  if (/_sq\d+$/.test(n) && m.latchTick >= 0) latch.push(n)
  if (/^H4F_/.test(n)) { back += m.pulseBack || 0; runMax = Math.max(runMax, m.pulseRunMax || 0) }
}
console.log(`## health over ${names.length} fixed recordings (${missing} missing): errors ${err}, fuse ${fuse}, stuck ${stuck}, max A* per decision ${maxPath}, max decision ${maxMs} ms (lanes shared, nice 5)`)
console.log(`## FFA latch in squad matches: ${latch.length ? latch.join(', ') : 'none'} (H 1-20, HL 1-10, off 1-10)`)
console.log(`## H fixed: longest pulse ${runMax} decisions, back-to-back starts (< 0.25 s after an end) ${back}`)
let ckBack = 0, ckRun = 0; for (const s of [...ffaSrc, ...sq(1, 20)]) { const m = meta(`H4_${s}`); if (m) { ckBack += m.pulseBack || 0; ckRun = Math.max(ckRun, m.pulseRunMax || 0) } }
console.log(`## H checked build: longest pulse ${ckRun} decisions, back-to-back starts ${ckBack}`)
console.log(allOk && !missing && !err && !fuse && !stuck && latch.length === 0 ? 'COMPARE OK' : 'COMPARE NOT OK')
