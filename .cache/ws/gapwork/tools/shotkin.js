// enemy gun shots on us split by our speed and by the share of our velocity across the line of fire
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, ...tags] = process.argv.slice(2)
for (const tag of tags) {
  const sp = {}, perp = {}, laser = {}
  let nAll = 0
  for (let seed = 1; seed <= 21; seed++) {
    const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
    const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), F = tr.frames, W = tr.world, slot = tr.slot
    let k = 0, j = 0
    for (const s of tr.shots.filter((s) => s[2] === slot && s[3] < 100).sort((a, b) => a[0] - b[0])) {
      while (k + 1 < F.length && F[k + 1].t <= s[0]) k++
      while (j + 1 < W.length && W[j + 1][0] <= s[0]) j++
      const fr = F[k], w = W[j]
      const sh = w[1].find((q) => q[0] === s[1]); if (!sh || fr.vx === undefined) continue
      const lx = fr.x - sh[1], ly = fr.y - sh[2], l = Math.hypot(lx, ly) || 1
      const vperp = Math.abs((fr.vx * ly - fr.vy * lx) / l), vrad = (fr.vx * lx + fr.vy * ly) / l
      const v = Math.hypot(fr.vx, fr.vy)
      const b1 = v < 3 ? 'v<3' : v < 8 ? 'v3-8' : v < 13 ? 'v8-13' : 'v13+'
      const b2 = v < 3 ? 'slow' : (vperp / v > 0.7 ? 'across' : vperp / v > 0.35 ? 'diag' : (vrad > 0 ? 'away' : 'toward'))
      const b3 = fr.ch ? 'charging' : 'not'
      for (const [o, key] of [[sp, b1], [perp, b2], [laser, b3]]) { const e = o[key] || (o[key] = [0, 0]); e[0]++; e[1] += s[4] }
      nAll++
    }
  }
  const fmt = (o) => Object.entries(o).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => `${k}:${v[0]}(${(100 * v[0] / nAll).toFixed(0)}%)/${(v[1] / v[0]).toFixed(2)}`).join('  ')
  console.log(tag.padEnd(22), 'shots<100m', nAll, '\n   speed:', fmt(sp), '\n   heading:', fmt(perp), '\n   laser:', fmt(laser))
}
