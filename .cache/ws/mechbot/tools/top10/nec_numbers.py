# Scratch arithmetic for the "not even close" study (own model, published balance numbers only).
import math, itertools
WALK, BOOST, G, JUMP, JET_ACC, RISE_MAX, JET_DRAIN, AIR_ACC = 11.7, 19.5, 22.0, 11.0, 34.0, 10.0, 15.0, 12.0
# 1) opening: jump + jets for 4 s (net up-accel assumed jet_acc - g), horizontal air accel toward a 60 deg rotated heading
dt=0.05; t=0; z=0; vz=JUMP; e=100; vx=0; x=0; zmax=0
while t<4.0:
    if e>0:
        a = JET_ACC-G if vz<RISE_MAX else -G if vz>RISE_MAX else 0
        e-=JET_DRAIN*dt
    else: a=-G
    vz=min(vz+a*dt, max(vz,RISE_MAX)) if e>0 else vz+a*dt
    z+=vz*dt; zmax=max(zmax,z)
    vx=min(vx+AIR_ACC*dt, BOOST); x+=vx*dt; t+=dt
tf=0
while z>0: vz-=G*dt; z+=vz*dt; x+=vx*dt; tf+=dt
print(f"opening hop: apex ~{zmax:.0f} m at t=4 s, energy left {e:.0f}, lands t~{4+tf:.1f} s, ground track ~{x:.0f} m (60 deg off route)")
# 2) band movement: radial (+1 or -0.7) mixed with 0.9 lateral, normalised
for name,r in (("approach",1.0),("back-off",-0.7)):
    f=r/math.hypot(r,0.9); print(f"{name}: radial share {f:+.2f} -> {f*WALK:+.1f} m/s walking, {f*BOOST:+.1f} m/s if boosting")
# 3) zone squeeze: radius schedule and the time the radius drops below the back-off threshold
ph=[(60,50,380),(45,40,240),(35,35,140),(30,30,70),(25,25,25),(15,25,0)]
def radius(tt):
    t0=0; r0=560
    for h,s,r in ph:
        if tt<t0+h: return r0
        if tt<t0+h+s: return r0+(r-r0)*(tt-t0-h)/s
        t0+=h+s; r0=r
    return 0
for thr,lab in ((130,"this bot, laser band 145 +-15"),(95,"TTUN laser band 110 +-15"),(55,"gun-only band 70 +-15")):
    tt=next(t/10 for t in range(0,4200) if radius(t/10)<thr)
    print(f"current radius < {thr} m from t={tt:.0f} s ({lab})")
# 4) laser cycle: charge 0.75 + cooldown 1.65 -> share of time at half speed, gun silent while laser focused
cyc=0.75+1.65; print(f"laser cycle {cyc:.2f} s; charging share {0.75/cyc:.0%}; 'laser focus' (charge or cd<0.2) share {(0.75+0.2)/cyc:.0%}")
# 5) gun silent while focused if lateral offset v*tof exceeds 1.2*atan(2.2/d)*d
for d in (70,100,145):
    tol=1.2*math.atan2(2.2,d)*d; tof=d/252
    print(f"d={d} m: gun gate {tol:.1f} m, flight {tof:.2f} s -> gun stays silent on targets crossing faster than {tol/tof:.1f} m/s while its laser is charging")
# 6) laser release window after the charging flag rises (full charge 0.75, release gate at 0.70) and distance we can cover
for lat in (0.1,0.2):
    w=0.70-lat
    print(f"react after {lat:.1f} s: {w:.2f} s left -> {w*WALK:.1f} m walking, {w*BOOST:.1f} m boosting to break the line")
# 7) permutation chance that the 2 hop builds are the top 2 of n exchangeable draws
for n in (4,5,6,7): print(f"n={n} builds: P(two hop builds are the top two by chance) = {1/math.comb(n,2):.2f}")
# 8) max-of-N gain for salt fishing with a draw SD s (normal order statistics, rough)
import statistics
for s in (0.12,0.18):
    for N in (4,8,12):
        # expected max of N standard normals (Blom approx)
        em = statistics.NormalDist().inv_cdf((N-0.375)/(N+0.25))
        print(f"draw SD {s}: best of {N} salts ~ mean + {em*s:.2f}")
