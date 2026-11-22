#!/usr/bin/env python3
"""Verifier F2 harness: run verify/ref.py (or reuse a reference output) and several engine
configurations on one data dir; compare every configuration with the reference exactly, both
ways (the kit compare.py logic, in process), and with the first configuration.
All processes pinned to cores 0,1. A configuration is (tag, binary, NCPU, env dict)."""
import json
import os
import re
import shutil
import subprocess
import sys
import time

V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.dirname(V)
GEN = f"{V}/bin/generate"
PY = f"{T}/kit/venv/bin/python"
SCRIPTS = f"{T}/kit/unz/starter-duckdb/scripts"
ENG = f"{V}/verify/eng.sh"
REF = f"{V}/verify/ref.py"
RUNS = f"{V}/runs"
BINS = {"f2": f"{V}/bin/f2", "f1": f"{V}/bin/f1", "rel15": f"{V}/bin/rel15"}

sys.path.insert(0, SCRIPTS)
import compare as kitcompare  # noqa: E402
import polars as pl  # noqa: E402


def cmpdirs(left, right):
    """compare.py main() on two folders, in process. Returns (ok, text)."""
    from pathlib import Path
    out = []
    ok = True
    try:
        for table, schema in kitcompare.SCHEMAS.items():
            a, b = (kitcompare.load(Path(f), table) for f in (left, right))
            keys = [c for c in ("user_id", "campaign_id", "day") if c in schema]
            da = a.height - a.n_unique(subset=keys)
            db = b.height - b.n_unique(subset=keys)
            oa = a.join(b, on=list(schema), how="anti", nulls_equal=True)
            ob = b.join(a, on=list(schema), how="anti", nulls_equal=True)
            out.append(f"{table}: rows {a.height} vs {b.height}; only in A {oa.height}; only in B {ob.height}; "
                       f"duplicate keys {da} vs {db}")
            if da or db or oa.height or ob.height:
                ok = False
                out.append(str(oa.sort(keys).head(5)))
                out.append(str(ob.sort(keys).head(5)))
    except Exception as e:  # noqa: BLE001
        return False, f"compare error: {e!r}"
    out.append("MATCH" if ok else "DIFFER")
    return ok, "\n".join(out)


def both(a, b):
    ok1, t1 = cmpdirs(a, b)
    ok2, t2 = cmpdirs(b, a)
    return ok1 and ok2, t1 if not ok1 else t2


def run_ref(data, out):
    shutil.rmtree(out, ignore_errors=True)
    t = time.time()
    p = subprocess.run(["taskset", "-c", "0,1", PY, "-B", REF, data, out], capture_output=True, text=True)
    return p.returncode, p.stderr, time.time() - t


def run_eng(data, out, binary="f2", ncpu=2, extra=None):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    env = {k: v for k, v in os.environ.items() if not k.startswith("SESSIONS_")}
    env["NCPU"] = str(ncpu)
    env["ENG_BIN"] = BINS.get(binary, binary)
    if extra:
        env.update(extra)
    t = time.time()
    p = subprocess.run([ENG, data, out], capture_output=True, text=True, env=env)
    return p.returncode, p.stderr, time.time() - t


def info(err):
    """Short summary of the engine's stderr: lane F, buckets, multi units, Lane G share."""
    parts = []
    for pat, fmt in ((r"^lane F (on|off)[^\n]*", None), (r"^buckets (on|off)[^\n]*", None)):
        m = re.search(pat, err, re.M)
        if m:
            s = m.group(0)
            if s.startswith("lane F on"):
                s = "F on"
            elif s.startswith("buckets on"):
                mc = re.search(r"number cap (\d+), (\d+) slots", s)
                s = f"B on ncap {mc.group(1)}/{mc.group(2)}" if mc else "B on"
            parts.append(s)
    m = re.search(r"^multi\s+(\d+) persons, (\d+) entries, (\d+) events", err, re.M)
    if m:
        parts.append(f"multi {m.group(1)}p/{m.group(2)}e/{m.group(3)}ev")
    m = re.search(r"lane G share ([\d.]+)%[^,]*, side records (\d+), general-ID lane F winners (\d+)", err)
    if m:
        parts.append(f"G {m.group(1)}% side {m.group(2)} gen {m.group(3)}")
    else:
        m = re.search(r"lane G share ([\d.]+)%", err)
        if m:
            parts.append(f"G {m.group(1)}%")
    if "Fallback" in err or "slow path" in err or "fallback" in err:
        parts.append("fallback")
    return " | ".join(parts)


def buckets_on(err):
    return re.search(r"^buckets on", err, re.M) is not None


def check(data, label, configs, ref_out=None, keep=False, ref_label="ref"):
    """configs: list of (tag, binary, ncpu, env). Returns (ok, text, infos)."""
    os.makedirs(RUNS, exist_ok=True)
    lines = []
    infos = {}
    ok_all = True
    own_ref = ref_out is None
    if own_ref:
        ref_out = f"{RUNS}/{label}_ref"
        rc, err, tr = run_ref(data, ref_out)
        if rc != 0:
            return False, f"{label}: FAIL\n  REF CRASH rc={rc}\n{err[-1500:]}", infos
    outs = {}
    for tag, binary, ncpu, extra in configs:
        out = f"{RUNS}/{label}__{tag}"
        rc, err, te = run_eng(data, out, binary, ncpu, extra)
        infos[tag] = err
        if rc != 0:
            ok_all = False
            lines.append(f"  {tag}: ENG CRASH rc={rc} {err[-1500:]}")
            continue
        a, ta = both(out, ref_out)
        st = "MATCH" if a else "DIFFER"
        if not a:
            ok_all = False
        lines.append(f"  {tag} [{binary} n{ncpu}{' ' + ','.join(f'{k[9:]}={v}' for k, v in (extra or {}).items()) if extra else ''}]: "
                     f"{st} {te:.2f}s | {info(err)}")
        if not a:
            lines.append(ta[-3000:])
        outs[tag] = out
    tags = list(outs)
    for t2 in tags[1:]:
        a, ta = both(outs[tags[0]], outs[t2])
        if not a:
            ok_all = False
            lines.append(f"  {tags[0]} vs {t2}: DIFFER\n{ta[-2000:]}")
    if ok_all and not keep:
        for o in outs.values():
            shutil.rmtree(o, ignore_errors=True)
            for suf in (".stdout", ".stderr"):
                try:
                    os.remove(o + suf)
                except OSError:
                    pass
        if own_ref:
            shutil.rmtree(ref_out, ignore_errors=True)
    head = f"{label}: {'MATCH' if ok_all else 'FAIL'}"
    return ok_all, head + "\n" + "\n".join(lines), infos


def gen(seed, events, clicks, out, gen_bin=GEN):
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run(["taskset", "-c", "0,1", gen_bin, "--seed", str(seed), "--events", str(events), "--clicks",
                    str(clicks), "--output", out, "--threads", "2"], check=True, capture_output=True)


def window_of(data):
    with open(f"{data}/manifest.json") as fh:
        m = json.load(fh)
    return f"{m['window_start']}..{m['window_end']}"


if __name__ == "__main__":
    data, label = sys.argv[1], sys.argv[2]
    cfgs = [("f2n2", "f2", 2, {}), ("f1n2", "f1", 2, {})]
    ok, txt, _ = check(data, label, cfgs, keep=True)
    print(txt)
    sys.exit(0 if ok else 1)
