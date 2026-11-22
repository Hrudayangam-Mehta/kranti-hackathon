const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
console.log(dir.split('/').pop(), 'unengagedHpf', P.unengagedHpf, 'unengagedS', P.unengagedS, 'h50SeekHpf', P.h50SeekHpf, 'healEnterHp', P.healEnterHp, 'healExit', P.healExit, 'seekOn', P.seekOn, 'pulse', P.pulseRetreat, 'salt', P.salt)
