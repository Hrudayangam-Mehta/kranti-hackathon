const S='/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const names=['SW_PM_s1','SW_ID_s1','SW_UTtgt_s1','SW_UT_s1','SW_DL_s1','SW_DLidle_s1','SW_UF_s1','SW_UTwait_s1','SW_FUwork_s1']
const flat=(o,p='',r={})=>{for(const k of Object.keys(o)){const v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,p+k+'.',r);else r[p+k]=JSON.stringify(v)}return r}
const d=(a,b)=>{a=flat(a);b=flat(b);return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>a[k]!==b[k]).map(k=>`${k}: ${b[k]} -> ${a[k]}`)}
const fnv=(await import(S+'/variants6/FNV_s1/bot/lib/params.js')).resolveParams()
const nc=(await import(S+'/fable_work/switch/builds/SW_NC_s1/bot/lib/params.js')).resolveParams()
const ck=(await import(S+'/r7work/ckpt_07_LG/lib/params.js')).resolveParams()
const tr=(await import(S+'/fable_work/switch/tree/lib/params.js')).resolveParams()
console.log('NC salt',nc.salt,'FNV salt',fnv.salt)
console.log('NC vs FNV_s1 resolved:\n  '+d(nc,fnv).join('\n  '))
console.log('tree default vs ckpt_07 default resolved:\n  '+d(tr,ck).join('\n  '))
for(const n of names){const p=(await import(S+'/fable_work/switch/builds/'+n+'/bot/lib/params.js')).resolveParams();console.log(n,'salt',p.salt,'vs NC:',d(p,nc).join('; '))}
