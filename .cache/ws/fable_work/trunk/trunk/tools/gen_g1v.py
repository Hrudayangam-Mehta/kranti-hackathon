#!/usr/bin/env python3
"""gen_g1v.py -> job lines for runjobs.sh: G1v trunk vs MX_base (same table), 'b' vs CH1_s1, T-F2 for 'b'."""
import json
S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
P = S + '/mechbot'
TR = S + '/fable_work/trunk/trunk/tree/lib'; MX = S + '/variants7/MX_base/lib'; CH = S + '/fable_work/chaos/builds/CH1_s1/bot/lib'
ST = {'kit': P + '/kit/check/stream.jsonl.gz', 'l48': P + '/tools/release_gate/long4800.jsonl.gz', 'l11': P + '/tools/pass2a/out/long11.jsonl.gz',
      'l23p': P + '/tools/pass2a/out/long23p.jsonl.gz', 'f1': P + '/tools/check2a/streams/ffa_s1.jsonl.gz', 'f2': P + '/tools/check2a/streams/ffa_s2.jsonl.gz',
      'f3': P + '/tools/check2a/streams/ffa_s3.jsonl.gz', 'f4': P + '/tools/check2a/streams/ffa_s4.jsonl.gz'}
TABLES = {'T0': '', 'T1': '1' * 16, 'T2': '2' * 16, 'T3': '1112111111111111'}
for s in range(16): TABLES['F%02d' % s] = '1' * s + '2' + '1' * (15 - s)
def ovr(tab): return json.dumps({'fuseMs': 1e9, **({'saltTable': tab} if tab != '' else {})}, separators=(',', ':'))
jobs = []
def job(name, lib, cmd, a1, a2, tab, slot=''): jobs.append('|'.join([name, lib, cmd, a1, a2, ovr(tab), str(slot)]))
# (a) native slot 3: every table, kit auto/squad/ffa, l48 auto/squad; l11 / l23p auto for the named tables
for tn, tab in TABLES.items():
    for lk, lib in (('TR', TR), ('MX', MX)):
        for e in ('auto', 'squad', 'ffa'): job(f'G1v_{lk}_{tn}_kit_{e}', lib, 'stream', ST['kit'], e, tab)
        for e in ('auto', 'squad'): job(f'G1v_{lk}_{tn}_l48_{e}', lib, 'stream', ST['l48'], e, tab)
        if tn in ('T0', 'T1', 'T2', 'T3'):
            for sn in ('l11', 'l23p'): job(f'G1v_{lk}_{tn}_{sn}_auto', lib, 'stream', ST[sn], 'auto', tab)
# (b) hello.slot rewritten to s for the flip of slot s (the flip acts): kit auto/squad, l48 auto
for s in range(16):
    tn = 'F%02d' % s; tab = TABLES[tn]
    for lk, lib in (('TR', TR), ('MX', MX)):
        for e in ('auto', 'squad'): job(f'G1s_{lk}_{tn}_kit_{e}_s{s}', lib, 'stream', ST['kit'], e, tab, s)
        job(f'G1s_{lk}_{tn}_l48_auto_s{s}', lib, 'stream', ST['l48'], 'auto', tab, s)
# (c) 'b' in slot 3 against CH1_s1 (no table): kit auto/squad, l48 auto, l11 / l23p auto
B3 = '111b111111111111'
for sn, envs in (('kit', ('auto', 'squad')), ('l48', ('auto',)), ('l11', ('auto',)), ('l23p', ('auto',))):
    for e in envs:
        job(f'VB_TR_b3_{sn}_{e}', TR, 'stream', ST[sn], e, B3)
        job(f'VB_CH_{sn}_{e}', CH, 'stream', ST[sn], e, '')
# (d) T-F2 for 'b': forced FFA, all slots 'b' vs all slots '1' (trunk) and MX_base all '1'; kit + ffa_s1-4 streams; sims 411-414
BB = 'b' * 16
for sn in ('kit', 'f1', 'f2', 'f3', 'f4'):
    job(f'TF2_TR_bb_{sn}_ffa', TR, 'stream', ST[sn], 'ffa', BB)
    job(f'TF2_TR_T1_{sn}_ffa', TR, 'stream', ST[sn], 'ffa', TABLES['T1'])
    job(f'TF2_MX_T1_{sn}_ffa', MX, 'stream', ST[sn], 'ffa', TABLES['T1'])
    # info only: env auto on the FFA streams ('b' is live until the firewall drops)
    if sn != 'kit':
        job(f'TFA_TR_bb_{sn}_auto', TR, 'stream', ST[sn], 'auto', BB)
        job(f'TFA_TR_T1_{sn}_auto', TR, 'stream', ST[sn], 'auto', TABLES['T1'])
for sd in (411, 412, 413, 414):
    job(f'TF2_TR_bb_ff{sd}', TR, 'match', str(sd), 'ffa', BB)
    job(f'TF2_TR_T1_ff{sd}', TR, 'match', str(sd), 'ffa', TABLES['T1'])
    job(f'TF2_MX_T1_ff{sd}', MX, 'match', str(sd), 'ffa', TABLES['T1'])
print('\n'.join(jobs))
