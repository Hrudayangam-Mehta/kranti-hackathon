import random, statistics as st
random.seed(7)
MU=5.03; SM=0.20*48**0.5   # per-match sd so that a 48-mean has sd 0.20
def draw(): return random.gauss(MU,SM)
def bestof(N): return max(st.fmean(draw() for _ in range(48)) for _ in range(N))
def climb(N,m,start=None):
    x=[draw() for _ in range(48)]
    if start is not None:   # condition on a lucky start mean
        while abs(st.fmean(x)-start)>0.01: x=[draw() for _ in range(48)]
    best=st.fmean(x)
    for _ in range(N):
        idx=random.sample(range(48),m); y=x[:]
        for i in idx: y[i]=draw()
        if st.fmean(y)>best: x=y; best=st.fmean(y)
    return best
R=400
for N in (30,60,90):
    a=[bestof(N) for _ in range(R)]
    print('N',N,'bestof mean %.2f P>5.6 %.2f P>5.8 %.2f'%(st.fmean(a),sum(v>5.6 for v in a)/R,sum(v>5.8 for v in a)/R))
    for m in (3,6,12,24):
        c=[climb(N,m,5.19) for _ in range(R)]
        print('   climb from 5.19 m=%2d mean %.2f P>5.6 %.2f P>5.8 %.2f'%(m,st.fmean(c),sum(v>5.6 for v in c)/R,sum(v>5.8 for v in c)/R))
