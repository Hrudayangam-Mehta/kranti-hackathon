# check2b: the fuzz stream through the shipped bundle as a process (Dockerfile engine settings), one line at a time.
import json, os, subprocess, sys, time, select
P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
env = dict(os.environ)
for line in open(P + '/dist/Dockerfile'):
    for tok in line.replace('\\', ' ').split():
        if tok.startswith('BUN_JSC_') and '=' in tok:
            k, v = tok.split('=', 1); env[k] = v
lines = open(sys.argv[1]).read().split('\n')
p = subprocess.Popen(['taskset', '-c', '2', P + '/bun', P + '/dist/bot.js'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, bufsize=0)
os.set_blocking(p.stdout.fileno(), False)
buf = b''
def read_line(timeout):
    global buf
    end = time.time() + timeout
    while True:
        if b'\n' in buf:
            l, buf = buf.split(b'\n', 1); return l
        r = end - time.time()
        if r <= 0: return None
        rr, _, _ = select.select([p.stdout], [], [], r)
        if rr:
            ch = p.stdout.read(65536)
            if not ch: return None
            buf += ch
sent = answered = bad = 0; ready = None; worst = 0; lat = []
for i, l in enumerate(lines):
    if not l: continue
    t0 = time.time()
    p.stdin.write((l + '\n').encode())
    try: m = json.loads(l)
    except Exception: m = None
    if i == 0:
        ready = read_line(25); continue
    if isinstance(m, dict) and m.get('type') == 'obs':
        sent += 1
        out = read_line(0.5)
        if out is None: continue
        dt = (time.time() - t0) * 1000; lat.append(dt)
        try:
            a = json.loads(out); answered += 1
            if a.get('tick') != m.get('tick') and not (m.get('tick') is None): bad += 1
        except Exception: bad += 1
p.stdin.close(); rc = p.wait(10); err = p.stderr.read().decode(errors='replace')
lat.sort()
print(json.dumps({ 'ready': (ready or b'').decode()[:80], 'obsSent': sent, 'answered': answered, 'badAnswers': bad, 'rc': rc, 'p99ms': round(lat[int(0.99 * len(lat))], 1) if lat else None, 'maxms': round(lat[-1], 1) if lat else None,
  'stderrErrors': sum(1 for x in err.split('\n') if 'failed' in x), 'endLine': [x for x in err.split('\n') if 'end place' in x][:1], 'stderrHead': err[:300] }))
