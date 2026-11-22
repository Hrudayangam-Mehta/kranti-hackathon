// Second-by-second narrative of a traced match window.  node narrate.js <trace.json.gz> <t0> <t1> [step]
const fs = require('fs'), zlib = require('zlib')
const [file, a0, a1, st] = process.argv.slice(2)
const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)))
const t0 = +a0, t1 = +a1, step = +(st || 1), slot = tr.slot
const F = tr.frames, W = tr.world
const tier = (id) => id >= 100 ? (id >= 1000 ? 'crate' : 'drone') : (tr.tiers[id] || '?').replace('squad:', '')
const fAt = (t) => { let b = F[0]; for (const f of F) { if (f.t <= t + 1e-6) b = f; else break } return b }
const wAt = (t) => { let b = W[0]; for (const w of W) { if (w[0] <= t + 1e-6) b = w; else break } return b }
console.log(`seed ${tr.seed} bot ${tr.bot} slot ${slot}: ${tr.rec.kills} kills, died ${tr.rec.timeAlive}s by ${tr.rec.cause}:${tr.rec.killerName} at ${tr.rec.killRange} m`)
for (let t = t0; t <= t1 + 1e-6; t += step) {
  const f = fAt(t), w = wAt(t)
  if (!f) continue
  const me = w[1].find((q) => q[0] === slot)
  const dIn = tr.dmg.filter((d) => d[2] === slot && d[0] > t - step && d[0] <= t)
  const dOut = tr.dmg.filter((d) => d[1] === slot && d[0] > t - step && d[0] <= t)
  const byIn = {}; for (const d of dIn) { const k = `${d[1]}${tier(d[1])[0]}:${d[4][0]}`; byIn[k] = (byIn[k] || 0) + d[3] }
  const byOut = {}; for (const d of dOut) { const k = `${d[2]}:${d[4][0]}`; byOut[k] = (byOut[k] || 0) + d[3] }
  const npcOut = tr.npc.filter((d) => d[0] > t - step && d[0] <= t).reduce((s, d) => s + d[3], 0)
  const cub = tr.cubes.filter((c) => c[0] > t - step && c[0] <= t).length
  const kills = tr.deaths.filter((d) => d.by === slot && d.t > t - step && d.t <= t).map((d) => d.id)
  // nearby mechs: hunters and anyone within 160 m
  const hu = f.hu || []
  const near = (me ? w[1].filter((q) => q[0] !== slot).map((q) => ({ id: q[0], d: Math.hypot(q[1] - me[1], q[2] - me[2]), hp: q[4], tg: q[5], h: hu.includes(q[0]), ld: q[6] || "" })) : [])
    .filter((q) => q.h || q.d < 160).sort((p, q) => p.d - q.d).slice(0, 5)
  const nearS = near.map((q) => `${q.id}${tier(q.id)[0]}${q.h ? '*' : ''}${q.ld && q.ld !== 'g' ? '[' + q.ld + ']' : ''}@${Math.round(q.d)}m/${q.hp}${q.tg === slot ? '>me' : ''}`).join(' ')
  const brain = f.md !== undefined ? ` ${f.md}/${f.lg} tg${f.tg}${f.td >= 0 ? '@' + f.td : ''} A${f.A} th${f.th}${f.ls ? ' LOSING' : ''}${f.gr ? ' grab:' + f.gr : ''}${f.lo ? ' loot:' + f.lo : ''} hide:${f.hd} rp${f.rp} aim:${f.ak}` : ''
  console.log(`${t.toFixed(1).padStart(6)} (${f.x},${f.y}) hp${f.hp}/${f.mhp} en${f.en} cu${f.cu} ${f.ld} v${f.v}${f.b ? ' BOOST' : ''}${f.g ? '' : ' AIR'}${f.iz ? '' : ' OUTZONE'} ze${Math.round(f.ze)}${brain}` +
    `\n        in:${JSON.stringify(byIn)} out:${JSON.stringify(byOut)}${npcOut ? ' npc/crate:' + Math.round(npcOut) : ''}${cub ? ' +' + cub + 'cube' : ''}${kills.length ? ' KILL ' + kills.join(',') : ''} | ${nearS}`)
}
