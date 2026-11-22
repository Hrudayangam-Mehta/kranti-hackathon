const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'fb', s.fb, 'loseCover', s.loseCover, 'lcCoverS', P.lcCoverS, 'lcLowHpf', P.lcLowHpf, 'oneHit', s.oneHit, 'lose1/2/3', P.lose1Hpf, P.lose2Hpf, P.lose3Hpf, 'salt', P.salt)
