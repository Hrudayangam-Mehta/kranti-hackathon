#!/usr/bin/env python3
"""vfuzz.py with fuzz.write_split splitting into 24-64 files (the generator's layout), so the
key sample sees generator rows and lane F is on in most rounds. Usage: vfuzz2.py FROM TO [WORKERS]"""
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fuzz  # noqa: E402
import vfuzz  # noqa: E402
import vrun  # noqa: E402


def write_split(folder, header, lines, rnd):
    shutil.rmtree(folder, ignore_errors=True)
    os.makedirs(folder)
    rnd.shuffle(lines)
    k = rnd.randrange(24, 65)
    cuts = sorted(rnd.sample(range(len(lines) + 1), min(k - 1, len(lines) + 1))) if lines else []
    parts, prev = [], 0
    for c in cuts + [len(lines)]:
        parts.append(lines[prev:c])
        prev = c
    for i, part in enumerate(parts):
        body = header + b"\n" + b"\n".join(part)
        if part and rnd.random() < 0.7:
            body += b"\n"
        with open(f"{folder}/part-{i:03d}.csv", "wb") as fh:
            fh.write(body)
    with open(f"{folder}/empty-{rnd.randrange(99)}.csv", "wb") as fh:
        fh.write(rnd.choice([b"", header, header + b"\n"]))


fuzz.write_split = write_split
vrun.RUNS = vrun.RUNS
if __name__ == "__main__":
    a, b = int(sys.argv[1]), int(sys.argv[2])
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=workers) as ex, open(f"{vrun.RUNS}/vfuzz2.log", "a") as log:
        for r in ex.map(vfuzz.one, range(a, b)):
            print(r, flush=True)
            log.write(r + "\n")
