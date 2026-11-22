# Panel 5 (game design): loadout, upgrade and zone economics from hello.config defaults.
import json, math, sys
cfg = json.load(open(sys.argv[1]))['config']
W = cfg['weapons']; M = cfg['mech']; Z = cfg['zone']; C = cfg['cubes']

def gun_sust(dmg=45, cd=0.24, mag=12, rel=2.4):
    return dmg*mag/((mag-1)*cd+rel), dmg/cd
print('--- weapons (0 cubes, 100% hits)')
s,b = gun_sust(); print('gun sustained %.1f burst %.1f mag_time %.2f' % (s,b,11*0.24))
L=W['laser']; cyc=L['charge']+L['cooldown']
print('laser full %.0f per %.2fs = %.1f dps; tap(0.15s) %.0f per %.2fs = %.1f dps' % (L['damage'],cyc,L['damage']/cyc,
      L['damage']*(L['min_frac']+(1-L['min_frac'])*L['min_charge']/L['charge']), L['min_charge']+L['cooldown'],
      L['damage']*(L['min_frac']+(1-L['min_frac'])*L['min_charge']/L['charge'])/(L['min_charge']+L['cooldown'])))
Li=W['lightning']; dps=Li['damage']/Li['cooldown']; eps=Li['energy']/Li['cooldown']
print('lightning %.0f dps, %.0f energy/s, tank %.2fs = %.0f dmg; chained x%.2f = %.0f dps' % (dps,eps,M['energy']/eps,dps*M['energy']/eps,1+.7+.49,dps*2.19))
for n,(e,d) in enumerate([(3,60),(3*.65,66),(3*.65*.65,72.6)]):
    print('  efficiency x%d: tank %.1fs %.0f dmg' % (n, 100/(e/0.25), d/0.25*100/(e/0.25)))
Mo=W['mortar']; print('mortar direct+splash %.0f per %.1fs = %.0f dps max; replay ~%.0f dmg/shell -> %.0f dps' % (Mo['damage']+Mo['splash'],Mo['cooldown'],(Mo['damage']+Mo['splash'])/Mo['cooldown'], (4*360+14*110)/57,(4*360+14*110)/57/Mo['cooldown']))
print('cook-off beam on mortar holder: %.0f front, %.0f rear' % (315*1.6, 315*1.6*1.5))

print('--- gun upgrades, sustained/burst % change')
base_s,base_b=gun_sust()
for name,kw in [('gun_damage',dict(dmg=45*1.15)),('gun_rate',dict(cd=0.24*0.87)),('gun_mag',dict(mag=20,rel=2.4*0.8)),('gun_mag x2',dict(mag=28,rel=2.4*0.64)),
                ('mag+rate',dict(mag=20,rel=1.92,cd=0.24*.87)),('mag+dmg',dict(mag=20,rel=1.92,dmg=45*1.15))]:
    s,b=gun_sust(**kw); print('%-12s sustained %.1f (%+.1f%%) burst %.1f (%+.1f%%)' % (name,s,100*(s/base_s-1),b,100*(b/base_b-1)))
print('--- laser breakpoints: beams to kill 1400 HP, TTK')
for c in (0,3,5,10):
    for n in (0,1,2,3):
        d=315*(1+0.04*c)*1.18**n; k=math.ceil(1400/d); print('c=%2d lens=%d beam %.0f -> %d beams, TTK %.2fs' % (c,n,d,k,0.75+(k-1)*2.4))
print('laser_charge: cycle %.3f -> %.3f (%+.1f%%), x2 %.3f (%+.1f%%)' % (2.4,0.75*.75+1.65,100*(2.4/(0.75*.75+1.65)-1),0.75*.5625+1.65,100*(2.4/(0.75*.5625+1.65)-1)))

