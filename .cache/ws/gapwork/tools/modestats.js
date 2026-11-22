// per-mode / per-leg damage in/out for our in-process bot
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, tag] = process.argv.slice(2)
const S = {}, L = {}
let n = 0
for (let seed = 1; seed <= 21; seed++) {
  const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
  const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), F = tr.frames, slot = tr.slot
  n++
  let k = 0
  const modeAt = (t) => { while (k + 1 < F.length && F[k + 1].t <= t) k++; return F[k] }
  for (const f of F) { const s = S[f.md] || (S[f.md] = { t: 0, in: 0, out: 0, v: 0, b: 0 }); s.t += 0.1; s.v += f.v * 0.1; s.b += f.b * 0.1; const l = L[f.md + '/' + f.lg] || (L[f.md + '/' + f.lg] = { t: 0, in: 0, out: 0 }); l.t += 0.1 }
  k = 0
  for (const d of tr.dmg) {
    const f = modeAt(d[0]); if (!f) continue
    const key = f.md, lk = f.md + '/' + f.lg
    if (d[2] === slot && d[1] < 100 && d[1] >= 0) { S[key].in += d[3]; L[lk].in += d[3] }
    if (d[1] === slot && d[2] !== slot) { S[key].out += d[3]; L[lk].out += d[3] }
  }
}
console.log('mode        s/match  in/s  out/s  speed boost%')
for (const [k, s] of Object.entries(S).sort((a, b) => b[1].t - a[1].t)) console.log(k.padEnd(10), (s.t / n).toFixed(1).padStart(7), (s.in / s.t).toFixed(0).padStart(6), (s.out / s.t).toFixed(0).padStart(6), (s.v / s.t).toFixed(1).padStart(6), (100 * s.b / s.t).toFixed(0).padStart(5))
console.log('mode/leg            s/match  in/s  out/s  in/match')
for (const [k, s] of Object.entries(L).sort((a, b) => b[1].in - a[1].in).slice(0, 22)) console.log(k.padEnd(20), (s.t / n).toFixed(1).padStart(7), (s.in / s.t).toFixed(0).padStart(6), (s.out / s.t).toFixed(0).padStart(6), (s.in / n).toFixed(0).padStart(7))
