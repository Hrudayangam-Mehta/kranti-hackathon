#!/usr/bin/env python3
"""cmp_m.py <m1 dir>: merged-tree identity gates. MX_base / CH1_s1 sides come from trunk/id (engineer T's recordings, same recorder)."""
import json, os, sys, glob
S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
M = sys.argv[1]; TG = S + '/fable_work/trunk/trunk/id/g1v'; TB = S + '/fable_work/trunk/trunk/id/g1v_b'
def path(n):
    for d in (M, TG, TB):
        if os.path.exists(os.path.join(d, n + '.meta.json')): return d
    return None
def meta(n):
    d = path(n); return json.load(open(os.path.join(d, n + '.meta.json'))) if d else None
def body(n):
    d = path(n); p = os.path.join(d, n + '.jsonl') if d else ''
    return open(p, 'rb').read() if d and os.path.exists(p) else None
bad = []; tot = {}
def pair(a, b, gate, tag):
    ma, mb = meta(a), meta(b)
    t = tot.setdefault(gate, [0, 0])
    if ma is None or mb is None: bad.append(f'{gate} {tag}: missing {a if ma is None else b}'); return None
    ba, bb = body(a), body(b)
    same = (ba == bb) if (ba is not None and bb is not None) else (ma['hash'] == mb['hash'] and ma['n'] == mb['n'])
    clean = all(m['fuse'] == 0 and m['errors'] == 0 for m in (ma, mb))
    if not clean: bad.append(f'{gate} {tag}: fuse/errors {ma["fuse"]},{ma["errors"]} / {mb["fuse"]},{mb["errors"]}')
    t[0] += 1; t[1] += same and clean
    if not same:
        if ba is not None and bb is not None:
            la, lb = ba.decode().split('\n'), bb.decode().split('\n')
            d = [i for i in range(max(len(la), len(lb))) if (la[i] if i < len(la) else None) != (lb[i] if i < len(lb) else None)]
            bad.append(f'{gate} {tag}: DIFFER {len(d)} decisions, first {d[0] + 1 if d else 0}')
        else: bad.append(f'{gate} {tag}: DIFFER (hash)')
    return same, ma, mb
TABLES = ['T0', 'T1', 'T2', 'T3'] + ['F%02d' % s for s in range(16)]
# G1v native slot 3: merged vs MX_base
for tn in TABLES:
    for sn, envs in (('kit', ('auto', 'squad', 'ffa')), ('l48', ('auto', 'squad')), ('l11', ('auto',)), ('l23p', ('auto',))):
        if sn in ('l11', 'l23p') and tn not in ('T0', 'T1', 'T2', 'T3'): continue
        for e in envs:
            pair(f'G1v_TM_{tn}_{sn}_{e}', f'G1v_MX_{tn}_{sn}_{e}', 'G1v', f'{tn} {sn} {e}')
            pair(f'G1v_TM_{tn}_{sn}_{e}', f'G1v_TR_{tn}_{sn}_{e}', 'info merged=trunk G1v', f'{tn} {sn} {e}')
# G1s: hello.slot = s, salt 2 in slot s
for s in range(16):
    tn = 'F%02d' % s
    for sn, e in (('kit', 'auto'), ('kit', 'squad'), ('l48', 'auto')): pair(f'G1s_TM_{tn}_{sn}_{e}_s{s}', f'G1s_MX_{tn}_{sn}_{e}_s{s}', 'G1s', f'{tn} {sn} {e} s{s}')
# flips act
acts = 0; nact = 0
for s in range(16):
    tn = 'F%02d' % s
    for sn, e in (('kit', 'auto'), ('kit', 'squad'), ('l48', 'auto')):
        a, b = meta(f'G1s_TM_{tn}_{sn}_{e}_s{s}'), meta(f'G1v_TM_T1_{sn}_{e}')
        if a and b: nact += 1; acts += a['hash'] != b['hash']
