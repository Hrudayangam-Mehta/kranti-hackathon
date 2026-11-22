// compact second-by-second narrative: node narrate2.js <trace.json.gz> <t0> <t1>
const fs = require('fs'), zlib = require('zlib')
const [file, a0, a1] = process.argv.slice(2)
const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)))
const t0 = +a0, t1 = +a1, slot = tr.slot, F = tr.frames, W = tr.world
const tier = (id) => (id >= 100 ? 'drone' : (tr.tiers[id] || '?').replace('squad:', ''))
const T1 = (id) => ({ easy: 'e', medium: 'm', hard: 'h', expert: 'x', drone: 'd' }[tier(id)] || '?')
const fAt = (t) => { let b = F[0]; for (const f of F) { if (f.t <= t + 1e-6) b = f; else break } return b }
const wAt = (t) => { let b = W[0]; for (const w of W) { if (w[0] <= t + 1e-6) b = w; else break } return b }
const wk = (w) => ({ gun: 'g', laser: 'L', lightning: 'Z', mortar: 'M', npc: 'n' }[w] || w)
const ldS = (s) => (s || '').replace(/li/g, 'Z').replace(/l/g, 'L').replace(/m/g, 'M')
const out = []
out.push(`seed ${tr.seed} (${tr.bot}): ${tr.rec.kills} kills, died ${tr.rec.timeAlive} s to ${tr.rec.cause} of ${tr.rec.killerName} at ${tr.rec.killRange} m`)
out.push('   t | x,y | hp/max | load | speed | brain mode/leg target@m (goal) | dmg in <- / out -> this second | nearby mechs: id+tier(e/m/h/x) *=hunter [loadout] @dist/hp >me=targets us')
for (let t = t0; t <= t1 + 1e-6; t += 1) {
  const f = fAt(t), w = wAt(t); if (!f) continue
  const me = w[1].find((q) => q[0] === slot)
  const dIn = tr.dmg.filter((d) => d[2] === slot && d[0] > t - 1 && d[0] <= t), dOut = tr.dmg.filter((d) => d[1] === slot && d[2] !== slot && d[0] > t - 1 && d[0] <= t)
  const agg = (L, key) => { const o = {}; for (const d of L) { const k = key(d); o[k] = (o[k] || 0) + d[3] } return Object.entries(o).map(([k, v]) => `${k}:${Math.round(v)}`).join(',') }
  const kills = tr.deaths.filter((d) => d.by === slot && d.t > t - 1 && d.t <= t).map((d) => d.id)
  const cub = tr.cubes.filter((c) => c[0] > t - 1 && c[0] <= t).length
  const hu = f.hu || []
  const near = me ? w[1].filter((q) => q[0] !== slot).map((q) => ({ id: q[0], d: Math.hypot(q[1] - me[1], q[2] - me[2]), hp: q[4], tg: q[5], h: hu.includes(q[0]), ld: q[6] || '' })).filter((q) => q.h || q.d < 130).sort((a, b) => a.d - b.d).slice(0, 4) : []
  const nearS = near.map((q) => `${q.id}${T1(q.id)}${q.h ? '*' : ''}${q.ld && q.ld !== 'g' ? '[' + ldS(q.ld) + ']' : ''}@${Math.round(q.d)}/${q.hp}${q.tg === slot ? '>me' : ''}`).join(' ')
  const brain = f.md !== undefined ? `${f.md}/${f.lg || '-'}${f.tg >= 0 ? ' tg' + f.tg + '@' + f.td : ''}${f.ls ? ' LOSING' : ''}${f.gl ? ' (' + f.gl.join(',') + ')' : ''}` : '(external bot)'
  out.push(`${String(t).padStart(4)} | ${Math.round(f.x)},${Math.round(f.y)} | ${f.hp}/${f.mhp} | ${ldS(f.ld)} | ${f.v}${f.b ? 'B' : ''}${f.g ? '' : 'air'} | ${brain} | ${agg(dIn, (d) => d[1] + T1(d[1]) + wk(d[4]))}${dIn.length ? ' ' : ''}-> ${agg(dOut, (d) => d[2] + wk(d[4]))}${kills.length ? ' KILL ' + kills.join(',') : ''}${cub ? ' +' + cub + 'cu' : ''} | ${nearS}`)
}
console.log(out.join('\n'))
