// lateral-only model: house first-order lead, no noise, sigma 0.6 deg spread, half-width 2.8 m
let seed=12345; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296}
const gauss=()=>Math.sqrt(-2*Math.log(rnd()+1e-12))*Math.cos(2*Math.PI*rnd())
function run(R, vmax, mode, lo, hi, lat){
  const a=58.5, dt=0.005, T=R/252, sig=R*Math.tan(0.6*Math.PI/180), N=4000/dt
  let x=0,v=0,sign=1,next=0,hits=0,shots=0,lastFlip=-9; const q=[]; const hist=[]
  let mag=0, nextShot=0.3
  for(let i=0;i<N;i++){ const t=i*dt
    hist.push([x,v])
    if(mode==='iv' && t>=next){ sign=-sign; next=t+lo+(hi-lo)*rnd(); }
    if(t>=nextShot){ // shooter sees state lat seconds ago
      const h=hist[Math.max(0,i-Math.round(lat/dt))]
      q.push([t+T, h[0]+h[1]*(T+lat)+gauss()*sig]); shots++
      mag++; if(mag>=12){mag=0; nextShot=t+2.8}else nextShot=t+0.3
      if(mode==='react' && t-lastFlip>=0.4){ sign=-sign; lastFlip=t }   // reverse as each bullet leaves
    }
    const tv=mode==='stand'?0:sign*vmax, e=tv-v; v+=Math.sign(e)*Math.min(Math.abs(e),a*dt); x+=v*dt
    while(q.length&&q[0][0]<=t){ if(Math.abs(q[0][1]-x)<2.8) hits++; q.shift() }
  }
  return hits/shots
}
const Rs=[50,75,90,100,115,130,150,170,185,200]
const rows=[['stand',11.7,'stand',0,0],['const',11.7,'const',0,0],['d4 .8-1.6',11.7,'iv',.8,1.6],['fast .45-1.15',11.7,'iv',.45,1.15],['.35-.6',11.7,'iv',.35,.6],['.5-.7',11.7,'iv',.5,.7],['react/bullet',11.7,'react',0,0],
 ['charge d4',5.85,'iv',.8,1.6],['charge .5-.7',5.85,'iv',.5,.7],['charge react',5.85,'react',0,0],['boost d4',19.5,'iv',.8,1.6],['boost .5-.7',19.5,'iv',.5,.7],['boost react',19.5,'react',0,0],['boostcharge react',9.75,'react',0,0]]
for(const lat of [0,0.05]){ console.log('latency',lat,'  R:',Rs.join('  '))
 for(const r of rows){ console.log(r[0].padEnd(18), Rs.map(R=>(run(R,r[1],r[2],r[3],r[4],lat)*100).toFixed(0).padStart(3)).join('  ')) } }
// matched interval I = k*T
console.log('matched I=k*T (walk)'); for(const k of [0.6,0.8,1,1.3,1.6,2]) console.log(('k='+k).padEnd(18), Rs.map(R=>{const T=R/252,I=Math.max(0.3,k*T);return (run(R,11.7,'iv',I*0.85,I*1.15,0.05)*100).toFixed(0).padStart(3)}).join('  '))
