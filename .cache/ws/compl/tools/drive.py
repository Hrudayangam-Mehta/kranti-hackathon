#!/usr/bin/env python3
"""Compliance driver: replays the kit stream or a long synthetic match to a bot command and checks every answer.
usage: drive.py --mode kit|long|noend|nomap [--n N] [--map-dir D] [--out F] [--cgroup NAME] -- cmd..."""
import argparse, gzip, json, math, os, queue, random, subprocess, sys, threading, time, copy, importlib.util
KIT = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit'
spec = importlib.util.spec_from_file_location('kitcheck', os.path.join(KIT, 'check', 'check.py'))
kc = importlib.util.module_from_spec(spec); spec.loader.exec_module(kc)
schema = kc.Schema(os.path.join(KIT, 'mechfight.schema.json'))

ap = argparse.ArgumentParser()
ap.add_argument('--mode', default='kit'); ap.add_argument('--n', type=int, default=4800)
ap.add_argument('--map-dir', default='/media/arena'); ap.add_argument('--out', default=None)
ap.add_argument('--cgroup', default='compl1'); ap.add_argument('--seed', type=int, default=7)
ap.add_argument('cmd', nargs=argparse.REMAINDER)
a = ap.parse_args(); cmd = a.cmd[1:] if a.cmd[:1] == ['--'] else a.cmd
msgs = [json.loads(l) for l in gzip.open(os.path.join(KIT, 'check', 'stream.jsonl.gz'), 'rt') if l.strip()]
hello, kobs, end = msgs[0], [m for m in msgs if m.get('type') == 'obs'], msgs[-1]
hello['map']['dir'] = a.map_dir if a.mode != 'nomap' else '/nonexistent'
cfg = hello['config']; budget = cfg['bot']['tick_budget_ms'] / 1000
rng = random.Random(a.seed)

proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=open((a.out or '/dev/null') + '.stderr', 'wb'), bufsize=0)
lines = queue.Queue()
def reader():
    for raw in proc.stdout: lines.put((time.perf_counter(), raw))
    lines.put((time.perf_counter(), None))
threading.Thread(target=reader, daemon=True).start()
def send(ms):
    proc.stdin.write(''.join(json.dumps(m, separators=(',', ':')) + '\n' for m in ms).encode()); proc.stdin.flush()
def nxt(deadline):
    try: return lines.get(timeout=max(0.0, deadline - time.perf_counter()))
    except queue.Empty: return None

R = {'mode': a.mode, 'cmd': cmd, 'answers': 0, 'late': 0, 'missing': 0, 'stale': 0, 'wrong_tick': 0, 'bad_lines': 0,
     'schema_errors': 0, 'semantic_errors': 0, 'debug_fields': 0, 'times_ms': [], 'samples': [], 'problems': [],
     'picks': 0, 'takes': 0, 'drops_sent': 0, 'offers_shown': 0, 'pickups_shown': 0, 'raw': []}
def prob(s):
    if len(R['problems']) < 40: R['problems'].append(s)

def sample(tag):
    s = {'tag': tag}
    try:
        for l in open(f'/proc/{proc.pid}/status'):
            k, _, v = l.partition(':')
            if k in ('VmRSS', 'VmHWM', 'Threads', 'Uid', 'VmSwap'): s[k] = v.split()[0] if k != 'Uid' else v.split()[0]
    except OSError as e: s['err'] = str(e)
    for f, k in ((f'/sys/fs/cgroup/pids/{a.cgroup}/pids.current', 'pids'), (f'/sys/fs/cgroup/memory/{a.cgroup}/memory.usage_in_bytes', 'cg_mem')):
        try: s[k] = int(open(f).read())
        except OSError: pass
    R['samples'].append(s)

# ---------------------------------------------------------------- ready
t0 = time.perf_counter(); send([hello]); ready = None
while ready is None:
    g = nxt(t0 + cfg['bot']['hello_budget_ms'] / 1000)
    if g is None or g[1] is None: prob('no ready' if g is None else 'exited before ready'); break
    try: m = json.loads(g[1])
    except ValueError: R['bad_lines'] += 1; prob(f'ready phase: non-JSON {g[1][:80]!r}'); continue
    if isinstance(m, dict) and m.get('type') == 'ready': ready = m; R['ready_ms'] = (g[0] - t0) * 1000
    else: prob(f'ready phase: unexpected {g[1][:80]!r}')
if ready is not None:
    R['ready_name'] = ready.get('name'); R['ready_schema'] = schema.errors(ready, 'Ready')
sample('after_ready')

