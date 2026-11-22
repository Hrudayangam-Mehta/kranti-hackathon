const S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const flat=(o,p='',r={})=>{for(const k of Object.keys(o)){const v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,p+k+'.',r);else r[p+k]=JSON.stringify(v)}return r}
const d=(a,b)=>{a=flat(a);b=flat(b);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]).map(k=>`${k}: ${b[k]} -> ${a[k]}`)}
const fnvM=await import(S+'/variants6/FNV_s1/bot/lib/params.js'); const fnv=fnvM.resolveParams()
const CH1={focus:'kill',laserGrab:'spawn',cubes:'snow',laserRange:'midsq',boostCharge:'on',farmHp:'50sq',cratePath:'80',upg:'laser',upgFix:'on'}
const exp={CH1_s1:[CH1,1],CH1_s2:[CH1,2],CH1_s3:[CH1,3],CH1DL_s1:[{...CH1,dropLife:'on'},1],CH1AL_s1:[{...CH1,alpha:'on'},1],CH1PM_s1:[{...CH1,pauseMove:'on',isoDwell:'on',strafe:'fast75'},1]}
const newOld={cubes:'off',boostCharge:'off',cratePath:'std',alpha:'off',fuse:'wall',dropLife:'off',util:'off',pauseMove:'off',isoDwell:'off',upgFix:'off'}
let ref=null
for(const n of Object.keys(exp)){
  const m=await import(S+'/fable_work/chaos/builds/'+n+'/bot/lib/params.js'); const sel=m.SELECT
  const want={...fnvM.SELECT}; // insert new keys
  const full={...newOld,...fnvM.SELECT,...exp[n][0]}
  const diffs=[...new Set([...Object.keys(sel),...Object.keys(full)])].filter(k=>sel[k]!==full[k]).map(k=>k+':'+sel[k]+'/'+full[k])
  const vsF=Object.keys(sel).filter(k=>sel[k]!==fnvM.SELECT[k]).map(k=>k+':'+fnvM.SELECT[k]+'->'+sel[k])
  const p=m.resolveParams()
  console.log(n,'keys',Object.keys(sel).length,'last',Object.keys(sel).slice(-6).join(','),'salt',p.salt,'expSalt',exp[n][1],'diffVsExpected',diffs.join(',')||'none')
  console.log('   SELECT vs FNV_s1:',vsF.join(', '))
  if(!ref){ref=p;console.log('   resolved vs FNV_s1:\n     '+d(p,fnv).join('\n     '))} else console.log('   resolved vs CH1_s1: '+d(p,ref).join('; '))
}
for(const t of ['tree','tree2']){const m=await import(S+'/fable_work/chaos/'+t+'/lib/params.js');const p=m.resolveParams({select:{...fnvM.SELECT,...newOld},salt:1});console.log(t,'with FNV select + old values, resolved vs FNV_s1:\n     '+d(p,fnv).join('\n     '))}
console.log('FNV SELECT keys',Object.keys(fnvM.SELECT).length, JSON.stringify(fnvM.SELECT))
