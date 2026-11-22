// bun idsum.mjs <offDir> <presetDir...>: per preset set, the forced-FFA recordings (T-F2: must equal off) and the rest (differences)
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const [off, ...sets] = process.argv.slice(2)
const names = readdirSync(off).filter((x) => x.endsWith('.meta.json')).map((x) => x.replace('.meta.json', '')).sort()
const forced = (n) => n.endsWith('_ffa') || n.startsWith('ff4')
let allOk = true
for (const d of sets) {
  let fSame = 0, fN = 0, oSame = 0, oN = 0, fuse = 0, err = 0, miss = 0; const diffs = [], cnt = {}
  for (const n of names) {
    if (!existsSync(`${d}/${n}.jsonl`)) { miss++; continue }
    const m = JSON.parse(readFileSync(`${d}/${n}.meta.json`, 'utf8')); fuse += m.fuse || 0; err += m.errors || 0
    for (const [k, v] of Object.entries(m.counters || {})) if (k.startsWith('sv')) cnt[k] = (cnt[k] || 0) + v
    const same = readFileSync(`${off}/${n}.jsonl`, 'utf8') === readFileSync(`${d}/${n}.jsonl`, 'utf8')
    if (forced(n)) { fN++; if (same) fSame++; else diffs.push('FFA:' + n) } else { oN++; if (same) oSame++; else diffs.push(n) }
  }
  const ok = fSame === fN && miss === 0 && fuse === 0 && err === 0
  if (!ok) allOk = false
  console.log(`${d.split('/').pop()}: forced FFA ${fSame}/${fN} identical to off; other ${oN - oSame}/${oN} differ (${diffs.filter((x) => !x.startsWith('FFA')).join(' ')})${diffs.some((x) => x.startsWith('FFA')) ? ' FFA DIFF ' + diffs.filter((x) => x.startsWith('FFA')).join(' ') : ''}; fuse ${fuse} errors ${err} missing ${miss}; sv ${Object.entries(cnt).map(([k, v]) => k + '=' + v).join(' ')}`)
}
console.log(allOk ? 'T-F2 STREAMS OK' : 'T-F2 STREAMS FAIL')
