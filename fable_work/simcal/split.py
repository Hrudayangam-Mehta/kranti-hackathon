import ana, math
FIT=['fightEarly_off','hunt_lite','healDoc_on','LG_wide','LX_on']; TEST=['retreat_d3','any70_s1','FIN_ttk','LC_near']
def score(rows):
    nz=[r for r in rows if r['off']!=0 and r['sim']!=0]; ag=sum((r['off']>0)==(r['sim']>0) for r in nz)
    off=[r['off'] for r in rows]; sim=[r['sim'] for r in rows]
    # weighted cost: mean squared error of sim vs official in units of combined noise is not usable (official noise dominates); report sign, pearson, spearman
    return f"sign {ag}/{len(nz)}  pearson {ana.pear(off,sim):+.2f}  spearman {ana.spear(off,sim):+.2f}  mean|sim-off| {sum(abs(a-b) for a,b in zip(off,sim))/len(rows):.1f} kills"
for t in ('default','e2'):
    rows={r['id']:r for r in ana.stepstats(t)}
    have=[i for i in FIT+TEST if i in rows]
    print(t,'steps available',len(have))
    print('  FIT ',score([rows[i] for i in FIT if i in rows]))
    print('  TEST',score([rows[i] for i in TEST if i in rows]))
    print('  ALL9',score([rows[i] for i in have]))
    for i in have: r=rows[i]; print(f"     {i:15s} off {r['off']:4d}  sim {r['sim']:6.1f} +- {r['se']:4.1f}  diff {r['diff']}/{r['n']}  {'FIT' if i in FIT else 'TEST'}")
