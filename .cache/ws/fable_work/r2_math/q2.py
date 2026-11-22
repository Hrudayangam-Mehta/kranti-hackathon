import random
random.seed(5); S=1.4
def d(n,e=0.27,th=0.0): return round(sum(random.gauss(th,S)-random.gauss(e,S) for _ in range(n))) if n else 0
for (a,b,c) in ((4,2,2),(6,3,3)):
    B={}
    for _ in range(300000):
        DA=d(a);DB=d(b);nv=DA+DB+d(c);c0=DA+d(c);l0=DB+d(c)
        k='nv>=+1' if nv>=1 else ('nv 0..-2' if nv>=-2 else 'nv<=-3')
        r=B.setdefault(k,[0,0,0,0,0]); r[0]+=1; r[1]+=max(0,c0); r[2]+=c0>=1; r[3]+=max(0,l0); r[4]+=l0>=1
    for k,r in sorted(B.items()): print((a,b,c),k,'share %.2f'%(r[0]/3e5),'c0l10 yield %.2f P %.2f'%(r[1]/r[0],r[2]/r[0]),'low0 yield %.2f P %.2f'%(r[3]/r[0],r[4]/r[0]))
