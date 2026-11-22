#!/usr/bin/env python3
"""Structural variants of one base with stage F2 on: no clicks (header-only files, or no clicks
folder), no event lines outside the key sample, a padding file that raises the number cap past
many empty buckets, many tiny event files, NCPU 16 and 32. Each against verify/ref.py.
Usage: structvar.py LABEL:SEED:E:C -> appends runs/structvar.log"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import ref  # noqa: E402
import vrun2  # noqa: E402

CFGS = [("f2n2", "f2", 2, {}), ("f2n8", "f2", 8, {}), ("f2n16", "f2", 16, {}), ("f2n32", "f2", 32, {}),
        ("f2b7", "f2", 3, {"SESSIONS_TEST_BUCKET_BITS": "7"}), ("f1n2", "f1", 2, {})]


def main():
    label, seed, ev, ck = sys.argv[1].split(":")
    base = f"{vrun2.V}/data/base_{label}"
    if not os.path.isdir(base):
        vrun2.gen(seed, ev, ck, base)
    log = open(f"{vrun2.RUNS}/structvar.log", "a")
    for var in ("noclicks_header", "noclicks_dir", "sample_only", "pad_cap", "tiny_files", "plain_many_threads"):
        out = f"{vrun2.V}/data/sv_{label}_{var}"
        shutil.rmtree(out, ignore_errors=True)
        shutil.copytree(base, out)
        if var == "noclicks_header":
            for p in ref.csv_files(f"{out}/clicks"):
                open(p, "wb").write(b"click_id,user_id,campaign_id,ts\n")
        elif var == "noclicks_dir":
            shutil.rmtree(f"{out}/clicks")
        elif var == "sample_only":
            files = ref.csv_files(f"{out}/events")
            keep = [p for p in files if os.path.getsize(p) > 200_000][:3]
            for p in files:
                if p not in keep:
                    os.remove(p)
        elif var == "pad_cap":
            junk = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n" + (b"x,y\n" * 8_000_000)
            open(f"{out}/events/zzz_pad.csv", "wb").write(junk)
        elif var == "tiny_files":
            lines = []
            for p in ref.csv_files(f"{out}/events"):
                lines += ref.data_lines(p)
                os.remove(p)
            big, rest = lines[:7000], lines[7000:]
            h = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n"
            for i in range(7):
                open(f"{out}/events/a{i:03d}.csv", "wb").write(h + b"\n".join(big[i * 1000:(i + 1) * 1000]) + b"\n")
            for i in range(0, len(rest), 400):
                open(f"{out}/events/t{i // 400:06d}.csv", "wb").write(h + b"\n".join(rest[i:i + 400]) + b"\n")
        ok, txt, infos = vrun2.check(out, f"sv_{label}_{var}", CFGS)
        line = f"[{label}] {var}: {txt}"
        print(line, flush=True)
        log.write(line + "\n")
        log.flush()
        if ok:
            shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    main()
