import json,sys,statistics as st
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f)]
for mode in ('squad','ffa'):
    R=[r for r in rows if r['mode']==mode]
    if not R: continue
    seeds=sorted(set(r['seed'] for r in R))
    by={(r['cfg'],r['seed']):r for r in R}
    cfgs=[c for c in ['ON','R1off','R2off','R3off','OFF'] if any((c,s) in by for s in seeds)]
    print(f"== {mode}: seeds {seeds}")
    print(f"{'cfg':6} {'n':>2} {'score':>6} {'se':>5} {'kills':>5} {'alive':>6} {'dealt':>6} {'taken':>6} {'cubes':>5} {'laser%':>6} {'steal':>5} {'done':>4} {'rearF':>5} {'deaths':>6} {'beamHit':>8} {'maxBlind':>8} {'maxMs':>5}")
    for c in cfgs:
        X=[by[(c,s)] for s in seeds if (c,s) in by]
        sc=[x['score'] for x in X]
        se=(st.stdev(sc)/len(sc)**0.5) if len(sc)>1 else 0
        las=sum(1 for x in X if 'laser' in (x['loadout'] or []))/len(X)*100
        ls=sum(x['laserShots'] for x in X); lh=sum(x['laserHits'] for x in X)
        print(f"{c:6} {len(X):>2} {st.mean(sc):6.2f} {se:5.2f} {st.mean(x['kills'] for x in X):5.2f} {st.mean(x['alive'] for x in X):6.1f} {st.mean(x['dealt'] for x in X):6.0f} {st.mean(x['taken'] for x in X):6.0f} {st.mean(x['cubes'] for x in X):5.2f} {las:6.0f} {sum(x['steals'] for x in X):5d} {sum(x['stealDone'] for x in X):4d} {sum(x['rearFaces'] for x in X):5d} {sum(x['deaths'] for x in X):6d} {f'{lh}/{ls}':>8} {max(x['maxBlind'] for x in X):8.1f} {max(x['maxMs'] for x in X):5.1f}")
    # paired deltas: ON minus each off config (positive = the request helps)
    for c in cfgs:
        if c=='ON': continue
        d=[by[('ON',s)]['score']-by[(c,s)]['score'] for s in seeds if ('ON',s) in by and (c,s) in by]
        if not d: continue
        se=(st.stdev(d)/len(d)**0.5) if len(d)>1 else 0
        w=sum(1 for v in d if v>0); l=sum(1 for v in d if v<0)
        print(f"  ON - {c:6}: mean {st.mean(d):+.2f} +- {se:.2f} (paired se, n={len(d)}), better {w} / worse {l} / same {len(d)-w-l}; per seed {d}")
