import math
H0=1400; gun_burst=45/0.24; mag=12; cd=0.24; rl=2.4
cyc=(mag-1)*cd+rl+cd   # 12 shots then reload: period = 12*0.24+2.4 = 5.28? first shot t0, 12th at 2.64, reload 2.4, next at 5.04
cyc2=(mag-1)*cd+rl
print('gun burst dps',gun_burst,'sustained (period 5.04)',mag*45/cyc2,'(period 5.28)',mag*45/cyc)
laser=315/(0.75+1.65)
print('laser dps',laser,'lightning dps',60/0.25, 'lightning energy/s',3/0.25,'seconds on 100 energy',100/12, 'damage per 100 energy',100/3*60)
# cycle time per kill in 1v1 phase
def cycle(h=1400,b=64,a=31,r=45,d=5): 
    tau=h/b; taken=a*tau; return tau, taken, tau+d+taken/r
for label,kw in [('gun q.6 vs a=31',dict()),('gun q.8',dict(b=86)),('gun+laser b=170',dict(b=170)),('gun+laser, nanites1',dict(b=170,r=72,d=3.5)),('gun q.6 nanites1',dict(r=72,d=3.5)),('gun q.6 nanites2',dict(r=115,d=2)),('gun q.6 a=54 no cover',dict(a=54)),('gun q.6 a=86 med close',dict(a=86))]:
    tau,taken,c=cycle(**kw); print('%-28s tau %.1f s  taken %.0f HP  cycle %.1f s  kills/200s %.1f'%(label,tau,taken,c,200/c))
# kills from one bar, n simultaneous hunters all LOS (square) vs one at a time (linear)
def kills_square(rho,n):
    # rho = (H*b)/(h*a): bar lasts rho "hunter-kill-times" of single-hunter fire
    dmg=0;k=0
    for j in range(n):
        dmg+= (n-j)   # in units of a*tau
        if dmg<=rho: k+=1
        else: break
    return k
def kills_linear(rho,n,m=1):
    dmg=0;k=0
    for j in range(n):
        dmg+= min(m,n-j)
        if dmg<=rho: k+=1
        else: break
    return k
print('rho  n=2 n=3 n=5 n=10 (all LOS) | cap m=1 | cap m=2 (n=10)')
for rho in [1,1.5,2,3,4,5,6,8,10,15]:
    print(rho,[kills_square(rho,n) for n in (2,3,5,10)], kills_linear(rho,10,1), kills_linear(rho,10,2))
# cube power
for c in (0,2,4,6,8,10): print('cubes',c,'HP x dmg power',round((1+0.04*c)**2,3),'radius',2.5*(1+0.05*c))
# FFA duel threshold
print('A  p*(s=.5,s+=.5)  p*(s=.5,s+=.55) p*(s=.6,s+=.65)')
for A in (16,12,8,6,4,3,2):
    f=lambda s,sp:(A-1)*s/(1+(A-2)*sp)
    print(A, round(f(.5,.5),2), round(f(.5,.55),2), round(f(.6,.65),2))
# zone timeline
t=0
for hold,sh,r,dps in [(60,50,380,20),(45,40,240,35),(35,35,140,60),(30,30,70,100),(25,25,25,160),(15,25,0,260)]:
    print('phase hold %d-%d shrink %d-%d -> r=%d dps %d'%(t,t+hold,t+hold,t+hold+sh,r,dps)); t+=hold+sh
# end HP pools
for c,pl in [(0,0),(4,0),(10,0),(10,1),(10,2),(10,3)]:
    hp=1400*(1+0.04*c)*1.15**pl; print('cubes',c,'plating',pl,'HP',round(hp),'seconds at 260/s',round(hp/260,2))
