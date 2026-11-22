const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'aggrHpf', P.aggrHpf, 'aggrFw', P.aggrFw, 'seekHpf', P.h50SeekHpf, 'fb', s.fb, 'loseCover', s.loseCover, 'lcCoverS', P.lcCoverS, 'lcLowHpf', P.lcLowHpf, 'seekCrowd', s.seekCrowd, 'isolate', s.isolate, 'finish', s.finish, 'salt', P.salt)
