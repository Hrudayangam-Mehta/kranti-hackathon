const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'fb', s.fb, 'loseCover', s.loseCover, 'lcCoverS', P.lcCoverS, 'lcLowHpf', P.lcLowHpf, 'healDoc', s.healDoc, 'healEnterHp', P.healEnterHp, 'hfExit', P.hfExit, 'oneHit', s.oneHit, 'fightOn', s.fightOn, 'salt', P.salt)
