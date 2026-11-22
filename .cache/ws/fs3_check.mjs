const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'fb', s.fb, 'loseCover', s.loseCover, 'lcLowHpf', P.lcLowHpf, 'oneHit', s.oneHit, 'fightOn', s.fightOn, 'finishHpf', P.finishHpf, 'finishThreats', P.finishThreats, 'lastStandHpf', P.lastStandHpf, 'salt', P.salt)
