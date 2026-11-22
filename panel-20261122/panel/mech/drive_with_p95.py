#!/usr/bin/env python3
"""Lockstep protocol auditor for a mechfight/1 bot (standard library only).

usage: drive.py --kit KIT --stream S.jsonl.gz --map-dir DIR [options] -- <bot command...>

Sends hello, waits for ready, then each observation one at a time and waits for its answer (so the
answers do not depend on machine speed), with optional backlog tests. Every stdout line is checked:
JSON object, <= max_line_bytes, schema-valid (Ready / Action from the kit schema), tick echo, no debug,
nothing unsolicited. Samples /proc/<pid> for threads and memory. Prints one JSON summary on stdout.
"""
import argparse, gzip, importlib.util, json, os, signal, subprocess, sys, threading, time, queue

ap = argparse.ArgumentParser()
ap.add_argument("--kit", required=True)
ap.add_argument("--stream", required=True)
ap.add_argument("--map-dir", required=True)
ap.add_argument("--timeout", type=float, default=5.0, help="seconds to wait for each answer")
ap.add_argument("--budget-ms", type=float, default=50.0)
ap.add_argument("--limit", type=int, default=0, help="only the first N observations")
ap.add_argument("--backlog-every", type=int, default=0, help="every N-th observation: k observations in one write")
ap.add_argument("--backlog-k", type=int, default=3)
ap.add_argument("--stall-every", type=int, default=0, help="every N-th: SIGSTOP the bot, send k obs as separate writes, SIGCONT")
ap.add_argument("--no-end", action="store_true", help="close stdin without sending end")
ap.add_argument("--sample-every", type=int, default=25)
ap.add_argument("--mem-cgroup", default="")
ap.add_argument("--pids-cgroup", default="")
ap.add_argument("--answers", default="", help="write the answer lines here")
ap.add_argument("--stderr", default="", help="write the bot's stderr here")
ap.add_argument("cmd", nargs=argparse.REMAINDER)
a = ap.parse_args()
cmd = a.cmd[1:] if a.cmd[:1] == ["--"] else a.cmd
spec = importlib.util.spec_from_file_location("kitcheck", os.path.join(a.kit, "check", "check.py"))
kc = importlib.util.module_from_spec(spec); spec.loader.exec_module(kc)
schema = kc.Schema(os.path.join(a.kit, "mechfight.schema.json"))
op = gzip.open if a.stream.endswith(".gz") else open
msgs = [json.loads(l) for l in op(a.stream, "rt") if l.strip()]
hello, obs, end = msgs[0], [m for m in msgs if m.get("type") == "obs"], msgs[-1]
if a.limit: obs = obs[: a.limit]
hello["map"]["dir"] = a.map_dir
maxline = hello["config"]["bot"]["max_line_bytes"]
R = {"cmd": " ".join(cmd), "observations": len(obs), "problems": [], "stale_answers": 0, "unsolicited": 0,
     "bad_lines": 0, "schema_errors": 0, "debug_actions": 0, "wrong_tick": 0, "no_answer": 0, "late": 0,
     "max_line": 0, "threads_max": 0, "vmhwm_kb_max": 0, "vmrss_kb_max": 0, "backlog_tests": 0, "stall_tests": 0}
def problem(s):
    if len(R["problems"]) < 25: R["problems"].append(s)

errf = open(a.stderr, "wb") if a.stderr else subprocess.DEVNULL
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=errf, bufsize=0)
lines = queue.Queue()
def reader():
    for raw in proc.stdout: lines.put((time.perf_counter(), raw))
    lines.put((time.perf_counter(), None))
threading.Thread(target=reader, daemon=True).start()
ans_f = open(a.answers, "w") if a.answers else None

def send(ms):
    try:
        proc.stdin.write("".join(json.dumps(m, separators=(",", ":")) + "\n" for m in ms).encode()); proc.stdin.flush()
    except OSError: problem("write to bot failed")

def get(deadline):
    try: return lines.get(timeout=max(0.0, deadline - time.perf_counter()))
    except queue.Empty: return None

