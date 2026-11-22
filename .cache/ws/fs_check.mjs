const dir = process.argv[2]
const m = await import(dir + '/bot/lib/params.js')
const P = m.resolveParams({})
const s = P.selected
console.log(dir.split('/').pop(), 'aggr', s.aggr, 'fb', s.fb, 'ffaProx', JSON.stringify(P.ffaProx), 'ffaHealExit', P.ffaHealExit, 'loseCover', s.loseCover, 'lcCoverS', P.lcCoverS, 'lcLowHpf', P.lcLowHpf, 'loseCoverNear', P.loseCoverNear, 'seekCrowd', s.seekCrowd, 'h50CrowdR', P.h50CrowdR, 'finish', s.finish, 'loseExit', s.loseExit, 'laserGrab', s.laserGrab, 'salt', P.salt)
