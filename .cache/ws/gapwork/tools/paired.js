// paired per-seed comparison of run.js --json outputs: node paired.js base.json var.json ...
const fs = require('fs')
const [b, ...vs] = process.argv.slice(2)
const load = (f) => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return new Map(j.matches.map((m) => [m.seed, m])) }
const B = load(b)
for (const v of vs) {
  const V = load(v), d = []
  for (const [s, m] of B) if (V.has(s)) d.push(V.get(s).score - m.score)
  const mu = d.reduce((a, x) => a + x, 0) / d.length, sd = Math.sqrt(d.reduce((a, x) => a + (x - mu) ** 2, 0) / (d.length - 1))
  const up = d.filter((x) => x > 0).length, dn = d.filter((x) => x < 0).length
  console.log(v.split('/').pop().padEnd(28), `delta ${mu >= 0 ? '+' : ''}${mu.toFixed(2)} +- ${(sd / Math.sqrt(d.length)).toFixed(2)} (paired se, n=${d.length})  better ${up} / worse ${dn} / same ${d.length - up - dn}`)
}
