#!/usr/bin/env python3
"""Per-decision answer-time recorder (lockstep, like the server and kit check.py).

usage: timing.py --stream S.jsonl[.gz] --map-dir DIR --out OUT.json [--batch-every 25] [--limit N] -- <bot cmd...>

Sends hello, times hello -> ready, then sends each observation and waits for the answer with the right tick.
An answer later than the 50 ms budget is still awaited (up to 2 s) so its real time is known; the run then
continues (the server would have moved on: the answer would be dropped and the mech would coast).
Writes OUT.json: ready_ms, times_ms (one per observation, answer time from write to read), late indexes,
summary percentiles overall, for the first 50, and per 600-decision window; also wall-clock stamps of each send.
"""
import argparse, gzip, json, queue, subprocess, sys, threading, time

ap = argparse.ArgumentParser()
ap.add_argument("--stream", required=True)
ap.add_argument("--map-dir", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--budget-ms", type=float, default=50.0)
ap.add_argument("--batch-every", type=int, default=0, help="every N-th observation: the previous 2 and it in one write")
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--stderr", default="")
ap.add_argument("--gap-ms", type=float, default=0.0, help="idle time between an answer and the next observation")
ap.add_argument("--stderr-ts", action="store_true", help="timestamp each stderr line (ms since hello) into --stderr")
ap.add_argument("--cpu-stat", default="/sys/fs/cgroup/cpu/mechtest/cpu.stat")
ap.add_argument("cmd", nargs=argparse.REMAINDER)
a = ap.parse_args()
cmd = a.cmd[1:] if a.cmd[:1] == ["--"] else a.cmd
op = gzip.open if a.stream.endswith(".gz") else open
msgs = [json.loads(l) for l in op(a.stream, "rt") if l.strip()]
hello = next(m for m in msgs if m.get("type") == "hello")
obs = [m for m in msgs if m.get("type") == "obs"]
end = next((m for m in reversed(msgs) if m.get("type") == "end"), {"type": "end", "place": 1, "kills": 0})
if a.limit:
    obs = obs[: a.limit]
hello["map"]["dir"] = a.map_dir
errf = open(a.stderr, "wb") if a.stderr else subprocess.DEVNULL
T0 = [time.perf_counter()]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE if a.stderr_ts else errf, bufsize=0)
def cpustat():
    try:
        return {k: int(v) for k, v in (l.split() for l in open(a.cpu_stat))}
    except OSError:
        return {}
if a.stderr_ts:
    def errreader():
        for raw in p.stderr:
            errf.write(b"%.2f " % ((time.perf_counter() - T0[0]) * 1000) + raw)
        errf.flush()
    threading.Thread(target=errreader, daemon=True).start()
q = queue.Queue()

def reader():
    for raw in p.stdout:
        q.put((time.perf_counter(), raw))
    q.put((time.perf_counter(), None))

threading.Thread(target=reader, daemon=True).start()

def send(ms):
    p.stdin.write("".join(json.dumps(m, separators=(",", ":")) + "\n" for m in ms).encode())
    p.stdin.flush()

def wait_for(pred, deadline):
    while True:
        try:
            t, raw = q.get(timeout=max(0.0, deadline - time.perf_counter()))
        except queue.Empty:
            return None
        if raw is None:
            return (t, None)
        try:
            m = json.loads(raw)
        except ValueError:
            continue
        if pred(m):
            return (t, m)

t0 = time.perf_counter(); T0[0] = t0
cs0 = cpustat()
send([hello])
r = wait_for(lambda m: m.get("type") == "ready", t0 + 25)
ready_ms = (r[0] - t0) * 1000 if r and r[1] else None
times, late, wall, stale = [], [], [], 0
cs1 = cpustat()
budget = a.budget_ms / 1000
for i, o in enumerate(obs):
    batch = obs[max(0, i - 2): i + 1] if a.batch_every and i % a.batch_every == a.batch_every - 1 else [o]
    if a.gap_ms:
        time.sleep(a.gap_ms / 1000)
    s = time.perf_counter()
    wall.append(round((s - t0) * 1000, 2))
    send(batch)
    got = wait_for(lambda m: m.get("tick") == o["tick"], s + 2.0)
    if got is None or got[1] is None:
        times.append(None); late.append(i)
        if got is not None:
            break
        continue
    ms = (got[0] - s) * 1000
    times.append(round(ms, 3))
    if ms > a.budget_ms:
        late.append(i)
cs2 = cpustat()
try:
    send([end]); p.stdin.close()
except OSError:
    pass
try:
    p.wait(timeout=3)
except subprocess.TimeoutExpired:
    p.kill()

def pct(v, q_):
    v = sorted(x for x in v if x is not None)
    return round(v[min(len(v) - 1, int(q_ * len(v)))], 2) if v else None

def summ(v):
    vv = [x for x in v if x is not None]
    return {"n": len(v), "p50": pct(vv, .5), "p90": pct(vv, .9), "p99": pct(vv, .99), "p999": pct(vv, .999), "max": pct(vv, 1.0),
            "over20": sum(1 for x in vv if x > 20), "over30": sum(1 for x in vv if x > 30), "over50": sum(1 for x in vv if x > 50),
            "missing": sum(1 for x in v if x is None)}

top = sorted(((x, i) for i, x in enumerate(times) if x is not None), reverse=True)[:15]
thr = lambda x, y: {"throttled": y.get("nr_throttled", 0) - x.get("nr_throttled", 0), "throttled_ms": round((y.get("throttled_time", 0) - x.get("throttled_time", 0)) / 1e6, 1), "periods": y.get("nr_periods", 0) - x.get("nr_periods", 0)}
R = {"cmd": " ".join(cmd), "stream": a.stream, "ready_ms": round(ready_ms, 1) if ready_ms else None,
     "throttle_startup": thr(cs0, cs1), "throttle_match": thr(cs1, cs2),
     "all": summ(times), "first50": summ(times[:50]), "after50": summ(times[50:]),
     "windows600": [dict(summ(times[k:k + 600]), start=k) for k in range(0, len(times), 600)],
     "top15": [{"i": i, "tick": obs[i]["tick"], "ms": x} for x, i in top], "late_idx": late,
     "times_ms": times, "wall_ms": wall}
json.dump(R, open(a.out, "w"))
print(json.dumps({k: R[k] for k in ("ready_ms", "throttle_startup", "throttle_match", "all", "first50", "after50")}))
print("top:", " ".join(f"{t['i']}:{t['ms']:.1f}" for t in R["top15"][:10]))
