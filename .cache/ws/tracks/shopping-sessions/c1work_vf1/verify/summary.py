#!/usr/bin/env python3
"""Count verdicts in every verifier log under runs/."""
import os
import re

R = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "runs")


def blocks(path, head):
    if not os.path.exists(path):
        return []
    txt = open(path).read()
    return [b for b in re.split(r"\n(?=" + head + ")", txt) if re.match(head, b)]


def tally(name, path, head, verdict_re=r": (MATCH|FAIL)\b"):
    bs = blocks(path, head)
    v = {}
    lanes = {"on": 0, "off": 0}
    configs = 0
    for b in bs:
        m = re.search(verdict_re, b.splitlines()[0])
        k = m.group(1) if m else "?"
        v[k] = v.get(k, 0) + 1
        for l in b.splitlines()[1:]:
            if re.match(r"\s+\S+.*: (MATCH|DIFFER|CRASH)", l) or re.match(r"\s+n\d_", l):
                configs += 1
            if re.match(r"\s+n\d+_auto|\s+default", l):
                if "lane F on" in l:
                    lanes["on"] += 1
                elif "lane F off" in l:
                    lanes["off"] += 1
    diff = sum(1 for b in bs for l in b.splitlines() if "DIFFER" in l or "CRASH" in l)
    print(f"{name:14s} datasets={len(bs):4d} verdicts={v} engine-runs={configs} default-lane={lanes} DIFFER/CRASH lines={diff}")


tally("seeds", f"{R}/vseeds.log", r"[a-z0-9]+ seed=")
tally("fuzz", f"{R}/vfuzz.log", r"vfz\d+ ")
tally("fuzz2", f"{R}/vfuzz2.log", r"vfz\d+ ")
tally("mutations", f"{R}/mut.log", r"\[b")
tally("edge-merge1", f"{R}/edgemerge_pass1.log", r"\[(raw|canon)\]")
tally("edge-merge2", f"{R}/edgemerge.log", r"\[(raw|canon)\]")
tally("capedge", f"{R}/capedge.log", r"\[b")
tally("twokeys", f"{R}/twokeys.log", r"\[B")
tally("stress", f"{R}/stress.log", r"\[b", r" (MATCH|FAIL)$")
