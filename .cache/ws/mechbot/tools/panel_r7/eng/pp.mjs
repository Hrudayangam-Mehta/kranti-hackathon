import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const c = {}, inc = (k) => { c[k] = (c[k] || 0) + 1 }
let fd = 0, ffd = 0
for (const m of all) {
  const F = m.frames
  for (let i = 1; i < F.length; i++) {
    if (F[i].md !== F[i - 1].md) {
      // find next switch
      let j = i + 1; while (j < F.length && F[j].md === F[i].md) j++
      if (j < F.length && F[j].md === F[i - 1].md && F[j].t - F[i].t <= 1.0) {
        const a = F[i - 1], b = F[i], e = F[j]
        inc(`${a.md}>${b.md}>${e.md} | ls ${a.ls ? 1 : 0}${b.ls ? 1 : 0}${e.ls ? 1 : 0} tg ${a.tg >= 0 ? 'T' : '-'}${b.tg >= 0 ? 'T' : '-'}${e.tg >= 0 ? 'T' : '-'} same ${a.tg === e.tg ? 1 : 0} legB ${b.lg} dur ${(e.t - b.t).toFixed(1)}`)
      }
    }
  }
  // reaction misses: new attacker never fired at in 6 s
  for (const r of m.react) {
    if (r.fireT >= 0 || r.wasTgt) continue
    let k = 0; while (k + 1 < F.length && F[k + 1].t <= r.t0) k++
    const f = F[k]
    inc(`NOFIRE at mode ${f.md}/${f.lg} tg ${f.tg >= 0 ? 'other' : 'none'} hp ${Math.round(f.hp / 140) * 10}% tgtT ${r.tgtT >= 0 ? 'yes' : 'no'} faceT ${r.faceT >= 0 ? r.faceT.toFixed(1) : 'no'}`)
  }
}
for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(v, k)
