// Compare candidate sim tags with the base tag: matches whose decision stream differs, first differing decision, kills (behaviour only).
//   bun simcmp.mjs <baseTag> <tag> [tag ...]      (tw_scratch/id/<tag>/sqN.{jsonl,meta.json}, seeds found in the base tag)
import { readFileSync, readdirSync, existsSync } from 'node:fs'
const T = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tw_scratch/id'
const [base, ...tags] = process.argv.slice(2)
const seeds = readdirSync(`${T}/${base}`).filter((f) => /^sq\d+\.meta\.json$/.test(f)).map((f) => +f.slice(2, -10)).sort((a, b) => a - b)
const meta = (t, s) => JSON.parse(readFileSync(`${T}/${t}/sq${s}.meta.json`, 'utf8'))
const body = (t, s) => readFileSync(`${T}/${t}/sq${s}.jsonl`, 'utf8')
const bk = seeds.reduce((a, s) => a + meta(base, s).kills, 0), bt = seeds.reduce((a, s) => a + meta(base, s).lastT, 0)
console.log(`base ${base}: ${seeds.length} matches, kills ${bk} (mean ${(bk / seeds.length).toFixed(2)}), life ${(bt / seeds.length).toFixed(1)} s, fuse ${seeds.reduce((a, s) => a + meta(base, s).fuse, 0)}`)
const rows = []
for (const t of tags) {
  let diff = 0, k = 0, life = 0, fuse = 0, miss = 0, errs = 0, twd = 0, dec = 0
  const firsts = []
  for (const s of seeds) {
    if (!existsSync(`${T}/${t}/sq${s}.meta.json`)) { miss++; continue }
    const m = meta(t, s); k += m.kills; life += m.lastT; fuse += m.fuse; errs += m.errors; twd += (m.counters && m.counters.twDecisions) || 0; dec += m.n
    const a = body(base, s), b = body(t, s)
    if (a !== b) { diff++; const x = a.split('\n'), y = b.split('\n'); let i = 0; while (i < Math.min(x.length, y.length) && x[i] === y[i]) i++; firsts.push(i) }
  }
  firsts.sort((a, b) => a - b)
  rows.push({ tag: t, diff, of: seeds.length - miss, kills: k, dk: k - bk, life: +(life / (seeds.length - miss)).toFixed(1), fuse, errs, twShare: +(twd / Math.max(1, dec)).toFixed(3), medFirst: firsts.length ? firsts[Math.floor(firsts.length / 2)] : -1, miss })
  console.log(`${t}: differ ${diff}/${seeds.length - miss}${miss ? ` (${miss} missing)` : ''}, kills ${k} (${k - bk >= 0 ? '+' : ''}${k - bk}), life ${(life / (seeds.length - miss)).toFixed(1)} s, first diff median decision ${firsts.length ? firsts[Math.floor(firsts.length / 2)] : '-'}, layer on ${(100 * twd / Math.max(1, dec)).toFixed(1)}% of decisions, fuse ${fuse}, errors ${errs}`)
}
if (process.env.JSON_OUT) (await import('node:fs')).writeFileSync(process.env.JSON_OUT, JSON.stringify(rows))
