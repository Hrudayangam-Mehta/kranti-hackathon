const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, ...tags] = process.argv.slice(2)
for (const tag of tags) {
  const byMode = {}, byTier = {}, byTierBand = {}
  for (let seed = 1; seed <= 21; seed++) {
    const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
    const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), F = tr.frames, slot = tr.slot
    let k = 0
    for (const s of tr.shots.filter((s) => s[2] === slot).sort((a, b) => a[0] - b[0])) {
      while (k + 1 < F.length && F[k + 1].t <= s[0]) k++
      const fr = F[k]
      const md = fr.md !== undefined ? fr.md : (fr.v < 1.5 ? 'stand' : fr.b ? 'boost' : 'walk')
      const tier = (tr.tiers[s[1]] || '?').replace('squad:', '')
      const band = s[3] < 75 ? '<75' : s[3] < 100 ? '75-100' : s[3] < 130 ? '100-130' : '130+'
      for (const [o, key] of [[byMode, md], [byTier, tier], [byTierBand, tier + ' ' + band]]) { const e = o[key] || (o[key] = [0, 0]); e[0]++; e[1] += s[4] }
      if (fr.md !== undefined) { const mv = fr.v < 1.5 ? 'stand' : fr.b ? 'boost' : 'walk'; const e = byMode['mv:' + mv] || (byMode['mv:' + mv] = [0, 0]); e[0]++; e[1] += s[4] }
    }
  }
  const fmt = (o) => Object.entries(o).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => `${k}:${v[0]}/${(v[1] / v[0]).toFixed(2)}`).join('  ')
  console.log(tag, '\n  by state:', fmt(byMode), '\n  by tier:', fmt(byTier), '\n  tier x band:', fmt(byTierBand))
}
