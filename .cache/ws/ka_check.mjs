const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
console.log(dir.split('/').pop(), 'unengagedHpf', P.unengagedHpf, 'unengagedS', P.unengagedS, 'h50SeekHpf', P.h50SeekHpf, 'seekOn', P.seekOn, 'pulseRetreat', P.pulseRetreat, 'focusAdd', P.focusAdd, 'farmHp', P.farmHp, 'salt', P.salt)
