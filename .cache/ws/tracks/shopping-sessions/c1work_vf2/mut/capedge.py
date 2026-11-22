#!/usr/bin/env python3
"""Person-cap boundary: IDs at g = cap-2 .. cap+1 with aliases 0,1,15,16, where the cap the
binary computes (2*(event_bytes//1800)+1024) is pinned exactly by a padding file.
Usage: capedge.py LABEL:SEED:E:C [J]   -> appends runs/capedge.log"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "verify"))
import genmodel as gm  # noqa: E402
import ref  # noqa: E402
import vrun  # noqa: E402

EV_H = b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents"
CK_H = b"click_id,user_id,campaign_id,ts"
LK_H = b"user_id_a,user_id_b"


def f1(t):
    import datetime as dt
    return dt.datetime.fromtimestamp(t // 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ").encode()


def rows_for(c, key, ws):
    uid = lambda g, a: gm.user_id(g * 512 + a, key).encode()
    ev, ck, lk = [], [], []
    n = [0]

    def sess(u, t, purchase=True):
        for i in range(3):
            n[0] += 1
            typ = b"purchase" if (purchase and i == 2) else b"view"
            ev.append(b",".join([b"cap%d" % n[0], u, str(t + i * 60_000).encode(), f1(t + i * 60_000 + 5000), typ,
                                 b"p%d" % (n[0] % 50000 + 1), b"%d" % (100 + n[0])]))
        n[0] += 1
        ck.append(b",".join([b"kc%d" % n[0], u, b"c_%d" % (n[0] % 2000 + 1), str(t - 3_600_000).encode()]))

    t = ws + 3 * 86_400_000 + 7_200_000
    g1, g2, g3, g4 = c - 1, c, c - 2, c + 1
    for g in (g1, g2, g3, g4):
        for a in (0, 1, 15, 16):
            sess(uid(g, a), t)
            t += 7_200_000
    lk += [uid(g1, 0) + b"," + uid(g1, 1), uid(g1, 1) + b"," + uid(g1, 15), uid(g2, 0) + b"," + uid(g2, 1),
           uid(g3, 0) + b"," + uid(g4, 0), uid(g4, 15) + b"," + uid(g4, 16), uid(g2, 15) + b"," + uid(c - 3, 16)]
    return ev, ck, lk


def main():
    label, seed, e, c_ = sys.argv[1].split(":")
    jmax = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    base = f"{vrun.V}/data/base_{label}"
    if not os.path.isdir(base):
        vrun.gen(seed, e, c_, base)
    _, uk, _, _ = gm.plan_keys(int(seed))
    key = uk & gm.MASK40
    import json
    man = json.load(open(f"{base}/manifest.json"))
    ws = ref.parse_ts(man["window_start"].encode())
    e0 = sum(os.path.getsize(p) for p in ref.csv_files(f"{base}/events"))
    t0 = 2 * (e0 // 1800) + 1024
    log = open(f"{vrun.RUNS}/capedge.log", "a")
    done = 0
    j = 1
    while done < jmax:
        c = t0 + 2 * j
        j += 1
        ev, ck, lk = rows_for(c, key, ws)
        body = EV_H + b"\n" + b"\n".join(ev) + b"\n"
        k = (c - 1024) // 2
        pad_total = k * 1800 + 900 - e0 - len(body)
        if pad_total < len(EV_H) + 20:
            continue
        pad = EV_H + b"\n" + b"x" * (pad_total - len(EV_H) - 2) + b"\n"
        out = f"{vrun.V}/data/capedge_{label}_{c}"
        shutil.rmtree(out, ignore_errors=True)
        shutil.copytree(base, out)
        open(f"{out}/events/zz_capedge.csv", "wb").write(body)
        open(f"{out}/events/zz_pad.csv", "wb").write(pad)
        open(f"{out}/clicks/zz_capedge.csv", "wb").write(CK_H + b"\n" + b"\n".join(ck) + b"\n")
        open(f"{out}/links/zz_capedge.csv", "wb").write(LK_H + b"\n" + b"\n".join(lk) + b"\n")
        s = sum(os.path.getsize(p) for p in ref.csv_files(f"{out}/events"))
        assert 2 * (s // 1800) + 1024 == c, (s, c)
        ok, txt = vrun.check(out, f"capedge_{label}_{c}", configs=((2, None), (2, "G"), (1, None)))
        pinned = f"person cap {c}," in txt
        line = f"[{label}] target cap {c} pinned={pinned}: {txt}"
        print(line, flush=True)
        log.write(line + "\n")
        if ok:
            shutil.rmtree(out, ignore_errors=True)
        done += 1


if __name__ == "__main__":
    main()
