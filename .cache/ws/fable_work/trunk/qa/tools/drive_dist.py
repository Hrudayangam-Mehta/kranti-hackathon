#!/usr/bin/env python3
"""QA lockstep driver for a bundled bot (dist/bot.js): hello (map.dir rewritten to the kit arena, slot optionally rewritten),
wait for ready, one observation at a time, one answer each, end. Writes the answer lines to --answers. Standard library only.
usage: drive_dist.py --stream S.jsonl.gz --answers OUT [--slot N] -- <bot command...>"""
import argparse, gzip, json, subprocess, sys, time, hashlib
ap = argparse.ArgumentParser(); ap.add_argument('--stream', required=True); ap.add_argument('--answers', required=True)
ap.add_argument('--slot', type=int, default=None); ap.add_argument('--map-dir', required=True); ap.add_argument('--timeout', type=float, default=30.0)
ap.add_argument('cmd', nargs=argparse.REMAINDER); a = ap.parse_args(); cmd = a.cmd[1:] if a.cmd[:1] == ['--'] else a.cmd
msgs = [json.loads(l) for l in gzip.open(a.stream, 'rt') if l.strip()]
hello = msgs[0]; obs = [m for m in msgs if m.get('type') == 'obs']; end = msgs[-1]
hello['map']['dir'] = a.map_dir
if a.slot is not None: hello['slot'] = a.slot
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
def send(m): p.stdin.write((json.dumps(m, separators=(',', ':')) + '\n').encode()); p.stdin.flush()
def recv():
    line = p.stdout.readline()
    if not line: raise SystemExit('bot closed stdout')
    return line.decode().rstrip('\n')
t0 = time.perf_counter(); send(hello); r = json.loads(recv()); assert r.get('type') == 'ready', r
ready_ms = (time.perf_counter() - t0) * 1000
out = open(a.answers, 'w'); h = hashlib.sha256(); worst = 0.0; n = 0
for o in obs:
    t1 = time.perf_counter(); send(o); line = recv(); ms = (time.perf_counter() - t1) * 1000; worst = max(worst, ms)
    m = json.loads(line); assert m.get('tick') == o['tick'], (m, o['tick'])
    out.write(line + '\n'); h.update((line + '\n').encode()); n += 1
send(end); out.close()
try: p.wait(timeout=10)
except subprocess.TimeoutExpired: p.kill()
err = p.stderr.read().decode(errors='replace')
slow = [l for l in err.splitlines() if 'slow tick' in l or 'failed' in l or 'fuse' in l.lower()]
print(json.dumps({'n': n, 'sha256_16': h.hexdigest()[:16], 'ready_ms': round(ready_ms), 'worst_ms': round(worst, 1), 'exit': p.returncode, 'stderr_flags': slow[:5], 'end_line': [l for l in err.splitlines() if l.startswith('[bot] end')][-1:] }))
