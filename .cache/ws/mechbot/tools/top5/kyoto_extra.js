// Rear-hit shares, speed while charging, laser release range / target hp (own analysis; trace files only).
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [dir, tag, a0, a1] = process.argv.slice(2)
let outRear = 0, outAll = 0, inRear = 0, inAll = 0, chV = [], chVb = [], walkV = [], lzR = [], lzHpPre = [], partialR = [], kills = 0, killsRear = 0, cubesFromKills = 0, cubesTot = 0
for (let seed = +a0; seed <= +a1; seed++) {
  const f = path.join(dir, `${tag}_m${seed}.json.gz`); if (!fs.existsSync(f)) continue
  const tr = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), slot = tr.slot, F = tr.frames
  for (const d of tr.dmg) {
    if (d[1] === slot && d[2] !== slot && d[2] < 100) { outAll += d[3]; if (d[6]) outRear += d[3] }
    if (d[2] === slot && d[1] >= 0 && d[1] < 100 && d[1] !== slot) { inAll += d[3]; if (d[6]) inRear += d[3] }
  }
  for (const fr of F) { if (!fr.g) continue; if (fr.ch) (fr.b ? chVb : chV).push(fr.v); else if (!fr.b && fr.v > 1.5) walkV.push(fr.v) }
  const lz = tr.events.filter((e) => e.e === 'laser' && e.id === slot && e.mh > 0)
  for (const e of lz) {
    const d = tr.dmg.find((x) => x[1] === slot && x[4] === 'laser' && Math.abs(x[0] - e.t) < 0.11)
    if (!d) continue
    lzR.push(d[5]); lzHpPre.push(d[7] + d[3])
    if (e.frac < 0.99) partialR.push([Math.round(e.frac * 100) / 100, Math.round(d[3]), Math.round(d[7] + d[3]), d[6] ? 'rear' : 'front', d[7] <= 0 ? 'KILL' : 'no'])
  }
  for (const k of tr.deaths.filter((x) => x.by === slot)) { kills++; const last = tr.dmg.filter((x) => x[1] === slot && x[2] === k.id && x[0] <= k.t + 1e-6).pop(); if (last && last[6]) killsRear++ }
  // cubes picked within 6 s after one of our kills
  for (const c of tr.cubes) { cubesTot++; if (tr.deaths.some((k) => k.by === slot && c[0] >= k.t && c[0] - k.t <= 8)) cubesFromKills++ }
}
const med = (a) => { const b = a.slice().sort((p, q) => p - q); return b.length ? Math.round(b[b.length >> 1] * 10) / 10 : '-' }
console.log(`${tag}: rear share of damage dealt to mechs ${Math.round(100 * outRear / outAll)}%, rear share taken ${Math.round(100 * inRear / inAll)}%; killing blows from behind ${killsRear}/${kills}`)
console.log(`  ground speed med: charging no boost ${med(chV)} (n ${chV.length}), charging + boost ${med(chVb)} (n ${chVb.length}), walking ${med(walkV)}`)
console.log(`  laser hits: range med ${med(lzR)} m, target hp before hit med ${med(lzHpPre)}; cube pickups within 8 s after our kills ${cubesFromKills}/${cubesTot}`)
console.log(`  partial releases [frac, dmg, target hp before, side, result]: ${partialR.slice(0, 30).map((x) => x.join('/')).join('  ')}`)
