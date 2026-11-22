#!/usr/bin/env python3
"""Pre-submission compliance gate for the Mech Royale bot (DEV ONLY, standard library only).

    python3 tools/rules_audit/preflight.py                      # default: bot/ run with ./bun
    python3 tools/rules_audit/preflight.py --cmd "node bot/bot.js"
    python3 tools/rules_audit/preflight.py --long               # adds the 4200-decision memory/latency soak
    python3 tools/rules_audit/preflight.py --foreign intel      # adds the file-hash overlap check

Each line is PASS / WARN / FAIL with the evidence. Exit status 1 when anything FAILs.
It does not replace the official Docker run of kit/check/check.py (see notes/rules_audit.md, C3): it is
the fast gate to run before every push so that no submission slot is wasted on a rejection.
"""
import argparse, copy, gzip, hashlib, importlib.util, json, math, os, re, shlex, subprocess, sys, time

sys.dont_write_bytecode = True      # keep kit/ byte-identical to the download

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(os.path.dirname(HERE))
KIT = os.path.join(P, "kit")
MAX_REPO_BYTES = 20_000_000          # track page: max_bytes
RESULTS = []


def report(level, item, evidence):
    RESULTS.append(level)
    print(f"{level:4s} {item}: {evidence}")


def load_check():
    spec = importlib.util.spec_from_file_location("kitcheck", os.path.join(KIT, "check", "check.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def finite(v):
    if isinstance(v, bool) or v is None or isinstance(v, str):
        return True
    if isinstance(v, (int, float)):
        return math.isfinite(v)
    if isinstance(v, list):
        return all(finite(x) for x in v)
    if isinstance(v, dict):
        return all(finite(x) for x in v.values())
    return False


# ---------------------------------------------------------------- static checks
def static_checks(bot_dir, foreign):
    files = []
    for root, dirs, names in os.walk(bot_dir):
        dirs[:] = [d for d in dirs if d != ".git"]
        for n in names:
            p = os.path.join(root, n)
            files.append((os.path.relpath(p, bot_dir), os.path.getsize(p), p))
    total = sum(s for _, s, _ in files)
    big = sorted(files, key=lambda f: -f[1])[:3]
    report("PASS" if total <= MAX_REPO_BYTES * 0.5 else "WARN" if total <= MAX_REPO_BYTES else "FAIL", "S1 repo size",
           f"{total} bytes in {len(files)} files (limit {MAX_REPO_BYTES}); largest: " + ", ".join(f"{n} {s}" for n, s, _ in big))

    df = os.path.join(bot_dir, "Dockerfile")
    if not os.path.isfile(df):
        report("FAIL", "S2 Dockerfile", "no Dockerfile at the top level of the repository folder")
    else:
        lines = [l.strip() for l in open(df, encoding="utf-8") if l.strip() and not l.strip().startswith("#")]
        froms = [l for l in lines if l.upper().startswith("FROM ")]
        img = froms[0].split()[1] if froms else ""
        tag = img.split("@")[0].rsplit(":", 1)[1] if ":" in img.split("@")[0] else ""
        if not froms or not tag or tag == "latest":
            report("FAIL", "S2 Dockerfile FROM", f"base image must carry a fixed version tag, got {img!r}")
        else:
            report("PASS" if "@sha256:" in img else "WARN", "S2 Dockerfile FROM",
                   f"{img}" + ("" if "@sha256:" in img else " (tag only: add @sha256:<digest> to survive a re-pushed tag; finalists are rebuilt)"))
        ep = [l for l in lines if l.upper().startswith("ENTRYPOINT")]
        report("PASS" if ep and "[" in ep[-1] else "FAIL", "S2 Dockerfile ENTRYPOINT", ep[-1] if ep else "missing (exec form required so stdin/stdout reach the bot)")
        risky = [l for l in lines if re.search(r"\b(apt-get|apk|pip|npm|bun install|curl|wget|git clone)\b", l)]
        report("WARN" if risky else "PASS", "S2 Dockerfile network steps", "; ".join(risky) if risky else "none (build needs only the base image)")
        if any(l.upper().startswith("USER ") for l in lines):
            report("WARN", "S2 Dockerfile USER", "the scorer forces --user 65534:65534; a USER line is ignored")

    for name, why in (("README.md", "team name and members, how it works, third-party code named (rules: 'Code you bring')"),
                      ("LICENSE", "rules: 'Anything built in this hackathon must be released under the MIT License'")):
        p = os.path.join(bot_dir, name)
        if not os.path.isfile(p):
            report("FAIL", f"S3 {name}", f"missing ({why})")
        elif name == "LICENSE" and "MIT" not in open(p, encoding="utf-8", errors="replace").read():
            report("FAIL", "S3 LICENSE", "present but does not say MIT")
        else:
            report("PASS", f"S3 {name}", "present")

    pats = {
        "stdout writes": r"console\.(log|info|debug|table|dir)\s*\(|process\.stdout\.write\s*\(|\bprint\s*\(",
        "network": r"node:(http|https|net|dgram|tls|dns)\b|\bfetch\s*\(|WebSocket|Bun\.serve|XMLHttpRequest",
        "file writes": r"writeFile|appendFile|createWriteStream|mkdirSync|mkdir\(|Bun\.write|openSync\([^)]*['\"][wa]",
        "processes/threads": r"child_process|Bun\.spawn|new Worker|worker_threads",
        "non-deterministic sources": r"Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(|crypto\.",
        "secrets": r"ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY",
    }
    hits = {k: [] for k in pats}
    for rel, size, p in files:
        if size > 2_000_000:
            continue
        try:
            text = open(p, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        is_code = rel.endswith((".js", ".mjs", ".ts", ".py"))
        for k, pat in pats.items():
            if k != "secrets" and not is_code:
                continue
            for i, line in enumerate(text.split("\n"), 1):
                if re.search(pat, line) and not line.strip().startswith(("//", "#", "*")):
                    hits[k].append(f"{rel}:{i}")
    n = len(hits["stdout writes"])
    report("PASS" if n <= 2 else "WARN", "S4 stdout discipline (static)", f"{n} call sites write to stdout: {', '.join(hits['stdout writes'][:6])} (expected: the one protocol writer)")
    report("FAIL" if hits["network"] else "PASS", "S5 no network use", ", ".join(hits["network"][:6]) or "none")
    report("WARN" if hits["file writes"] else "PASS", "S6 no file writes (only /tmp is writable)", ", ".join(hits["file writes"][:6]) or "none")
    report("WARN" if hits["processes/threads"] else "PASS", "S7 single process (1 CPU, 128 pid cap)", ", ".join(hits["processes/threads"][:6]) or "none")
    report("WARN" if hits["non-deterministic sources"] else "PASS", "S8 determinism sources", ", ".join(hits["non-deterministic sources"][:8]) or "none (RNG must come from hello.seed)")
    report("FAIL" if hits["secrets"] else "PASS", "S9 no secrets in the repository", ", ".join(hits["secrets"][:4]) or "no token or key patterns")
    junk = [rel for rel, _, _ in files if re.search(r"(^|/)(node_modules|__pycache__|\.env)(/|$)|\.(gz|zip|tar|log|pyc)$", rel)]
    report("WARN" if junk else "PASS", "S10 no build junk or archives", ", ".join(junk[:6]) or "clean")
    unreadable = [rel for rel, _, p in files if not (os.stat(p).st_mode & 0o004)]
    report("FAIL" if unreadable else "PASS", "S11 files world-readable (bot runs as uid 65534)", ", ".join(unreadable[:6]) or "all files o+r")

    if foreign:
        mine = {}
        for rel, size, p in files:
            if size >= 200 and rel.endswith((".js", ".mjs", ".ts", ".py", ".json")):
                mine[hashlib.sha256(open(p, "rb").read()).hexdigest()] = rel
        clash = []
        for root, dirs, names in os.walk(foreign):
            for nme in names:
                q = os.path.join(root, nme)
                try:
                    if os.path.getsize(q) >= 200 and hashlib.sha256(open(q, "rb").read()).hexdigest() in mine:
                        clash.append(os.path.relpath(q, foreign))
                except OSError:
                    pass
        report("FAIL" if clash else "PASS", "S12 no file identical to another team's", ", ".join(clash[:5]) or f"no hash overlap with {foreign}")


# ---------------------------------------------------------------- dynamic checks
def run_kit_check(cmd, pin):
    full = [sys.executable, os.path.join(KIT, "check", "check.py"), "--map-dir", os.path.join(KIT, "arena"), "--"] + pin + cmd
    try:
        out = subprocess.run(full, capture_output=True, text=True, timeout=600, cwd="/tmp")
    except subprocess.TimeoutExpired:
        return report("FAIL", "D1 kit check.py", "timed out after 600 s")
    txt = out.stdout
    last = txt.strip().split("\n")[-1] if txt.strip() else ""
    m = re.search(r"p50 ([\d.]+)\s+p90 ([\d.]+)\s+p99 ([\d.]+)\s+max ([\d.]+)", txt)
    r = re.search(r"ready in (\d+) ms: name (.*)", txt)
    bad = re.search(r"wrong tick: (\d+)\s+bad lines: (\d+)", txt)
    miss = re.search(r"missed the \d+ ms budget: (\d+)", txt)
    report("PASS" if last == "PASS" and out.returncode == 0 else "FAIL", "D1 kit check.py verdict", last or out.stderr[-200:])
    if r:
        ms = int(r.group(1))
        report("PASS" if ms < 5000 else "WARN" if ms < 12000 else "FAIL", "D1 ready time", f"{ms} ms of 20000 (container start comes on top); name {r.group(2)}")
        name = r.group(2).strip()[1:-1]
        ok = 0 < len(name) <= 32 and all(32 <= ord(ch) < 127 for ch in name)
        report("PASS" if ok else "WARN", "D1 ready.name", f"{name!r}: {len(name)} chars (server cuts at 32 and strips control characters; use the registered team name)")
    if m:
        p99, mx = float(m.group(3)), float(m.group(4))
        report("PASS" if p99 < 15 and mx < 30 else "WARN" if mx < 45 else "FAIL", "D1 answer times", f"p50 {m.group(1)} p90 {m.group(2)} p99 {p99} max {mx} ms (targets: p99 < 15, max < 30, budget 50)")
    if miss:
        report("PASS" if miss.group(1) == "0" else "WARN", "D1 late answers", f"{miss.group(1)} of 300 (check.py rejects at 7 or more, best of 3 passes)")
    if bad:
        report("PASS" if bad.group(1) == "0" and bad.group(2) == "0" else "FAIL", "D1 wrong ticks / bad lines", f"{bad.group(1)} / {bad.group(2)}")
    for w in re.findall(r"warning: (.*)", txt):
        report("WARN", "D1 check.py warning", w)


def session(kc, cmd, hello, steps, label, budget=0.05):
    """steps: list of ('obs', msg) or ('raw', bytes). Returns dict of findings."""
    schema = kc.Schema(os.path.join(KIT, "mechfight.schema.json"))
    bot = kc.Bot(cmd)
    out = {"problems": [], "times": [], "answers": [], "ready_ms": None, "exit": None}
    t0 = time.perf_counter()
    bot.send(hello)
    while True:
        got = bot.next(t0 + 20)
        if got is None or got[1] is None:
            out["problems"].append("no ready within 20 s" if got is None else "exited before ready")
            bot.proc.kill()
            return out
        try:
            m = json.loads(got[1])
        except ValueError:
            out["problems"].append(f"non-JSON line before ready: {got[1][:60]!r}")
            continue
        if isinstance(m, dict) and m.get("type") == "ready":
            out["ready_ms"] = (got[0] - t0) * 1000
            break
    for kind, payload in steps:
        if kind == "raw":
            try:
                bot.proc.stdin.write(payload); bot.proc.stdin.flush()
            except OSError:
                out["problems"].append("stdin closed by the bot")
            continue
        sent = time.perf_counter()
        bot.send(payload)
        while True:
            got = bot.next(sent + 1.0)
            if got is None:
                out["problems"].append(f"tick {payload['tick']}: no answer within 1 s")
                break
            if got[1] is None:
                out["problems"].append(f"tick {payload['tick']}: the bot exited")
                return out
            try:
                m = json.loads(got[1])
            except ValueError:
                out["problems"].append(f"tick {payload['tick']}: non-JSON on stdout: {got[1][:60]!r}")
                continue
            if not isinstance(m, dict) or m.get("tick") != payload["tick"]:
                continue                      # an answer to an older tick: dropped by the server
            dt = got[0] - sent
            out["times"].append(dt)
            if dt > budget:
                out["problems"].append(f"tick {payload['tick']}: {dt*1000:.1f} ms (late)")
            errs = schema.errors(m, "Action")
            if errs:
                out["problems"].append(f"tick {payload['tick']}: schema: {errs[0]}")
            if not finite(m):
                out["problems"].append(f"tick {payload['tick']}: non-finite number")
            out["answers"].append((payload, m, got[1]))
            break
    try:
        with open(f"/proc/{bot.proc.pid}/status") as f:
            hwm = re.search(r"VmHWM:\s+(\d+) kB", f.read())
            out["peak_mb"] = int(hwm.group(1)) / 1024 if hwm else None
    except OSError:
        out["peak_mb"] = None
    bot.send({"type": "end", "place": 9, "kills": 0})
    try:
        bot.proc.stdin.close()
    except OSError:
        pass
    try:
        out["exit"] = bot.proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        out["problems"].append("did not exit within 2 s of end")
        bot.proc.kill()
    return out


def hostile_cases(base, hello):
    """Observations the server can legally send (or that a config change would produce) that the 300 recorded ones never contain."""
    cases = []
    def add(name, fn):
        o = copy.deepcopy(base); fn(o); cases.append((name, o))
    me = base["self"]["pos"]
    cfg_up = hello["config"]["upgrades"]
    offer = {"id": 1, "expires": base["t"] + 5, "choices": [{"id": u["id"], "name": u["name"], "desc": u["desc"]} for u in cfg_up[:3]]}
    add("offer pending", lambda o: o.update(offer=offer))
    add("offer with an unknown upgrade id", lambda o: o.update(offer={"id": 2, "expires": o["t"] + 5, "choices": [{"id": "new_thing", "name": "New", "desc": "?"}, offer["choices"][1], offer["choices"][2]]}))
    add("both weapon slots empty", lambda o: o["self"].update(weapons=[None, None]))
    add("no mechs, no loot", lambda o: o.update(mechs=[], crates=[], cubes=[], pickups=[], projectiles=[], sounds=[], beams=[], events=[], drops=[]))
    def crowd(o):
        o["mechs"] = [{"id": i, "kind": "mech", "pos": [me[0] + 30 * math.cos(i), me[1] + 30 * math.sin(i), me[2]], "vel": [0, 0, 0], "aim": [i, 0],
                       "hp": 900, "max_hp": 1400, "cubes": 0, "weapons": ["gun", "lightning"], "charging": i % 2 == 0} for i in range(16) if i != o["self"]["id"]]
        o["mechs"] += [{"id": 100 + i, "kind": "npc", "pos": [me[0] + 10 * i, me[1], me[2]], "vel": [0, 0, 0], "aim": [0, 0], "hp": 350, "max_hp": 350} for i in range(1, 4)]
    add("15 mechs and 3 drones visible", crowd)
    def nohp(o):
        crowd(o)
        for m in o["mechs"]:
            m.pop("hp", None); m.pop("max_hp", None)
    add("enemy hp hidden (vision.show_enemy_hp false)", nohp)
    add("enemy exactly on our position", lambda o: o.update(mechs=[{"id": (o["self"]["id"] + 1) % 16, "kind": "mech", "pos": list(me), "vel": [0, 0, 0], "aim": [0, 0], "hp": 1, "max_hp": 1400, "cubes": 0, "weapons": [], "charging": False}]))
    add("unknown weapon kind held by an enemy and on the ground", lambda o: (o.update(mechs=[{"id": (o["self"]["id"] + 1) % 16, "kind": "mech", "pos": [me[0] + 20, me[1], me[2]], "vel": [1, 0, 0], "aim": [3.1, 0], "hp": 800, "max_hp": 1400, "cubes": 3, "weapons": ["gun", "railgun"], "charging": False}]), o.update(pickups=[{"id": 8999, "kind": "railgun", "pos": [me[0] + 1, me[1], me[2]]}])))
    add("zone closed to radius 0", lambda o: (o.update(t=416.0), o.update(zone={"center": [me[0] + 3, me[1]], "radius": 0, "next_center": [me[0] + 3, me[1]], "next_radius": 0, "shrink_start": 390, "shrink_end": 415, "dps": 260}), o["self"].update(in_zone=False, hp=40)))
    add("outside the zone, far from it", lambda o: (o["self"].update(in_zone=False), o.update(zone={"center": [me[0] + 400, me[1] + 300], "radius": 70, "next_center": [me[0] + 420, me[1] + 300], "next_radius": 25, "shrink_start": o["t"] + 1, "shrink_end": o["t"] + 26, "dps": 160})))
    add("supply drop landed under us, we hold it", lambda o: o.update(drops=[{"id": 20000, "pos": list(me), "radius": 8, "lands_in": 0, "capture_s": 4, "progress": 2.5, "holder": o["self"]["id"]}]))
    add("supply drop inbound, enemy holder", lambda o: o.update(drops=[{"id": 20001, "pos": [me[0] + 50, me[1], me[2]], "radius": 8, "lands_in": 11.3, "capture_s": 4, "progress": 0, "holder": None}, {"id": 20000, "pos": [me[0] - 60, me[1], me[2]], "radius": 8, "lands_in": 0, "capture_s": 4, "progress": 3.9, "holder": (o["self"]["id"] + 2) % 16}]))
    add("every event type at once", lambda o: o.update(events=[
        {"type": "damaged", "amount": 90, "weapon": "zone", "bearing": None, "by": None},
        {"type": "damaged", "amount": 472, "weapon": "laser", "bearing": 1.0, "by": 5, "rear": True},
        {"type": "hit", "target": 1007, "amount": 45, "weapon": "gun"}, {"type": "hit", "target": 5, "amount": 60, "weapon": "lightning", "effect": "short", "rear": True},
        {"type": "effect", "effect": "concuss", "by": 5}, {"type": "drop", "id": 20000, "cubes": 4}, {"type": "kill", "target": 5},
        {"type": "pickup", "cubes": 5}, {"type": "upgrade", "id": "plating"}, {"type": "took", "id": 8013, "kind": "mortar", "slot": 1},
        {"type": "dropped", "id": 8050, "kind": "laser", "slot": 1}, {"type": "take_failed", "id": 8013, "reason": "gone"}, {"type": "brand_new_event", "x": 1}]))
    add("unknown top-level and self fields (protocol may add fields)", lambda o: (o.update(weather={"fog": 0.3}, teams=None), o["self"].update(shield=50, stance="x")))
    add("airborne, zero energy, zero velocity", lambda o: o["self"].update(grounded=False, energy=0, vel=[0, 0, 0]))
    add("many cubes (size x2.5, past the stat cap)", lambda o: (o["self"].update(cubes=30, max_hp=1960, hp=1960), o["self"]["stats"].update(radius=6.25, height=22.5, eye_height=20, muzzle_height=17.5)))
    add("jumbo line (900 projectiles, larger than the 64 KiB pipe buffer: the line arrives in several chunks)", lambda o: o.update(projectiles=[{"id": 2000 + i, "kind": "gun", "pos": [me[0] + 60 + 0.1 * i, me[1] + 0.37 * i, me[2] + 6.5], "vel": [-190.123, 160.456, -1.789]} for i in range(900)]))
    add("mortar shells and bullets inbound", lambda o: o.update(projectiles=[{"id": 900 + i, "kind": k, "pos": [me[0] + 40, me[1] + 5 * i, me[2] + 20], "vel": [-60, -3 * i, -5]} for i, k in enumerate(["mortar", "gun", "npc", "mortar"])]))
    return cases


def dynamic_checks(cmd, pin, long_run):
    run_kit_check(cmd, pin)
    kc = load_check()
    with gzip.open(os.path.join(KIT, "check", "stream.jsonl.gz"), "rt") as f:
        msgs = [json.loads(l) for l in f if l.strip()]
    hello = msgs[0]
    hello["map"]["dir"] = os.path.join(KIT, "arena")
    obs = [m for m in msgs if m.get("type") == "obs"]
    base = max(obs, key=lambda o: len(json.dumps(o)))
    full = pin + cmd

    # D2 hostile but legal observations
    cases = hostile_cases(base, hello)
    steps, tick = [], base["tick"]
    for name, o in cases:
        tick += 2
        o["tick"] = tick; o.setdefault("t", tick / 20)
        steps.append(("obs", o))
    r = session(kc, full, hello, steps, "hostile")
    biggest = max(len(json.dumps(o, separators=(",", ":"))) for _, o in cases)
    report("PASS" if not r["problems"] else "FAIL", "D2 edge-case observations", f"{len(r['answers'])}/{len(cases)} answered validly (largest line {biggest} bytes)" + ("; " + "; ".join(r["problems"][:4]) if r["problems"] else f", max {max(r['times'])*1000:.1f} ms"))
    for (name, o), ans in zip(cases, r["answers"]):
        if name.startswith("offer") and "pick" not in ans[1]:
            report("WARN", "D2 offer answered", f"case '{name}': no `pick` in the action (choice 0 is applied after 5 s)")
        if name.startswith("offer") and ans[1].get("pick") not in (None, 0, 1, 2):
            report("FAIL", "D2 offer pick range", f"pick {ans[1].get('pick')!r}")

    # D3 garbage on stdin, tick going backwards, long gap
    steps = [("obs", obs[10]), ("raw", b"this is not json\n"), ("raw", b"\n"), ("raw", b"[1,2,3]\n"), ("raw", b'{"type":"mystery"}\n'), ("obs", obs[11]),
             ("obs", obs[5]), ("obs", obs[12])]
    late = copy.deepcopy(obs[13]); late["tick"] = obs[13]["tick"] + 4000; late["t"] = late["tick"] / 20
    steps.append(("obs", late))
    r = session(kc, full, hello, steps, "garbage")
    report("PASS" if not r["problems"] and len(r["answers"]) == 5 else "FAIL", "D3 garbage lines, repeated tick, 200 s gap", f"{len(r['answers'])}/5 answered" + ("; " + "; ".join(r["problems"][:3]) if r["problems"] else ""))
    report("PASS" if r["exit"] == 0 else "WARN" if r["exit"] is not None else "FAIL", "D3 clean exit after end", f"exit status {r['exit']}")

    # D4 map missing, config changed (balance change between matches)
    h2 = copy.deepcopy(hello); h2["map"]["dir"] = "/nonexistent/arena"
    r = session(kc, full, h2, [("obs", o) for o in obs[:20]], "nomap")
    report("PASS" if not r["problems"] and len(r["answers"]) == 20 else "FAIL", "D4 map folder missing (degraded mode)", f"{len(r['answers'])}/20 answered" + ("; " + "; ".join(r["problems"][:3]) if r["problems"] else f", ready {r['ready_ms']:.0f} ms"))
    h3 = copy.deepcopy(hello); c = h3["config"]
    c["mech"].update(hp=2000, walk_speed=9, boost_speed=24, turn_rate=2.5, regen_delay=8, rear_mult=2)
    c["weapons"]["gun"].update(damage=30, speed=400, mag=30); c["weapons"]["laser"].update(charge=1.5, range=150)
    c["zone"]["phases"] = c["zone"]["phases"][:4]; c["zone"]["phases"][-1].update(radius=40)
    c["match"].update(duration_s=300); c["cubes"].update(stat_cap=5, upgrade_thresholds=[2, 4])
    c["vision"].update(range=120, fov_deg=90, show_enemy_hp=False, memory_s=1)
    c["upgrades"] = c["upgrades"][:5] + [{"id": "new_thing", "name": "New", "desc": "?", "max": 1, "effects": [{"path": "mech.newstat", "add": 1}]}]
    c["brand_new_section"] = {"x": 1}
    r = session(kc, full, h3, [("obs", o) for o in obs[:60]], "config")
    report("PASS" if not r["problems"] and len(r["answers"]) == 60 else "FAIL", "D4 changed config (balance change)", f"{len(r['answers'])}/60 answered" + ("; " + "; ".join(r["problems"][:3]) if r["problems"] else ""))

    # D5 determinism: same hello and observations twice -> byte-identical actions
    seq = [("obs", o) for o in obs[:200]]
    a = session(kc, full, hello, seq, "det1"); b = session(kc, full, hello, seq, "det2")
    same = [x[2] for x in a["answers"]] == [x[2] for x in b["answers"]]
    first = next((x[0]["tick"] for x, y in zip(a["answers"], b["answers"]) if x[2] != y[2]), None)
    report("PASS" if same else "WARN", "D5 determinism (two runs, identical input)", "byte-identical actions" if same else f"actions differ from tick {first}: reruns on the scorer will not reproduce")

    # D6 EOF without end
    bot = kc.Bot(full); bot.send(hello); t0 = time.perf_counter()
    while True:
        got = bot.next(t0 + 20)
        if got is None or got[1] is None or b'"ready"' in got[1]:
            break
    bot.send(obs[0]); bot.next(time.perf_counter() + 1)
    try:
        bot.proc.stdin.close()
    except OSError:
        pass
    try:
        code = bot.proc.wait(timeout=2); report("PASS", "D6 exits when stdin closes without end", f"exit status {code}")
    except subprocess.TimeoutExpired:
        bot.proc.kill(); report("WARN", "D6 exits when stdin closes without end", "still running after 2 s")

    if long_run:
        steps, tick = [], 0
        for rep in range(14):
            for o in obs:
                q = dict(o); q["tick"] = tick; q["t"] = tick / 20; tick += 2
                steps.append(("obs", q))
        r = session(kc, full, hello, steps, "soak")
        ts = sorted(r["times"]) or [0]
        pk = r.get("peak_mb")
        lvl = "PASS" if not r["problems"] and (pk or 0) < 300 and ts[-1] < 0.03 else "WARN" if len(r["problems"]) <= 2 and (pk or 0) < 450 else "FAIL"
        report(lvl, "D7 soak: 4200 decisions (one full match)", f"answered {len(r['answers'])}/{len(steps)}, p99 {ts[int(0.99*(len(ts)-1))]*1000:.1f} ms, max {ts[-1]*1000:.1f} ms, peak RSS {pk and round(pk)} MB of 512" + ("; " + "; ".join(r["problems"][:3]) if r["problems"] else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--bot-dir", default=os.path.join(P, "bot"))
    ap.add_argument("--cmd", default=None, help="bot command (default: <P>/bun <bot-dir>/bot.js)")
    ap.add_argument("--no-pin", action="store_true", help="do not pin the bot to one CPU with taskset")
    ap.add_argument("--long", action="store_true")
    ap.add_argument("--static-only", action="store_true")
    ap.add_argument("--foreign", default=None, help="folder of other teams' repositories: fail on any byte-identical source file")
    a = ap.parse_args()
    bot_dir = os.path.abspath(a.bot_dir)
    cmd = shlex.split(a.cmd) if a.cmd else [os.path.join(P, "bun"), os.path.join(bot_dir, "bot.js")]
    pin = [] if a.no_pin or not os.path.exists("/usr/bin/taskset") else ["taskset", "-c", "0"]
    static_checks(bot_dir, a.foreign)
    if not a.static_only:
        dynamic_checks(cmd, pin, a.long)
    n = {k: RESULTS.count(k) for k in ("PASS", "WARN", "FAIL")}
    print(f"\nsummary: {n['PASS']} pass, {n['WARN']} warn, {n['FAIL']} fail")
    return 1 if n["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