state = {'offer': None, 'pickups': {}, 'slot1': None, 'upgrades': [], 'cubes': 0, 'events': [], 'drop': None}
def check_answer(m, o, raw):
    errs = schema.errors(m, 'Action')
    if errs: R['schema_errors'] += 1; prob(f"tick {o['tick']}: schema {errs[:2]}")
    if 'debug' in m: R['debug_fields'] += 1
    mv = m.get('move')
    if isinstance(mv, list) and len(mv) == 2 and math.hypot(*mv) > 1 + 1e-3: R['semantic_errors'] += 1; prob(f"tick {o['tick']}: move length {math.hypot(*mv)}")
    if 'pick' in m:
        off = o.get('offer')
        if not off or not (0 <= m['pick'] < len(off['choices'])) or int(m['pick']) != m['pick']: R['semantic_errors'] += 1; prob(f"tick {o['tick']}: pick {m['pick']} offer {bool(off)}")
        else: R['picks'] += 1
    if 'take' in m:
        ids = [p['id'] for p in o.get('pickups') or []]
        if m['take'] not in ids: R['semantic_errors'] += 1; prob(f"tick {o['tick']}: take {m['take']} not in {ids}")
        else: R['takes'] += 1
    if 'drop' in m:
        R['drops_sent'] += 1
        if m['drop'] not in (0, 1): R['semantic_errors'] += 1; prob(f"tick {o['tick']}: drop {m['drop']}")
    for k in ('aim',):
        v = m.get(k)
        if v is not None and not (isinstance(v, list) and all(isinstance(x, (int, float)) and math.isfinite(x) for x in v)): R['semantic_errors'] += 1

def ask(batch):
    want = batch[-1]; sent = time.perf_counter(); send(batch); older = {o['tick'] for o in batch[:-1]}
    while True:
        g = nxt(sent + budget)
        if g is None:
            R['missing'] += 1; late = nxt(sent + budget + 1.0)
            if late is not None and late[1] is not None:
                R['late'] += 1; R['times_ms'].append((late[0] - sent) * 1000)
                try:
                    m = json.loads(late[1]); R['raw'].append(late[1].decode().rstrip('\n'))
                    check_answer(m, want, late[1]); return m
                except ValueError: R['bad_lines'] += 1
            return None
        at, raw = g
        if raw is None: prob(f"exited at tick {want['tick']}"); return 'EXIT'
        if len(raw.rstrip(b'\n')) > cfg['bot']['max_line_bytes']: R['bad_lines'] += 1; prob('line too long'); continue
        try: m = json.loads(raw)
        except ValueError: R['bad_lines'] += 1; prob(f"non-JSON on stdout: {raw[:80]!r}"); continue
        if not isinstance(m, dict): R['bad_lines'] += 1; continue
        if m.get('tick') != want['tick']:
            if m.get('tick') in older: R['stale'] += 1
            else: R['wrong_tick'] += 1; prob(f"tick {want['tick']}: got {m.get('tick')!r}")
            continue
        R['answers'] += 1; R['times_ms'].append((at - sent) * 1000); R['raw'].append(raw.decode().rstrip('\n'))
        check_answer(m, want, raw); return m

# ---------------------------------------------------------------- synthetic match
ZP = cfg['zone']['phases']
centers = [tuple(cfg['zone']['start_center'])]; radii = [cfg['zone']['start_radius']]
for ph in ZP:
    c = centers[-1]; room = max(0.0, radii[-1] - ph['radius'])
    ang = rng.uniform(-math.pi, math.pi); d = rng.uniform(0, room * 0.9)
    centers.append((c[0] + d * math.cos(ang), c[1] + d * math.sin(ang))); radii.append(ph['radius'])
def zone_at(t):
    t0 = 0.0
    for k, ph in enumerate(ZP):
        hs, ss = t0 + ph['hold_s'], t0 + ph['hold_s'] + ph['shrink_s']
        if t < ss:
            w = 0.0 if t < hs else (t - hs) / ph['shrink_s']
            c = [centers[k][j] + (centers[k + 1][j] - centers[k][j]) * w for j in (0, 1)]
            r = radii[k] + (radii[k + 1] - radii[k]) * w
            return {'center': [round(c[0], 2), round(c[1], 2)], 'radius': round(r, 2), 'next_center': [round(centers[k + 1][0], 2), round(centers[k + 1][1], 2)],
                    'next_radius': radii[k + 1], 'shrink_start': hs, 'shrink_end': ss, 'dps': ph['dps']}
        t0 = ss
    c = centers[-1]
    return {'center': [round(c[0], 2), round(c[1], 2)], 'radius': 0, 'next_center': [round(c[0], 2), round(c[1], 2)], 'next_radius': 0,
            'shrink_start': t0 - ZP[-1]['shrink_s'], 'shrink_end': t0, 'dps': ZP[-1]['dps']}
