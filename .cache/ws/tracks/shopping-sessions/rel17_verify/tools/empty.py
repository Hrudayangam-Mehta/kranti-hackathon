#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, "/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/rel17_verify/tools")
from vt import V, PY, REF, SCRIPTS, run_bin, both_ways, fmt

sys.path.insert(0, SCRIPTS)
from run_fixtures import SCHEMAS, load_actual

EV = "event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n"
CK = "click_id,user_id,campaign_id,ts\n"
LK = "user_id_a,user_id_b\n"


def make(name, files, products="product_id,category\np1,shoes\n", campaigns="campaign_id,channel\nc_1,search\n"):
    d = f"{V}/data/empty_{name}"
    shutil.rmtree(d, ignore_errors=True)
    for sub in ("events", "clicks", "links"):
        os.makedirs(f"{d}/{sub}")
    with open(f"{d}/manifest.json", "w") as fh:
        json.dump({"window_start": "2026-10-01T00:00:00Z", "window_end": "2026-10-15T00:00:00Z"}, fh)
    with open(f"{d}/products.csv", "w") as fh:
        fh.write(products)
    with open(f"{d}/campaigns.csv", "w") as fh:
        fh.write(campaigns)
    for rel, body in files.items():
        with open(f"{d}/{rel}", "w") as fh:
            fh.write(body)
    return d


def main():
    binary = sys.argv[1]
    cases = {
        "headers": make("headers", {"events/a.csv": EV, "clicks/a.csv": CK, "links/a.csv": LK}),
        "nofiles": make("nofiles", {}),
        "zerobyte": make("zerobyte", {"events/a.csv": "", "clicks/a.csv": "", "links/a.csv": ""}),
        "noeol_headers": make("noeol_headers", {"events/a.csv": EV.strip(), "clicks/a.csv": CK.strip(), "links/a.csv": LK.strip()}),
        "nocatalog": make("nocatalog", {"events/a.csv": EV, "clicks/a.csv": CK, "links/a.csv": LK},
                          products="product_id,category\n", campaigns="campaign_id,channel\n"),
        "manyempty": make("manyempty", {**{f"events/p{i:03d}.csv": EV for i in range(40)},
                                        **{f"clicks/p{i:03d}.csv": CK for i in range(20)},
                                        **{f"links/p{i:03d}.csv": "" for i in range(10)}}),
    }
    ok_all = True
    for name, data in cases.items():
        out_r = f"{V}/runs/empty_{name}_ref"
        shutil.rmtree(out_r, ignore_errors=True)
        pr = subprocess.run([PY, "-B", REF, data, out_r], capture_output=True, text=True)
        for n in ("1", "3", "8"):
            for extra in ({}, {"SESSIONS_SCALAR": "1"}):
                out = f"{V}/runs/empty_{name}_n{n}{'s' if extra else ''}"
                r = run_bin(binary, data, out, n, extra)
                rows = []
                for table, schema in SCHEMAS.items():
                    try:
                        rows.append(load_actual(f"{out}/{table}", schema).height)
                    except Exception as e:
                        rows.append(f"ERR {e}")
                ok, txt = both_ways(out, out_r) if pr.returncode == 0 else (False, pr.stderr[-300:])
                good = ok and r["rc"] == 0 and r["stdout"] == 0 and rows == [0, 0]
                ok_all &= good
                print(f"empty {name} NCPU={n}{' SCALAR' if extra else ''}: {fmt(r)} rows={rows} "
                      f"vs ref {'MATCH/MATCH' if ok else 'DIFFER'} {'OK' if good else 'FAIL'}", flush=True)
    print("EMPTY-ALL-OK" if ok_all else "EMPTY-FAIL")


if __name__ == "__main__":
    main()
