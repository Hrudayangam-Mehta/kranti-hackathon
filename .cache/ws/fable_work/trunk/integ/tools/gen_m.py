#!/usr/bin/env python3
"""gen_m.py -> job lines (runjobs.sh) for the merged tree: G1v / G1s / G1x (pure salts vs MX_base, MX side reused from trunk/id),
VB ('b' slot 3 vs CH1_s1, CH side reused), VC ('c' slot 3 vs SV4 = survive tree + four sv presets), T-F2 for 'b' and 'c', sims."""
import json
S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
P = S + '/mechbot'
TM = S + '/fable_work/trunk/trunk/merged/lib'; SV = S + '/fable_work/trunk/survive/builds/SV4/bot/lib'
ST = {'kit': P + '/kit/check/stream.jsonl.gz', 'l48': P + '/tools/release_gate/long4800.jsonl.gz', 'l11': P + '/tools/pass2a/out/long11.jsonl.gz',
      'l23p': P + '/tools/pass2a/out/long23p.jsonl.gz', 'f1': P + '/tools/check2a/streams/ffa_s1.jsonl.gz', 'f2': P + '/tools/check2a/streams/ffa_s2.jsonl.gz',
      'f3': P + '/tools/check2a/streams/ffa_s3.jsonl.gz', 'f4': P + '/tools/check2a/streams/ffa_s4.jsonl.gz'}
TABLES = {'T0': '', 'T1': '1' * 16, 'T2': '2' * 16, 'T3': '1112111111111111'}
for s in range(16): TABLES['F%02d' % s] = '1' * s + '2' + '1' * (15 - s)
X = {'X0': '0', 'X3': '3', 'X5': '5', 'X9': '9', 'XUA': 'A', 'XUK': 'K', 'XUZ': 'Z', 'Xla': 'a', 'Xld': 'd', 'Xlz': 'z'}
def ovr(tab, extra=None):
    d = {'fuseMs': 1e9}
    if tab != '': d['saltTable'] = tab
    if extra: d.update(extra)
    return json.dumps(d, separators=(',', ':'))
jobs = []
def job(name, lib, cmd, a1, a2, tab, slot='', extra=None): jobs.append('|'.join([name, lib, cmd, a1, a2, ovr(tab, extra), str(slot)]))
B3, C3, BB, CC = '111b111111111111', '111c111111111111', 'b' * 16, 'c' * 16
# ---- A: kit stream first
for tn, tab in TABLES.items():
    for e in ('auto', 'squad', 'ffa'): job(f'G1v_TM_{tn}_kit_{e}', TM, 'stream', ST['kit'], e, tab)
for e in ('auto', 'squad'):
    job(f'VB_TM_b3_kit_{e}', TM, 'stream', ST['kit'], e, B3)
    job(f'VC_TM_c3_kit_{e}', TM, 'stream', ST['kit'], e, C3)
    job(f'VC_SV_kit_{e}', SV, 'stream', ST['kit'], e, '')
for tg, tab in (('bb', BB), ('cc', CC), ('T1', TABLES['T1'])): job(f'TF2_TM_{tg}_kit_ffa', TM, 'stream', ST['kit'], 'ffa', tab)
for xn, c in X.items(): job(f'G1x_TM_{xn}_kit_auto', TM, 'stream', ST['kit'], 'auto', '111' + c + '1' * 12)
for s in range(16):
    tn = 'F%02d' % s
    for e in ('auto', 'squad'): job(f'G1s_TM_{tn}_kit_{e}_s{s}', TM, 'stream', ST['kit'], e, TABLES[tn], s)
# ---- B: FFA streams
for sn in ('f1', 'f2', 'f3', 'f4'):
    for tg, tab in (('bb', BB), ('cc', CC), ('T1', TABLES['T1'])): job(f'TF2_TM_{tg}_{sn}_ffa', TM, 'stream', ST[sn], 'ffa', tab)
    for tg, tab in (('cc', CC), ('T1', TABLES['T1'])): job(f'TFA_TM_{tg}_{sn}_auto', TM, 'stream', ST[sn], 'auto', tab)
    job(f'VC_SV_{sn}_auto', SV, 'stream', ST[sn], 'auto', '')
# ---- C: long streams
for sn in ('l48', 'l11', 'l23p'):
    job(f'VB_TM_b3_{sn}_auto', TM, 'stream', ST[sn], 'auto', B3)
    job(f'VC_TM_c3_{sn}_auto', TM, 'stream', ST[sn], 'auto', C3)
    job(f'VC_SV_{sn}_auto', SV, 'stream', ST[sn], 'auto', '')
for tn, tab in TABLES.items():
    for e in ('auto', 'squad'): job(f'G1v_TM_{tn}_l48_{e}', TM, 'stream', ST['l48'], e, tab)
    if tn in ('T0', 'T1', 'T2', 'T3'):
        for sn in ('l11', 'l23p'): job(f'G1v_TM_{tn}_{sn}_auto', TM, 'stream', ST[sn], 'auto', tab)
for s in range(16):
    tn = 'F%02d' % s; job(f'G1s_TM_{tn}_l48_auto_s{s}', TM, 'stream', ST['l48'], 'auto', TABLES[tn], s)
for xn, c in X.items(): job(f'G1x_TM_{xn}_l48_auto', TM, 'stream', ST['l48'], 'auto', '111' + c + '1' * 12)
# ---- D: matches (forced FFA T-F2 sims 411-414; 24-seed squad sims: all 'c', and all '1' as a closed-loop identity check vs the FNV sim)
for sd in (411, 412, 413, 414):
    for tg, tab in (('bb', BB), ('cc', CC), ('T1', TABLES['T1'])): job(f'TF2f_TM_{tg}_ff{sd}', TM, 'match', str(sd), 'ffa', tab, '', {'env': 'ffa'})
for sd in range(1, 25): job(f'SIMC_TM_cc_sq{sd}', TM, 'match', str(sd), 'squad', CC)
for sd in range(1, 25): job(f'SIMT1_TM_sq{sd}', TM, 'match', str(sd), 'squad', TABLES['T1'])
print('\n'.join(jobs))
