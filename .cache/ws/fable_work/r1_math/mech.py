import math, random
random.seed(3)
Phi=lambda z: 0.5*(1+math.erf(z/math.sqrt(2)))
S=1.4
def null(m,e): return -e*m, S*math.sqrt(m*(2-m/48))
# families: (name, signed delta toward "fight on", m guess, e at the time)
lc=[('LC',3,14,.15),('low15',1,1,.21),('low10',2,1,.23),('cover1.0',1,1,.23),('cover2.0 rev',1,1,.21)]
other=[('FT3',1,1,.23),('fin30',0,1,.23),('oneHit',-1,1,.23),('LS35',-3,1,.23),('FIN',-5,4,.15)]
ret=[('healDoc',-10,10,.15),('LX',-2,6,.15)]
for nm,f in (('LC gate (fight on unless cover near / hp low)',lc),('other fight-on keys',other),('heal / exit more',ret)):
    for scale in (1,2):
        tot=sum(d for _,d,_,_ in f); mu=sum(null(m*scale,e)[0] for _,_,m,e in f); var=sum(null(m*scale,e)[1]**2 for _,_,m,e in f)
        z=(tot-mu)/math.sqrt(var); print(f"{nm}: m x{scale}: total {tot:+d}k, null mean {mu:+.1f}, sd {math.sqrt(var):.1f}, z {z:+.2f}, one-sided p {1-Phi(abs(z)):.2f}")
# sign evidence, small LC steps: 4 of 4 favourable
for pu in (0.37,0.42): print("P(4/4 up | null P(up)=%.2f) = %.3f ; BF vs P(up)=0.6: %.1f"%(pu,pu**4,0.6**4/pu**4))
# after a far value fails, value of the half step
N=400000;c=0;g=0;u=0
for _ in range(N):
    a=round(random.gauss(-.27,2));b=round(random.gauss(-.27,2))
    if a+b<=0: c+=1;g+=max(a,0);u+=a>0
print("far value (2 matches) not kept -> half step: E[gain] %.2fk, P(up) %.2f"%(g/c,u/c))
c=g=u=0
for _ in range(N):
    a=round(random.gauss(-.27,2));b=round(random.gauss(-.27,2))
    if a+b>0: c+=1;g+=max(a-(a+b),0);u+=a>a+b
print("far value kept -> half step beats it: E[extra] %.2fk, P %.2f"%(g/c,u/c))
