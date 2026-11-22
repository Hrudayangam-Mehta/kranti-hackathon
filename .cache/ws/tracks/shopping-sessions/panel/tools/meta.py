#!/usr/bin/env python3
"""meta.py MODE SRC DST [SEED]: write a transformed copy of a dataset whose correct output equals SRC's.
MODE merged_dup: one file per folder, lines shuffled, every event and click line twice, links also reversed.
MODE tiny: thousands of 1-200 line files, 30% without a final newline, plus header-only files.
MODE giant_all / giant_tenth: NOT output-preserving; adds links/zz-giant.csv joining all (or every 10th) user ID
to the new ID 'hub0' (one giant person, named by an ID that has no rows). Compare against the reference instead."""
import glob, os, random, shutil, sys
mode, src, dst = sys.argv[1:4]; random.seed(int(sys.argv[4]) if len(sys.argv) > 4 else 5)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns("events", "clicks", "links"))
def lines(d):
    out, hdr = [], None
    for f in sorted(glob.glob(f"{src}/{d}/*.csv")):
        with open(f, "rb") as h:
            hdr = h.readline() or hdr
            out += [l if l.endswith(b"\n") else l + b"\n" for l in h]
    return hdr or b"\n", out
for d in ("events", "clicks", "links"):
    os.makedirs(f"{dst}/{d}")
    hdr, ls = lines(d)
    if mode == "merged_dup":
        ls = ls + ([b",".join(reversed(l.rstrip(b"\n").split(b","))) + b"\n" for l in ls] if d == "links" else ls)
        random.shuffle(ls); open(f"{dst}/{d}/big.csv", "wb").write(hdr + b"".join(ls))
    elif mode == "tiny":
        random.shuffle(ls); i = n = 0
        while i < len(ls):
            k = random.randint(1, 200); chunk = b"".join(ls[i:i + k]); i += k
            if random.random() < 0.3: chunk = chunk[:-1]
            open(f"{dst}/{d}/p{n:05d}.csv", "wb").write(hdr + chunk); n += 1
        for j in range(3): open(f"{dst}/{d}/h{j}.csv", "wb").write(hdr)
    else:
        for f in glob.glob(f"{src}/{d}/*.csv"): shutil.copy(f, f"{dst}/{d}/")
if mode.startswith("giant"):
    users = set()
    for f in glob.glob(f"{src}/events/*.csv") + glob.glob(f"{src}/clicks/*.csv"):
        with open(f, "rb") as h:
            next(h, None)
            for line in h:
                p = line.rstrip(b"\n").split(b",")
                if len(p) > 1 and p[1].strip(b'"') and b'"' not in p[1].strip(b'"'): users.add(p[1].strip(b'"'))
    us = sorted(users)[:: (1 if mode == "giant_all" else 10)]
    open(f"{dst}/links/zz-giant.csv", "wb").write(b"user_id_a,user_id_b\n" + b"".join(b"hub0," + u + b"\n" for u in us))