def parse(raw, what):
    n = len(raw.rstrip(b"\n")); R["max_line"] = max(R["max_line"], n)
    if not raw.endswith(b"\n"): problem(f"{what}: line without newline")
    if n > maxline: R["bad_lines"] += 1; problem(f"{what}: line {n} bytes"); return None
    try: m = json.loads(raw)
    except ValueError: R["bad_lines"] += 1; problem(f"{what}: not JSON {raw[:60]!r}"); return None
    if not isinstance(m, dict): R["bad_lines"] += 1; problem(f"{what}: not an object"); return None
    return m

def bun_pid():
    """the pid at the end of the exec chain, or its newest descendant named bun"""
    best = proc.pid
    try:
        for d in os.listdir("/proc"):
            if d.isdigit():
                try:
                    st = open(f"/proc/{d}/stat").read()
                    ppid = int(st.rsplit(")", 1)[1].split()[1])
                    if ppid == proc.pid and "bun" in st.split("(", 1)[1].split(")")[0]: best = int(d)
                except OSError: pass
    except OSError: pass
    return best

def sample():
    pid = bun_pid()
    try:
        for l in open(f"/proc/{pid}/status"):
            k, _, v = l.partition(":")
            if k == "Threads": R["threads_max"] = max(R["threads_max"], int(v))
            elif k == "VmHWM": R["vmhwm_kb_max"] = max(R["vmhwm_kb_max"], int(v.split()[0]))
            elif k == "VmRSS": R["vmrss_kb_max"] = max(R["vmrss_kb_max"], int(v.split()[0]))
    except OSError: pass

def thread_names():
    pid = bun_pid(); names = {}
    try:
        for t in os.listdir(f"/proc/{pid}/task"):
            try: n = open(f"/proc/{pid}/task/{t}/comm").read().strip()
            except OSError: continue
            names[n] = names.get(n, 0) + 1
    except OSError: pass
    return names

t0 = time.perf_counter()
send([hello])
ready = None
while ready is None:
    got = get(t0 + 20.0)
    if got is None or got[1] is None:
        problem("no ready within 20 s" if got is None else "exited before ready"); break
    m = parse(got[1], "ready")
    if m is None: continue
    if m.get("type") != "ready": R["unsolicited"] += 1; problem(f"before ready: {got[1][:80]!r}"); continue
    ready = m
    R["ready_ms"] = round((got[0] - t0) * 1000, 1)
    errs = schema.errors(m, "Ready")
    if errs: R["schema_errors"] += 1; problem(f"ready: {errs}")
    nm = m.get("name", "")
    R["name"] = nm
    if not isinstance(nm, str) or len(nm) > 32 or any(ord(c) < 32 for c in nm): problem(f"ready name {nm!r} over 32 chars or has control chars")
sample()
times = []
alive = ready is not None
sent = set()
def answer_for(want, sent_at):
    """wait for the answer to tick `want`; count everything else that arrives"""
    while True:
        got = get(sent_at + a.timeout)
        if got is None:
            R["no_answer"] += 1; problem(f"tick {want['tick']}: no answer within {a.timeout} s"); return True
        at, raw = got
        if raw is None: problem(f"bot exited at tick {want['tick']}"); return False
        m = parse(raw, f"tick {want['tick']}")
        if m is None: continue
        if ans_f: ans_f.write(raw.decode(errors="replace").rstrip("\n") + "\n")
        errs = schema.errors(m, "Action")
        if errs: R["schema_errors"] += 1; problem(f"tick {want['tick']}: {errs}")
        if "debug" in m: R["debug_actions"] += 1
        tk = m.get("tick")
        if tk != want["tick"]:
            if tk in sent: R["stale_answers"] += 1
            else: R["wrong_tick"] += 1; problem(f"tick {want['tick']}: answer carries tick {tk!r}")
            continue
        dt = at - sent_at; times.append(dt)
        if dt * 1000 > a.budget_ms: R["late"] += 1
        return True

