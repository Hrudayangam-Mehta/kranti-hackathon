const S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const logSel = { laserRange: 'far', healExit: '70', farmHp: '90', strafe: 'd4', ffaPair: 'on', beamClue: 'off', gunlessClue: 'off', idlePull: 'off', env: 'auto',
  ffaCounters: 'on', ffaRules: 'on', aimDwell: 'off',
  R1: 'on', crateGate: 'ffa', R2: 'on', R3: 'on', aimCal: 'off', openFarm: 'on', cxFinish: 'on', cxKiterRamp: 'on', cxBrawler: 'off', ffaThirdFix: 'on', ffaBreakFix: 'on', hidePlanCap: 'on',
  pass2b: 'on',
  fightEarly: 'on', laserEcon: 'off', focus: 'mult', retreat: 'd3', boost: 'spend', upg: 'std',
  ffaDropGate: 'on', finalPoint: 'on', ffaTwo: 'on', ffaThree: 'on', ffaGate: 'on',
  hunt: 'off', seek: 'on', aggr: 'any70f',
  r3a2: 'on', pocketCfg: 'on', io: 'v4', ioMerge: 'on', loseExit: 'off', loseCover: 'never', oneHit: 'off', fightOn: 'off', finish: 'off', isolate: 'any', seekCrowd: 'off', laserGrab: 'std', anchorCfg: 'on', warmPocket: 'on', fb: 'on',
  fuse: 'wall', dropLife: 'off', util: 'off', pauseMove: 'off', isoDwell: 'off', upgFix: 'off', healDoc: 'off' }
const one = { SW_NC_s1:{}, SW_FUwork_s1:{fuse:'work'}, SW_DL_s1:{dropLife:'on'}, SW_DLidle_s1:{dropLife:'idle'}, SW_UTtgt_s1:{util:'tgt'}, SW_UTwait_s1:{util:'wait'}, SW_UT_s1:{util:'on'}, SW_PM_s1:{pauseMove:'on'}, SW_ID_s1:{isoDwell:'on'}, SW_UF_s1:{upgFix:'on'} }
const fnv = await import(S+'/variants6/FNV_s1/bot/lib/params.js')
const out = {}
for (const n of Object.keys(one)) {
  const m = await import(S+'/fable_work/switch/builds/'+n+'/bot/lib/params.js')
  const exp = { ...logSel, ...one[n] }
  const sel = m.SELECT
  const keysOk = JSON.stringify(Object.keys(sel)) === JSON.stringify(Object.keys(exp))
  const diffs = [...new Set([...Object.keys(sel), ...Object.keys(exp)])].filter(k => sel[k] !== exp[k]).map(k => k+':'+sel[k]+'/'+exp[k])
  const vsF = [...new Set([...Object.keys(sel), ...Object.keys(fnv.SELECT)])].filter(k => sel[k] !== fnv.SELECT[k]).map(k => k+':'+sel[k]+'/'+fnv.SELECT[k])
  console.log(n, 'keys', Object.keys(sel).length, 'orderOk', keysOk, 'diffVsLog', diffs.join(',')||'none', '| vsFNV_s1:', vsF.join(','))
  out[n] = m
}
console.log('exports', Object.keys(out.SW_NC_s1))
globalThis.__m = out
