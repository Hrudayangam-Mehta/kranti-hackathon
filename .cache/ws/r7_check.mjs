const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
console.log(dir.split('/').pop(), 'unengHpf', P.unengagedHpf, 'unengS', P.unengagedS, 'seekHpf', P.h50SeekHpf, 'heal', P.healEnterHp, P.healExit, 'seekOn', P.seekOn, 'pulse', P.pulseRetreat, 'ioMerge', P.ioMerge, 'pocket', P.selected.pocketCfg, 'io', P.selected.io, 'aggr', P.selected.aggr, 'healDoc', P.selected.healDoc, 'salt', P.salt)
