// Late-game behaviour by number of mechs alive (our own analysis; trace files only). node kyoto_late.js <dir> <tag> s0 s1
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, tag, a0, a1] = process.argv.slice(2)
const B = { '16-11': [11, 16], '10-7': [7, 10], '6-5': [5, 6], '4-3': [3, 4], '2': [2, 2] }
const acc = {}
for (const k of Object.keys(B)) acc[k] = { s: 0, stand: 0, boost: 0, near: [], ze: [], dealt: 0, taken: 0, shots: 0, eng: 0 }
for (let seed = +a0; seed <= +a1; seed++) {
  const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
  const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), slot = tr.slot, F = tr.frames, W = tr.world
  const dOut = tr.dmg.filter((d) => d[1] === slot && d[2] !== slot && d[2] < 100), dIn = tr.dmg.filter((d) => d[2] === slot && d[1] < 100 && d[1] !== slot)
  const shots = tr.shots.filter((s) => s[1] === slot && s[2] >= 0 && s[2] < 100)
  let wi = 0
  for (const w of W) {
    const n = w[1].length, me = w[1].find((q) => q[0] === slot); if (!me) continue
    const key = Object.keys(B).find((k) => n >= B[k][0] && n <= B[k][1]); if (!key) continue
    const a = acc[key]
    const fr = F.find((x) => x.t >= w[0]) || F[F.length - 1]
    a.s += 0.5; if (fr.v < 1.5) a.stand += 0.5; if (fr.b) a.boost += 0.5
    const near = Math.min(...w[1].filter((q) => q[0] !== slot).map((q) => Math.hypot(q[1] - me[1], q[2] - me[2])))
    a.near.push(near); a.ze.push(fr.ze)
    const t = w[0]
    a.dealt += dOut.filter((d) => d[0] > t - 0.5 && d[0] <= t).reduce((s, d) => s + d[3], 0)
    a.taken += dIn.filter((d) => d[0] > t - 0.5 && d[0] <= t).reduce((s, d) => s + d[3], 0)
    a.shots += shots.filter((s) => s[0] > t - 0.5 && s[0] <= t).length
    if (dOut.some((d) => d[0] > t - 2 && d[0] <= t)) a.eng += 0.5
  }
}
const med = (x) => { const b = x.slice().sort((p, q) => p - q); return b.length ? Math.round(b[b.length >> 1]) : '-' }
console.log(`${tag}: alive-bucket | seconds observed | stand% boost% | nearest enemy med m | zone margin med m | dealt/min taken/min | gun shots/min | share of time dealing damage`)
for (const [k, a] of Object.entries(acc)) {
  if (!a.s) { console.log(`  ${k}: -`); continue }
  const pm = (x) => Math.round(x / a.s * 60)
  console.log(`  ${k.padEnd(6)} ${String(a.s).padStart(6)} s | ${Math.round(100 * a.stand / a.s)}% ${Math.round(100 * a.boost / a.s)}% | ${med(a.near)} | ${med(a.ze)} | ${pm(a.dealt)} ${pm(a.taken)} | ${pm(a.shots)} | ${Math.round(100 * a.eng / a.s)}%`)
}