W = cfg['weapons']
def wstats(kind): return {k: v for k, v in W[kind].items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
UP = cfg['upgrades']
def make_obs(i, tick, last):
    o = copy.deepcopy(kobs[i % len(kobs)]); t = round(tick / 20, 2)
    o['tick'] = tick; o['t'] = t; o['alive'] = max(2, 16 - i // 350)
    me = o['self']; me['hp'] = round(me['max_hp'] * (0.06 + 0.94 * (0.5 + 0.5 * math.sin(i / 97))), 1)
    me['cubes'] = state['cubes']; me['upgrades'] = list(state['upgrades'])
    if state['slot1']:
        k = state['slot1']; w = {'kind': k, 'cooldown': 0, 'stats': wstats(k)}
        if k == 'laser': w['charge'] = 0
        me['weapons'][1] = w
    else: me['weapons'][1] = None
    z = zone_at(t); o['zone'] = z
    me['in_zone'] = math.hypot(me['pos'][0] - z['center'][0], me['pos'][1] - z['center'][1]) <= z['radius']
    x, y, zz = me['pos']
    ids = [j for j in range(16) if j != me['id'] and all(j != m['id'] for m in o['mechs'])]
    for k in range((i // 200) % 9):
        d = 30 + 25 * k; ang = (i * 0.01 + k * 0.7) % (2 * math.pi)
        o['mechs'].append({'id': ids[k], 'kind': 'mech', 'pos': [round(x + d * math.cos(ang), 2), round(y + d * math.sin(ang), 2), zz], 'vel': [rng.uniform(-8, 8), rng.uniform(-8, 8), 0],
                           'aim': [round(ang + math.pi, 3), 0.0], 'hp': 200 + 100 * k, 'max_hp': 1400, 'cubes': k, 'weapons': ['gun'] + (['laser'] if k % 3 == 0 else ['mortar'] if k % 3 == 1 else []), 'charging': (i + k) % 11 == 0})
        if (i + k) % 13 == 0:
            o['beams'].append({'by': ids[k], 'kind': 'laser' if k % 2 else 'lightning', 'path': [[x + d * math.cos(ang), y + d * math.sin(ang), zz + 7], [x, y, zz + 6]], 'age': 0.1})
    if i % 50 < 20: o['mechs'].append({'id': 100 + (i // 50) % 7, 'kind': 'npc', 'pos': [x + 40, y - 20, zz], 'vel': [1, 0, 0], 'aim': [3.1, 0], 'hp': 350, 'max_hp': 350})
    if i % 9 == 0: o['projectiles'].append({'id': 90000 + i, 'kind': 'mortar', 'pos': [x + 20, y, zz + 15], 'vel': [-12, 0, 3]})
    # pickups next to us
    if i % 250 == 10:
        pid = 8100 + i; state['pickups'] = {pid: {'id': pid, 'kind': ['laser', 'mortar', 'lightning'][(i // 250) % 3], 'pos': [round(x + 2, 2), round(y + 1, 2), zz]}}
    if i % 250 == 60: state['pickups'] = {}
    for p in state['pickups'].values(): p['pos'] = [round(x + 2, 2), round(y + 1, 2), zz]
    o['pickups'] = o['pickups'] + list(state['pickups'].values())
    if state['pickups']: R['pickups_shown'] += 1
    # offers
    if i % 400 == 200 and state['offer'] is None:
        ch = rng.sample(UP, 3); state['offer'] = {'id': 1 + i, 'choices': [{'id': u['id'], 'name': u.get('name', u['id']), 'desc': u.get('desc', '')} for u in ch], 'expires': t + 5, 'until': i + 50}
    if state['offer'] and i >= state['offer']['until']: state['events'].append({'type': 'upgrade', 'id': state['offer']['choices'][0]['id']}); state['offer'] = None
    o['offer'] = {k: v for k, v in state['offer'].items() if k != 'until'} if state['offer'] else None
    if o['offer']: R['offers_shown'] += 1
    # drops
    if i % 900 == 300: state['drop'] = {'id': 20000 + i, 'pos': [round(x + 30, 2), round(y, 2), zz], 'radius': 8, 'lands_in': 10.0, 'capture_s': 4, 'progress': 0, 'holder': None, 'until': i + 200}
    if state['drop']:
        dd = state['drop']; dd['lands_in'] = max(0.0, round(dd['lands_in'] - 0.1, 2))
        if i >= dd['until']: state['drop'] = None
    o['drops'] = [{k: v for k, v in state['drop'].items() if k != 'until'}] if state['drop'] else []
    ev = list(o['events']) + state['events']; state['events'] = []
    if i % 7 == 0: ev.append({'type': 'damaged', 'amount': 45, 'weapon': 'gun', 'bearing': round(rng.uniform(-3.1, 3.1), 3), 'by': ids[0], 'rear': i % 14 == 0})
    if i % 11 == 0: ev.append({'type': 'hit', 'target': ids[1], 'amount': 45, 'weapon': 'gun'})
    if i % 333 == 0 and i: ev.append({'type': 'kill', 'target': ids[2]}); state['cubes'] += 2; ev.append({'type': 'pickup', 'cubes': state['cubes']})
    if t > 300 and i % 5 == 0: ev.append({'type': 'damaged', 'amount': 8, 'weapon': 'zone', 'bearing': None, 'by': None})
    o['events'] = ev
    return o

def react(m, o):
    if not isinstance(m, dict): return
    if 'pick' in m and o.get('offer'):
        state['events'].append({'type': 'upgrade', 'id': o['offer']['choices'][int(m['pick'])]['id']}); state['upgrades'].append(o['offer']['choices'][int(m['pick'])]['id']); state['offer'] = None
    if 'take' in m and m['take'] in state['pickups']:
        p = state['pickups'].pop(m['take']); slot = m.get('drop', 1)
        if slot == 1 or state['slot1'] is None:
            if state['slot1']: state['events'].append({'type': 'dropped', 'id': 8900 + len(R['raw']), 'kind': state['slot1'], 'slot': 1})
            state['slot1'] = p['kind']; state['events'].append({'type': 'took', 'id': p['id'], 'kind': p['kind'], 'slot': 1})
        else: state['events'].append({'type': 'take_failed', 'id': p['id'], 'reason': 'full'})
    elif 'take' in m: state['events'].append({'type': 'take_failed', 'id': m['take'], 'reason': 'gone'})

alive = ready is not None
if alive and a.mode == 'kit':
    for i, o in enumerate(kobs):
        batch = kobs[max(0, i - 2): i + 1] if i % 25 == 24 else [o]
        r = ask(batch)
        if r == 'EXIT': alive = False; break
        if i % 50 == 0: sample(f'kit{i}')
elif alive:
    n = a.n if a.mode != 'noend' else 600
    tick = 10; i = 0; gen_err = 0
    while i < n:
        if i == 1500: tick += 128
        if i == 3000: tick += 4000   # a 200 s gap
        k = 10 if i == 2500 else 3 if i % 25 == 24 else 1
        batch = []
        for _ in range(k):
            o = make_obs(i, tick, None); e = schema.errors(o, 'Observation')
            if e: gen_err += 1; prob(f'generator produced invalid obs at {i}: {e[:2]}')
            batch.append(o); tick += 2; i += 1
        r = ask(batch)
        if r == 'EXIT': alive = False; break
        react(r, batch[-1])
        if i % 100 < k: sample(f'i{i}')
    R['generated_invalid'] = gen_err
sample('before_end')
t_end = time.perf_counter()
if alive:
    if a.mode == 'noend': proc.stdin.close()
    else: send([end]); proc.stdin.close()
try: proc.wait(timeout=5); R['exit_code'] = proc.returncode; R['exit_ms'] = (time.perf_counter() - t_end) * 1000
except subprocess.TimeoutExpired: R['exit_code'] = None; prob('did not exit within 5 s'); proc.kill()
# trailing stdout after end
tail = []
while True:
    g = nxt(time.perf_counter() + 0.2)
    if g is None or g[1] is None: break
    tail.append(g[1][:80])
R['stdout_after_end'] = [x.decode(errors='replace') for x in tail]
ts = sorted(R['times_ms']); pct = lambda p: round(ts[min(len(ts) - 1, int(p * len(ts)))], 2) if ts else None
R['p50'], R['p90'], R['p99'], R['max'] = pct(0.5), pct(0.9), pct(0.99), pct(1.0)
R['over_50ms'] = sum(1 for x in ts if x > 50); R['over_25ms'] = sum(1 for x in ts if x > 25)
R['max_threads'] = max((int(s.get('Threads', 0)) for s in R['samples']), default=None)
R['max_pids_cgroup'] = max((s.get('pids', 0) for s in R['samples']), default=None)
R['max_VmHWM_kB'] = max((int(s.get('VmHWM', 0)) for s in R['samples']), default=None)
raw = R.pop('raw'); R.pop('times_ms')
if a.out:
    open(a.out + '.answers.jsonl', 'w').write('\n'.join(raw) + '\n')
    json.dump(R, open(a.out + '.json', 'w'), indent=1)
summary = {k: v for k, v in R.items() if k not in ('samples',)}
print(json.dumps(summary, indent=None))