# G1x slot 3 = 0 3 5 9 A K Z a d z
for xn in ('X0', 'X3', 'X5', 'X9', 'XUA', 'XUK', 'XUZ', 'Xla', 'Xld', 'Xlz'):
    for sn in ('kit', 'l48'): pair(f'G1x_TM_{xn}_{sn}_auto', f'G1x_MX_{xn}_{sn}_auto', 'G1x', f'{xn} {sn}')
# VB: 'b' in slot 3 vs CH1_s1
vb = []
for sn, envs in (('kit', ('auto', 'squad')), ('l48', ('auto',)), ('l11', ('auto',)), ('l23p', ('auto',))):
    for e in envs:
        r = pair(f'VB_TM_b3_{sn}_{e}', f'VB_CH_{sn}_{e}', 'VB b3 = CH1_s1', f'{sn} {e}')
        if r: vb.append(f'{sn} {e} {"IDENTICAL" if r[0] else "DIFFER"} n={r[1]["n"]} hash {r[1]["hash"][:8]} offTick={r[1]["counters"].get("variantOffTick")}')
# VC: 'c' in slot 3 vs SV4 (FFA streams: all 'c')
vc = []
for sn, envs in (('kit', ('auto', 'squad')), ('l48', ('auto',)), ('l11', ('auto',)), ('l23p', ('auto',))):
    for e in envs:
        r = pair(f'VC_TM_c3_{sn}_{e}', f'VC_SV_{sn}_{e}', 'VC c3 = SV4', f'{sn} {e}')
        if r:
            c = r[1]['counters']; svk = {k: v for k, v in c.items() if k.startswith('sv')}
            vc.append(f'{sn} {e} {"IDENTICAL" if r[0] else "DIFFER"} n={r[1]["n"]} hash {r[1]["hash"][:8]} offTick={c.get("variantOffTick")} sv={svk}')
for sn in ('f1', 'f2', 'f3', 'f4'):
    r = pair(f'TFA_TM_cc_{sn}_auto', f'VC_SV_{sn}_auto', 'VC cc = SV4 (FFA streams, env auto)', sn)
    if r: vc.append(f'{sn} auto (cc) {"IDENTICAL" if r[0] else "DIFFER"} n={r[1]["n"]} offTick={r[1]["counters"].get("variantOffTick")}')
# T-F2 forced FFA: bb, cc == merged T1 == MX T1
tf = []
for sn in ('kit', 'f1', 'f2', 'f3', 'f4'):
    r1 = pair(f'TF2_TM_bb_{sn}_ffa', f'TF2_TM_T1_{sn}_ffa', 'T-F2 b', sn)
    r2 = pair(f'TF2_TM_cc_{sn}_ffa', f'TF2_TM_T1_{sn}_ffa', 'T-F2 c', sn)
    r3 = pair(f'TF2_TM_T1_{sn}_ffa', f'TF2_MX_T1_{sn}_ffa', 'T-F2 base = MX_base', sn)
    if r1 and r2 and r3: tf.append(f'{sn}: bb==T1 {r1[0]} cc==T1 {r2[0]} T1==MX {r3[0]} n={r1[1]["n"]} hash {r1[1]["hash"][:8]}')
for sd in (411, 412, 413, 414):
    r1 = pair(f'TF2f_TM_bb_ff{sd}', f'TF2f_TM_T1_ff{sd}', 'T-F2 b', f'sim {sd}')
    r2 = pair(f'TF2f_TM_cc_ff{sd}', f'TF2f_TM_T1_ff{sd}', 'T-F2 c', f'sim {sd}')
    r3 = pair(f'TF2f_TM_T1_ff{sd}', f'TF2f_MX_T1_ff{sd}', 'T-F2 base = MX_base', f'sim {sd}')
    if r1 and r2 and r3: tf.append(f'sim {sd}: bb==T1 {r1[0]} cc==T1 {r2[0]} T1==MX {r3[0]} n={r1[1]["n"]} kills={r1[1].get("kills")} place={r1[1].get("place")}')
