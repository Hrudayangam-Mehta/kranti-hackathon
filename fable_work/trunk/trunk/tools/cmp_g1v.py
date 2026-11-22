#!/usr/bin/env python3
"""cmp_g1v.py <iddir>: byte comparison of the recorder outputs written by jobs_g1v.txt (gen_g1v.py)."""
import json, os, sys
D = sys.argv[1]
OLD = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/chaos/id/old'
def meta(n):
    p = os.path.join(D, n + '.meta.json')
    return json.load(open(p)) if os.path.exists(p) else None
def body(n):
    p = os.path.join(D, n + '.jsonl')
    return open(p, 'rb').read() if os.path.exists(p) else None
def lines(n): return body(n).decode().split('\n')
def ndiff(a, b):
    la, lb = lines(a), lines(b)
    d = [i for i in range(max(len(la), len(lb))) if (la[i] if i < len(la) else None) != (lb[i] if i < len(lb) else None)]
    return len(d), (d[0] + 1 if d else 0)
bad = []
def pair(a, b, tag):
    ma, mb = meta(a), meta(b)
    if ma is None or mb is None: bad.append(f'{tag}: missing {a if ma is None else b}'); return None
    same = body(a) == body(b)
    clean = all(m['fuse'] == 0 and m['errors'] == 0 for m in (ma, mb))
    if not clean: bad.append(f'{tag}: fuse/errors {ma["fuse"]},{ma["errors"]} / {mb["fuse"]},{mb["errors"]}')
    if not same: n, f = ndiff(a, b); bad.append(f'{tag}: DIFFER {n} decisions, first {f}')
    return same, ma, mb
TB = ['T0', 'T1', 'T2', 'T3'] + ['F%02d' % s for s in range(16)]
# ---- G1v native slot 3
res = {}
cnt = [0, 0]
for tn in TB:
    for sn, envs in (('kit', ('auto', 'squad', 'ffa')), ('l48', ('auto', 'squad')), ('l11', ('auto',)), ('l23p', ('auto',))):
        if sn in ('l11', 'l23p') and tn not in ('T0', 'T1', 'T2', 'T3'): continue
        for e in envs:
            r = pair(f'G1v_TR_{tn}_{sn}_{e}', f'G1v_MX_{tn}_{sn}_{e}', f'G1v {tn} {sn} {e}')
            if r is None: continue
            cnt[0] += 1; cnt[1] += r[0]
            res[(tn, sn, e)] = (r[0], r[1]['hash'], r[1]['n'])
print(f'G1v native slot 3: {cnt[1]}/{cnt[0]} trunk = MX_base byte-identical')
for sn, envs in (('kit', ('auto', 'squad', 'ffa')), ('l48', ('auto', 'squad')), ('l11', ('auto',)), ('l23p', ('auto',))):
    for e in envs:
        row = [f'{tn}:{res[(tn, sn, e)][1][:8]}' for tn in TB if (tn, sn, e) in res]
        print(f'  {sn:4s} {e:5s} ' + ' '.join(row))
# salt flips act: T2 and F03 differ from T1, the other flips equal T1 (native slot 3)
for sn, e in (('kit', 'auto'), ('l48', 'auto')):
    h1 = res[('T1', sn, e)][1]
    eqT1 = [tn for tn in TB if res[(tn, sn, e)][1] == h1]
    print(f'  {sn} {e}: tables equal to T1: {",".join(eqT1)}; T2==F03: {res[("T2", sn, e)][1] == res[("F03", sn, e)][1]}; T0==T1: {res[("T0", sn, e)][1] == h1}')
# reference FNV hashes (chaos id/old, FNV SELECT + salt 1 overrides)
for sn, e in (('kit', 'auto'), ('kit', 'squad'), ('kit', 'ffa'), ('l48', 'auto'), ('l48', 'squad'), ('l11', 'auto'), ('l23p', 'auto')):
    p = os.path.join(OLD, f'FNV_{sn}_{e}.meta.json')
    if os.path.exists(p):
        h = json.load(open(p))['hash']; print(f'  id/old FNV_{sn}_{e} {h[:8]}: T0 {"equal" if res[("T0", sn, e)][1] == h else "DIFFERENT"}')
# ---- G1s: hello.slot rewritten to s, flip in slot s
cnt = [0, 0]; hs = []
for s in range(16):
    tn = 'F%02d' % s
    for sn, e in (('kit', 'auto'), ('kit', 'squad'), ('l48', 'auto')):
        r = pair(f'G1s_TR_{tn}_{sn}_{e}_s{s}', f'G1s_MX_{tn}_{sn}_{e}_s{s}', f'G1s {tn} {sn} {e} slot {s}')
        if r is None: continue
        cnt[0] += 1; cnt[1] += r[0]
        hs.append((s, sn, e, r[1]['hash'], res[('T2', sn, e)][1], res[('T1', sn, e)][1]))
print(f'G1s hello.slot = s, salt 2 in slot s: {cnt[1]}/{cnt[0]} trunk = MX_base byte-identical')
print('  flip acts (hash != T1 native) in ' + str(sum(1 for x in hs if x[3] != x[5])) + f'/{len(hs)}; equal to T2 native in ' + str(sum(1 for x in hs if x[3] == x[4])) + f'/{len(hs)}')
# ---- 'b' in slot 3 vs CH1_s1
for sn, envs in (('kit', ('auto', 'squad')), ('l48', ('auto',)), ('l11', ('auto',)), ('l23p', ('auto',))):
    for e in envs:
        r = pair(f'VB_TR_b3_{sn}_{e}', f'VB_CH_{sn}_{e}', f'VB b3 {sn} {e}')
        if r is None: continue
        m = r[1]; c = m['counters']
        print(f'VB {sn} {e}: trunk b3 vs CH1_s1 {"IDENTICAL" if r[0] else "DIFFER"} n={m["n"]} hash {m["hash"][:8]} variantOffTick={c.get("variantOffTick")} firstForeignTick={m["firstForeignTick"]} latch={m["latchTick"]}')
# ---- T-F2
for sn in ('kit', 'f1', 'f2', 'f3', 'f4', 'ff411', 'ff412', 'ff413', 'ff414'):
    sfx = f'{sn}_ffa' if not sn.startswith('ff') else sn
    r1 = pair(f'TF2_TR_bb_{sfx}', f'TF2_TR_T1_{sfx}', f'TF2 {sn} trunk bb vs trunk T1')
    r2 = pair(f'TF2_TR_T1_{sfx}', f'TF2_MX_T1_{sfx}', f'TF2 {sn} trunk T1 vs MX T1')
    if r1 and r2:
        m = r1[1]; ex = f' kills={m.get("kills")} place={m.get("place")}' if 'kills' in m else ''
        print(f'TF2 forced FFA {sn}: bb==T1 {r1[0]}  T1(trunk)==T1(MX) {r2[0]}  n={m["n"]} hash {m["hash"][:8]}{ex}')
for sn in ('f1', 'f2', 'f3', 'f4'):
    a, b = f'TFA_TR_bb_{sn}_auto', f'TFA_TR_T1_{sn}_auto'
    if meta(a) and meta(b):
        n, f = ndiff(a, b); ma = meta(a)
        print(f'info auto {sn}: bb vs T1 differ {n}/{ma["n"]} decisions, first {f}; variantOffTick={ma["counters"].get("variantOffTick")} firstForeignTick={ma["firstForeignTick"]} latch={ma["latchTick"]}')
print('PROBLEMS' if bad else 'NO PROBLEMS')
for x in bad: print('  ' + x)
