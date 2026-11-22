import { readFileSync } from 'node:fs'
const all = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const cnt = {}, inc = (k) => { cnt[k] = (cnt[k] || 0) + 1 }
let n = 0, w = 0
const wallNear = [], rng = []
for (const m of all) {
  const F = m.frames
  let j = 0
  for (const s of m.shotList) {
    const [t, by, tgt, range, hit, air, wall] = s
    n++
    while (j + 1 < F.length && F[j + 1].t <= t) j++
    const f = F[j]
    const isWall = wall !== null && wall !== undefined
    if (!isWall) continue
    w++
    wallNear.push(wall); rng.push(range)
    const nearT = wall >= 0 && wall <= 8 ? 'wall<=8m of target' : wall > 8 ? 'wall>8m from target' : 'tgt?'
    inc(nearT)
    inc(`tgtLos:${f.tlo ? 1 : 0}/listed:${f.tl ? 1 : 0}`)
    inc(`ak:${f.ak}`)
    inc(`md:${f.md}`)
    inc(`range:${range < 60 ? '<60' : range < 120 ? '60-120' : range < 180 ? '120-180' : '180+'}`)
    inc(`frameTgt==shotTgt:${f.tg === tgt ? 1 : 0}`)
  }
}
console.log(`shots ${n}, wall ${w}`)
for (const [k, v] of Object.entries(cnt).sort()) console.log(k, v)
