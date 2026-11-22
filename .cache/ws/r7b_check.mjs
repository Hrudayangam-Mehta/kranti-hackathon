const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'finish', s.finish, 'finTtk', P.finTtk, 'finB', P.finB, 'loseExit', s.loseExit, 'loseCover', s.loseCover, 'isolate', s.isolate, 'seekCrowd', s.seekCrowd, 'healDoc', s.healDoc, 'ioMerge', s.ioMerge, 'unengHpf', P.unengagedHpf, 'unengS', P.unengagedS, 'seekOn', P.seekOn, 'salt', P.salt)
