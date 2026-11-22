#!/usr/bin/env python3
"""Two generator datasets with the same window but different user keys merged into one
(seed 15 and seed 254). Variant 'Alast': B's files sort last (key sample sees only A);
'Bfirst': B's files sort first (the sample sees B). Event/click IDs of B get a 'b' suffix.
Usage: twokeys.py  -> appends runs/twokeys.log"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import ref  # noqa: E402
import vrun  # noqa: E402

NF = {"events": 7, "clicks": 4, "links": 2}


def main():
    a = f"{vrun.V}/data/base_b15"
    if not os.path.isdir(a):
        vrun.gen(15, 60000, 60000, a)
    log = open(f"{vrun.RUNS}/twokeys.log", "a")
    for eb, cb, label in ((20000, 20000, "B20k"), (300000, 100000, "B300k")):
        b = f"{vrun.V}/data/base_s254_{label}"
        if not os.path.isdir(b):
            vrun.gen(254, eb, cb, b)
        for variant, prefix in (("Alast", "zzB_"), ("Bfirst", "aaB_")):
            out = f"{vrun.V}/data/twokeys_{label}_{variant}"
            shutil.rmtree(out, ignore_errors=True)
            shutil.copytree(a, out)
            for sub in NF:
                for p in ref.csv_files(f"{b}/{sub}"):
                    data = open(p, "rb").read()
                    if sub != "links":
                        lines = data.split(b"\n")
                        fixed = [lines[0]]
                        for line in lines[1:]:
                            f = ref.parse_line(line, NF[sub])
                            if f is not None and f[0]:
                                parts = line.split(b",")
                                q = parts[0][:1] == b'"'
                                parts[0] = (b'"' + f[0] + b'b"') if q else f[0] + b"b"
                                line = b",".join(parts)
                            fixed.append(line)
                        data = b"\n".join(fixed)
                    open(f"{out}/{sub}/{prefix}{os.path.basename(p)}", "wb").write(data)
            ok, txt = vrun.check(out, f"twokeys_{label}_{variant}", configs=((2, None), (2, "G"), (5, None)))
            line = f"[{label} {variant}] {txt}"
            print(line, flush=True)
            log.write(line + "\n")
            if ok:
                shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    main()