print('--- kill cycle C = tau(1+a/r)+delta ; kills per 100 s')
def cyc(b,a=31,r=45,delta=5,h=1400): tau=h/b; return tau*(1+a/r)+delta
for lo,bg,bl in [('gun only',64,0),('gun+laser',64,111)]:
    base=cyc(bg+bl); print(lo,'b=%.0f tau=%.1f C=%.1f' % (bg+bl,1400/(bg+bl),base))
    rows=[('nanites',dict(r=72,delta=3.5),bg+bl),('nanites x2',dict(r=115.2,delta=2.0),bg+bl),('armor',dict(a=31*.92),bg+bl),
          ('gun_damage',{},bg*1.15+bl),('gun_mag',{},bg*1.297+bl),('gun_rate',{},bg*1.073+bl),('gun_velocity(+20% hits)',{},bg*1.2+bl)]
    if bl: rows+= [('laser_damage',{},bg+bl*1.18),('laser_charge',{},bg+bl*1.085)]
    for nm,kw,b in rows:
        c=cyc(b,**kw); print('   %-26s C=%.1f  kill rate %+.1f%%' % (nm,c,100*(base/c-1)))
print('--- EHP')
for p in range(4):
    for a in range(4):
        print('plating %d armor %d: HP x%.3f, weapon-EHP x%.3f' % (p,a,1.15**p,1.15**p/(1-0.08*a)))
print('usable HP gain (H-350): plating %+.1f%%, armor %+.1f%%' % (100*((1610-350)/1050-1),100*((1400/0.92-350)/1050-1)))
print('max HP at c=10: base %.0f, +1/2/3 plating %.0f %.0f %.0f ; finale seconds at 260/s: %s' % (1400*1.4,1400*1.4*1.15,1400*1.4*1.15**2,1400*1.4*1.15**3,[round(1400*1.4*1.15**k/260,1) for k in range(4)]))
print('regen 50->90%% of 1400: base %.1fs, nanites %.1fs, x2 %.1fs' % (5+560/45,3.5+560/72,2+560/115.2))
print('--- mobility')
def duty(drain,regen): return regen/(drain+regen)
for nm,dr,rg,wk,bs in [('base',17,18,11.7,19.5),('reactor',17,23.4,11.7,19.5),('jets',12.75,18,11.7,19.5),('jets x2',9.5625,18,11.7,19.5),('servos',17,18,11.7*1.08,19.5*1.08)]:
    f=duty(dr,rg); print('%-8s boost duty %.2f mean speed %.2f m/s' % (nm,f,f*bs+(1-f)*wk))
print('sprint gain on a walker per tank: base %.1f m, capacitor %.1f m, jets %.1f m' % ((19.5-11.7)*100/17,(19.5-11.7)*130/17,(19.5-11.7)*100/12.75))
print('jet climb: base %.0f m, capacitor %.0f m, jets %.0f m (8.9 m/s)' % (8.9*100/15,8.9*130/15,8.9*100/11.25))
print('--- size / dodge range by cubes')
for c in (0,5,10,13,15,21):
    R=2.5*(1+0.05*c); print('c=%2d R=%.2f height=%.1f dodge range %.0f m (rail barrel %.0f) band scale %.3f' % (c,R,9*(1+0.05*c),252*math.sqrt(2*(R+0.3)/58.5),315*math.sqrt(2*(R+0.3)/58.5),math.sqrt((R+0.3)/2.8)))
print('--- zone timeline')
t=0; r=Z['start_radius']
for i,ph in enumerate(Z['phases']):
    hs,ss,nr,dps=ph['hold_s'],ph['shrink_s'],ph['radius'],ph['dps']
    print('phase %d: hold %3d-%3d, shrink %3d-%3d, R %3d->%3d, dps %3d, edge %.2f m/s (far side worst %.2f), 1400 HP lasts %.1fs outside' % (i+1,t,t+hs,t+hs,t+hs+ss,r,nr,dps,(r-nr)/ss,2*(r-nr)/ss,1400/dps))
    t+=hs+ss; r=nr
print('offer pool: P(specific upgrade among 3 of N): N=13 %.3f, N=16 %.3f, N=19 %.3f' % (3/13,3/16,3/19))
def pany(N,k): return 1-math.comb(N-k,3)/math.comb(N,3)
print('P(at least one of k wanted): N=13,k=3 %.2f; N=16,k=3 %.2f ; N=16,k=5 %.2f ; N=13,k=5 %.2f' % (pany(13,3),pany(16,3),pany(16,5),pany(13,5)))