def drain(extra_s):
    """anything that shows up when nothing is pending is unsolicited (or a second answer)"""
    end_t = time.perf_counter() + extra_s
    while True:
        got = get(end_t)
        if got is None: return True
        if got[1] is None: return False
        m = parse(got[1], "between observations")
        if m is not None:
            if m.get("tick") in sent: R["stale_answers"] += 1
            else: R["unsolicited"] += 1; problem(f"unsolicited line {got[1][:80]!r}")

i = 0
R["skipped_by_design"] = 0
while i < len(obs) and alive:
    o = obs[i]
    if a.backlog_every and i % a.backlog_every == a.backlog_every - 1 and i + a.backlog_k <= len(obs):
        batch = obs[i : i + a.backlog_k]          # k NEW observations in one write: answer only the last
        R["backlog_tests"] += 1; R["skipped_by_design"] += len(batch) - 1
        sent.update(b["tick"] for b in batch); s_at = time.perf_counter(); send(batch)
        alive = answer_for(batch[-1], s_at) and drain(0.05)
        i += len(batch)
    elif a.stall_every and i % a.stall_every == a.stall_every - 1 and i + a.backlog_k <= len(obs):
        batch = obs[i : i + a.backlog_k]          # bot frozen while k NEW observations arrive one by one
        R["stall_tests"] += 1; R["skipped_by_design"] += len(batch) - 1
        pid = bun_pid()
        os.kill(pid, signal.SIGSTOP)
        for b in batch:
            sent.add(b["tick"]); send([b]); time.sleep(0.005)
        time.sleep(0.02)
        s_at = time.perf_counter(); os.kill(pid, signal.SIGCONT)
        alive = answer_for(batch[-1], s_at) and drain(0.05)
        i += len(batch)
    else:
        sent.add(o["tick"]); s_at = time.perf_counter(); send([o])
        alive = answer_for(o, s_at)
        i += 1
    if i % a.sample_every == 0: sample()
sample()
R["thread_names"] = thread_names()
if a.mem_cgroup:
    try: R["cgroup_mem_max_usage_mb"] = round(int(open(a.mem_cgroup + "/memory.max_usage_in_bytes").read()) / 2**20, 1); R["cgroup_mem_failcnt"] = int(open(a.mem_cgroup + "/memory.failcnt").read())
    except OSError as e: R["cgroup_mem_error"] = str(e)
if a.pids_cgroup:
    try: R["cgroup_pids_current"] = int(open(a.pids_cgroup + "/pids.current").read()); R["cgroup_pids_events"] = open(a.pids_cgroup + "/pids.events").read().strip()
    except OSError as e: R["cgroup_pids_error"] = str(e)
if alive:
    if not a.no_end: send([end])
    e_at = time.perf_counter()
    if a.no_end or True:
        try: proc.stdin.close()
        except OSError: pass
    # anything printed after end is a problem; wait for exit
    while True:
        got = get(e_at + 3.0)
        if got is None: problem("did not close stdout within 3 s of end/stdin close"); break
        if got[1] is None: break
        R["unsolicited"] += 1; problem(f"after end: {got[1][:80]!r}")
    try:
        rc = proc.wait(timeout=3.0); R["exit_code"] = rc; R["exit_ms"] = round((time.perf_counter() - e_at) * 1000, 1)
    except subprocess.TimeoutExpired:
        problem("did not exit within 3 s"); proc.kill(); R["exit_code"] = None
else:
    proc.kill()
times.sort()
pct = lambda p: round(times[min(len(times) - 1, int(p * len(times)))] * 1000, 2) if times else None
R.update({"answered": len(times), "p50_ms": pct(0.5), "p90_ms": pct(0.9), "p95_ms": pct(0.95), "p99_ms": pct(0.99), "max_ms": pct(1.0),
          "wall_s": round(time.perf_counter() - t0, 1)})
R["verdict"] = "PASS" if not R["problems"] and R["answered"] == len(obs) - R["skipped_by_design"] and R["schema_errors"] == 0 and R["debug_actions"] == 0 and R["unsolicited"] == 0 and R["bad_lines"] == 0 else "FAIL"
print(json.dumps(R))
