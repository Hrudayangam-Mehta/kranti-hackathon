#!/usr/bin/env python3
"""Each verify/edge case merged into a generator dataset whose window is the edge window
(seed 570: 2026-10-01..15), so the edge rows run with lane F on.
mode raw:   the edge files copied byte for byte (renamed edge_*).
mode canon: same, but every well-formed edge row's user IDs replaced by generator-canonical
            IDs (person numbers unused by the base, below the cap, aliases 0.. per link
            component; unlinked IDs share person numbers with distinct aliases).
Usage: edgemerge.py MODE [CASE_PREFIX ...]  -> appends runs/edgemerge.log"""
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import genmodel as gm  # noqa: E402
import ref  # noqa: E402
import vrun  # noqa: E402

SEED, E, C = 570, 60000, 30000
EDGE = f"{vrun.V}/verify/edge"
SKIP = {"x18b_hidden_csv", "x33_click_copies_differ"}
NF = {"events": 7, "clicks": 4, "links": 2}
UIDX = {"events": (1,), "clicks": (1,), "links": (0, 1)}


def rewrite_line(line, n, idx, mp):
    f = ref.parse_line(line, n)
    if f is None:
        return line
    parts = line.split(b",")
    for i in idx:
        if f[i] == b"":
            continue
        q = parts[i][:1] == b'"'
        nv = mp[f[i]]
        parts[i] = b'"' + nv + b'"' if q else nv
    return b",".join(parts)


def case_ids(root):
    dsu = ref.DSU()
    ids = set()
    for sub in NF:
        for p in ref.csv_files(f"{root}/{sub}"):
            for line in ref.data_lines(p):
                f = ref.parse_line(line, NF[sub])
                if f is None:
                    continue
                for i in UIDX[sub]:
                    if f[i]:
                        ids.add(f[i])
                if sub == "links" and f[0] and f[1]:
                    dsu.union(f[0], f[1])
    comps = {}
    for x in ids:
        comps.setdefault(dsu.find(x) if x in dsu.parent else ("solo", x), []).append(x)
    return comps


def main():
    mode = sys.argv[1]
    sel = sys.argv[2:]
    base = f"{vrun.V}/data/base_e570"
    if not os.path.isdir(base):
        vrun.gen(SEED, E, C, base)
    ws, uk, _, _ = gm.plan_keys(SEED)
    key = uk & gm.MASK40
    rc, err, _ = vrun.run_eng(base, f"{vrun.RUNS}/probe_e570", 2)
    cap = int(re.search(r"person cap (\d+)", err).group(1))
    shutil.rmtree(f"{vrun.RUNS}/probe_e570", ignore_errors=True)
    uc = E // 30
    win = json.load(open(f"{base}/manifest.json"))
    log = open(f"{vrun.RUNS}/edgemerge.log", "a")
    for case in sorted(os.listdir(EDGE)):
        if case in SKIP or (sel and not any(case.startswith(s) for s in sel)):
            continue
        root = f"{EDGE}/{case}/input"
        if json.load(open(f"{root}/manifest.json")) != win:
            continue
        out = f"{vrun.V}/data/em_{mode}_{case}"
        shutil.rmtree(out, ignore_errors=True)
        shutil.copytree(base, out)
        mp = {}
        if mode == "canon":
            g = uc + 50
            solo_g, solo_a = None, 16
            for key_, members in sorted(case_ids(root).items(), key=lambda kv: sorted(kv[1])):
                if isinstance(key_, tuple):
                    if solo_a >= 16:
                        solo_g, solo_a = g, 0
                        g += 1
                    mp[members[0]] = gm.user_id(solo_g * 512 + solo_a, key).encode()
                    solo_a += 1
                else:
                    for a, x in enumerate(sorted(members)):
                        mp[x] = gm.user_id((g + a // 512) * 512 + a % 512, key).encode()
                    g += 1 + (len(members) - 1) // 512
            assert g < cap, (g, cap)
        for sub in NF:
            src = f"{root}/{sub}"
            for name in sorted(os.listdir(src)):
                sp = f"{src}/{name}"
                dp = f"{out}/{sub}/{os.environ.get('EPFX', 'edge_')}{name}"
                if os.path.isdir(sp):
                    shutil.copytree(sp, dp)
                    continue
                data = open(sp, "rb").read()
                if mode == "canon" and name.endswith(".csv") and data:
                    lines = data.split(b"\n")
                    head, body = lines[0], lines[1:]
                    body = [rewrite_line(l, NF[sub], UIDX[sub], mp) if l != b"" else l for l in body]
                    data = b"\n".join([head] + body)
                with open(dp, "wb") as fh:
                    fh.write(data)
        ok, txt = vrun.check(out, f"em_{mode}_{case}", configs=((2, None), (2, "G"), (1, None)))
        line = f"[{mode}] {case}: {txt}"
        print(line, flush=True)
        log.write(line + "\n")
        log.flush()
        if ok:
            shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    main()