info = []
for sn in ('f1', 'f2', 'f3', 'f4'):
    a, b = meta(f'TFA_TM_cc_{sn}_auto'), meta(f'TFA_TM_T1_{sn}_auto')
    if a and b:
        la, lb = body(f'TFA_TM_cc_{sn}_auto').decode().split('\n'), body(f'TFA_TM_T1_{sn}_auto').decode().split('\n')
        d = [i for i in range(max(len(la), len(lb))) if (la[i] if i < len(la) else None) != (lb[i] if i < len(lb) else None)]
        info.append(f'info auto {sn}: cc vs T1 differ {len(d)}/{a["n"]} decisions; offTick={a["counters"].get("variantOffTick")} firstForeign={a["firstForeignTick"]} latch={a["latchTick"]}')
# sims
def simset(pat):
    out = {}
    for f in glob.glob(pat):
        m = json.load(open(f)); out[int(m['a1'])] = m
    return out
sc = simset(M + '/SIMC_TM_cc_sq*.meta.json'); s1 = simset(M + '/SIMT1_TM_sq*.meta.json')
a4 = simset(S + '/fable_work/trunk/survive/sim/ALL4/sq*.meta.json'); fb = simset(S + '/fable_work/chaos/out/sim/base/sq*.meta.json'); c1 = simset(S + '/fable_work/chaos/out/sim/CH1/sq*.meta.json')
def summ(d, tag):
    if not d: return f'{tag}: none'
    return f'{tag}: n={len(d)} kills={sum(x["kills"] for x in d.values())} mean={sum(x["kills"] for x in d.values())/len(d):.2f} alive={sum(x["alive"] for x in d.values()):.0f} errors={sum(x.get("errors",0) for x in d.values())} fuse={sum(x.get("fuse",0) for x in d.values())} maxMs={max(x.get("maxMs",0) for x in d.values())} dropEv={sum(x.get("dropEv",0) for x in d.values())}'
sims = [summ(sc, "SIMC merged all 'c'"), summ(a4, 'ref S ALL4 (CH1 + four sv, S tree)'), summ(c1, 'ref CH1 (chaos)'), summ(s1, "SIMT1 merged all '1'"), summ(fb, 'ref FNV base (chaos)')]
if sc and a4: sims.append(f"  merged cc == S ALL4 per seed (hash): {sum(1 for k in sc if k in a4 and sc[k]['hash'] == a4[k]['hash'])}/{len(sc)}; kills up {sum(1 for k in sc if k in c1 and sc[k]['kills'] > c1[k]['kills'])} down {sum(1 for k in sc if k in c1 and sc[k]['kills'] < c1[k]['kills'])} vs CH1")
if s1 and fb: sims.append(f"  merged all-1 == FNV base per seed (hash): {sum(1 for k in s1 if k in fb and s1[k]['hash'] == fb[k]['hash'])}/{len(s1)}")
if sc:
    cs = {}
    for x in sc.values():
        for k, v in x['counters'].items():
            if k.startswith('sv'): cs[k] = cs.get(k, 0) + v
    reach = {k: sum(1 for x in sc.values() if x['counters'].get(k, 0) > 0) for k in ('svDropGo', 'svHoldDec', 'svCbBeam', 'svRlLow', 'svRlMid', 'svRlTop', 'svHoldReload')}
    sims.append('  sv counters (sum): ' + ' '.join(f'{k}={v}' for k, v in sorted(cs.items())))
    sims.append('  matches reaching: ' + ' '.join(f'{k}:{v}' for k, v in reach.items()))
    sims.append('  variantOffTick set in ' + str(sum(1 for x in sc.values() if x['counters'].get('variantOffTick') is not None)) + '/' + str(len(sc)))
for g, (n, ok) in tot.items(): print(f'{g}: {ok}/{n}')
print(f'G1s flips act (hash != all-1 native): {acts}/{nact}')
print('VB:'); [print('  ' + x) for x in vb]
print('VC:'); [print('  ' + x) for x in vc]
print('T-F2:'); [print('  ' + x) for x in tf]
[print(x) for x in info]
print('SIMS:'); [print('  ' + x) for x in sims]
fl = os.path.join(M, 'failures.txt')
if os.path.exists(fl): print('RUNNER FAILURES:', open(fl).read())
print('PROBLEMS' if bad else 'NO PROBLEMS')
for x in bad[:60]: print('  ' + x)
