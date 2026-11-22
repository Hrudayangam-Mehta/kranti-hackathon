// Best-of allocation Monte Carlo (panel R7, bestof). Pure arithmetic; no game code.
let s=12345; const U=()=>{s=(s*1664525+1013904223)>>>0; return (s+0.5)/4294967296}
const G=()=>Math.sqrt(-2*Math.log(U()))*Math.cos(2*Math.PI*U())
const erf=x=>{const t=1/(1+0.3275911*Math.abs(x));const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return x>=0?y:-y}
const Phi=z=>0.5*(1+erf(z/Math.SQRT2)), S=0.24, N=100, R=4000, CUTS=[5.6,5.8,5.9]
const f=(x,d=3)=>x.toFixed(d)
{ let o=[]; for(const n of [1,2,4,8,16,32,64,100]){let a=0;for(let r=0;r<20000;r++){let m=-9;for(let i=0;i<n;i++)m=Math.max(m,G());a+=m} o.push(n+':+'+f(S*a/20000,2))} console.log('E[max of n draws] above the arm mean:',o.join(' ')) }
console.log('P(at least one of n draws >= cut) by arm mean  [per-draw p | n=20 | n=50 | n=100]')
for(const mu of [5.03,5.1,5.2,5.3,5.4,5.5]) console.log(' mean',mu, [5.4,5.6,5.8,5.9].map(c=>{const p=1-Phi((c-mu)/S);return `cut ${c}: ${p.toExponential(1)} | ${[20,50,100].map(n=>f(1-(1-p)**n,2)).join(' | ')}`}).join('   '))
console.log('slot multiplier of a mean gain d when the target sits z sd above the mean: p(mu+d)/p(mu)')
for(const z of [2,2.5,3,3.5]) console.log(' z',z,[0.05,0.1,0.15,0.2,0.3].map(d=>`+${d}: x${f((1-Phi(z-d/S))/(1-Phi(z)),1)}`).join('  '))
function sim(policy,K,tau,m0,lead0=5.03){
  const hit=[0,0,0]; let pickGap=0
  for(let r=0;r<R;r++){
    const mu=[lead0+0.09*G()]; for(let i=1;i<=K;i++)mu.push(mu[0]+m0+tau*G())
    const sum=new Array(K+1).fill(0), cnt=new Array(K+1).fill(0); let best=5.19,left=N
    const pull=(i,n=1)=>{n=Math.min(n,left);for(let k=0;k<n;k++){const x=mu[i]+S*G();sum[i]+=x;cnt[i]++;if(x>best)best=x}left-=n}
    const post=i=>{const pm=i?lead0+m0:lead0, pv=i?tau*tau+0.0081:0.0081, v=1/(1/pv+cnt[i]/(S*S));return [v*(pm/pv+sum[i]/(S*S)),v]}
    const argmax=g=>{let b=0,bv=-1e9;for(let i=0;i<=K;i++){const v=g(i);if(v>bv){bv=v;b=i}}return b}
    if(policy==='leader')pull(0,N)
    else if(policy==='screen1'||policy==='screen2'){const k=+policy.slice(6);for(let i=1;i<=K;i++)pull(i,k);pull(argmax(i=>post(i)[0]),left)}
    else if(policy==='halving'){let alive=[...Array(K+1).keys()],per=1
      while(alive.length>2&&left>0){for(const i of alive)pull(i,per);alive.sort((a,b)=>post(b)[0]-post(a)[0]);alive=alive.slice(0,Math.max(2,alive.length>>1));per*=2}
      while(left>0){alive.sort((a,b)=>post(b)[0]-post(a)[0]);pull(alive[0],2);pull(alive[1],1)}}
    else if(policy==='thompson'){while(left>0)pull(argmax(i=>{const [m,v]=post(i);return m+Math.sqrt(v)*G()}))}
    else if(policy==='pi'){ // probability of improvement over target T=5.8 using predictive sd
      while(left>0)pull(argmax(i=>{const [m,v]=post(i);return -(5.8-m)/Math.sqrt(v+S*S)}))}
    CUTS.forEach((c,j)=>{if(best>=c)hit[j]++}); pickGap+=mu[argmax(i=>cnt[i]?post(i)[0]:-9)]-mu[0]
  }
  return hit.map(h=>f(h/R,2)).join(' / ')+'   true mean of final favourite vs leader '+(pickGap/R>=0?'+':'')+f(pickGap/R,2)
}
for(const [tau,m0] of [[0.10,-0.03],[0.15,-0.03],[0.25,-0.05],[0.15,-0.10],[0.05,-0.05]]){
  console.log(`\nchange effect ~ N(${m0}, ${tau}^2); P(best >= 5.6 / 5.8 / 5.9) after 100 slots`)
  console.log('  leader re-draws only '.padEnd(24),sim('leader',1,tau,m0))
  for(const K of [8,16,30]) for(const pol of ['screen1','screen2','halving','thompson','pi']) console.log(`  K=${K} ${pol}`.padEnd(24),sim(pol,K,tau,m0))
}
