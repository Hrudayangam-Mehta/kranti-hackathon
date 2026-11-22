#!/usr/bin/env python3
"""checkR3a2: drive the shipped bundle (dist/bot.js) in lockstep over a recorded stream and hash its answers.
usage: pipe_det.py <core> <stream.jsonl.gz> <out.txt> [load]
load = number of busy-loop processes pinned to the same core while the bot runs (CPU contention)."""
import gzip, hashlib, json, os, subprocess, sys, time

P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
core, stream, out = sys.argv[1], sys.argv[2], sys.argv[3]
load = int(sys.argv[4]) if len(sys.argv) > 4 else 0
env = dict(os.environ)
for kv in ['BUN_JSC_useFTLJIT=0', 'BUN_JSC_useConcurrentJIT=1', 'BUN_JSC_useConcurrentGC=0', 'BUN_JSC_numberOfGCMarkers=1',
           'BUN_JSC_numberOfBaselineCompilerThreads=1', 'BUN_JSC_numberOfDFGCompilerThreads=1', 'BUN_JSC_numberOfFTLCompilerThreads=1',
           'BUN_JSC_minNumberOfWorklistThreads=1', 'BUN_JSC_maxNumberOfWorklistThreads=1']:
    k, v = kv.split('='); env[k] = v
msgs = [json.loads(l) for l in gzip.open(stream, 'rt') if l.strip()]
hello = next(m for m in msgs if m['type'] == 'hello')
hello['map'] = dict(hello.get('map') or {}, dir=P + '/kit/arena')
obs = [m for m in msgs if m['type'] == 'obs']
hogs = [subprocess.Popen(['taskset', '-c', core, 'sh', '-c', 'while :; do :; done']) for _ in range(load)]
try:
    bot = subprocess.Popen(['taskset', '-c', core, P + '/bun', os.environ.get('BOTJS', P + '/dist/bot.js')], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, text=True, env=env, bufsize=1)
    bot.stdin.write(json.dumps(hello) + '\n'); bot.stdin.flush()
    ready = json.loads(bot.stdout.readline())
    h = hashlib.sha256(); answers = []; worst = 0.0; bad = 0
    for o in obs:
        t0 = time.perf_counter()
        bot.stdin.write(json.dumps(o) + '\n'); bot.stdin.flush()
        line = bot.stdout.readline()
        dt = (time.perf_counter() - t0) * 1000; worst = max(worst, dt)
        a = json.loads(line)
        if a.get('tick') != o.get('tick'): bad += 1
        h.update(line.encode()); answers.append(line)
    bot.stdin.write(json.dumps({'type': 'end', 'place': 1, 'kills': 0}) + '\n'); bot.stdin.flush()
    bot.wait(timeout=20)
    err = bot.stderr.read()
finally:
    for g in hogs: g.kill()
open(out, 'w').write(''.join(answers))
summary = {'stream': os.path.basename(stream), 'core': core, 'load': load, 'ready': ready.get('type'), 'n': len(answers), 'tick_mismatch': bad,
           'hash': h.hexdigest()[:24], 'worst_roundtrip_ms': round(worst, 1), 'end_log': [l for l in err.splitlines() if 'end place' in l or 'failed' in l][:3]}
print(json.dumps(summary))
