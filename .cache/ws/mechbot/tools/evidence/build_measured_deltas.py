#!/usr/bin/env python3
# Builds notes/measured_deltas.json and notes/measured_deltas.md from the record modules in this directory.
# Inputs are our own summaries of other teams' published logs; nothing from those repos is executed or copied.
import json, os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import records_b  # noqa: F401  (appends to A)
from records_a import A
from tables import SYNTH, AUDIT, UNUSED, RECS
P = os.path.dirname(os.path.dirname(HERE)); NOTES = os.path.join(P, "notes")

for r in A:
    off = r["scorer"] == "official48"
    if off and r["score_before"] is not None and r["score_after"] is not None: r["kind"] = "official_ab"
    elif off and r["score_after"] is not None: r["kind"] = "official_absolute"
    elif off: r["kind"] = "official_note"
    else: r["kind"] = r["scorer"]
    r["both_numbers_official"] = r["kind"] == "official_ab"
json.dump(A, open(os.path.join(NOTES, "measured_deltas.json"), "w"), indent=1, ensure_ascii=False)

def f(x): return "" if x is None else ("%.2f" % x)
def fd(x): return "" if x is None else ("%+.2f" % x)
def cell(s): return str(s).replace("|", "/").replace("\n", " ")
def src(r): return "; ".join("`%s`" % s for s in r["source"])

TOPICS = [("range", "Engagement range"), ("passivity", "Hiding, pacifism, hold-fire"), ("healing", "Retreat and healing"),
          ("aggression", "Aggression"), ("movement", "Movement"), ("target", "Target choice"), ("loadout", "Loadout and pickups"),
          ("upgrades", "Upgrades"), ("economy", "Cubes, crates, drones"), ("drops", "Supply drops"), ("zone", "Zone and endgame"),
          ("cover", "Cover"), ("roofs", "Roofs"), ("execution", "Fire control and execution"), ("navigation", "Navigation"),
          ("timing", "Decision timing"), ("ffa_detection", "Free-for-all detection"), ("noise", "Determinism and noise"),
          ("sim_validity", "Simulator prediction against the official score"), ("structure", "Structural observations")]
L = []
L.append("# Measured effects on the official practice scorer, and audit of Amendment V3\n")
L.append("Built 21 Nov from other teams' published logs (`tools/evidence/build_measured_deltas.py`; machine-readable copy in `notes/measured_deltas.json`, %d records). All source paths are relative to `intel/`.\n" % len(A))
L.append("## 1. Records\n")
L.append("Scorer column: `official` = 48-seed practice score (both numbers official when both are present); `sim` = a team's local simulator; `rec` = statistics from recorded public matches; `live` = private rooms on the real server. `n` = number of behaviour changes in the submission.\n")
SC = {"official48": "official", "simulator": "sim", "recorded_public_matches": "rec", "live_server_private_rooms": "live"}
for key, title in TOPICS:
    rows = [r for r in A if r["topic"] == key]
    if not rows: continue
    L.append("### %s\n" % title)
    L.append("| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |")
    L.append("|---|---|---|---:|---:|---:|---|---:|---|---|---|")
    for r in rows:
        L.append("| %s | %s | %s | %s | %s | %s | %s | %d | %s | %s | %s |" % (r["id"], cell(r["team"]), cell(r["change"]), f(r["score_before"]),
                 f(r["score_after"]), fd(r["delta"]), SC[r["scorer"]], r["changes_in_bundle"], cell(r["receipt"] or ""), src(r), cell(r["note"] or "")))
    L.append("")
L.append("## 2. Synthesis by topic\n")
L.append("| Topic | Records | Direction the records agree on | Conflicts | Size against noise (about 0.3) |")
L.append("|---|---|---|---|---|")
for t in SYNTH: L.append("| " + " | ".join(cell(x) for x in t) + " |")
L.append("\n## 3. Audit of Amendment V3\n")
L.append("| Item | Claim or rule | Verdict | Evidence |")
L.append("|---|---|---|---|")
for t in AUDIT: L.append("| " + " | ".join(cell(x) for x in t) + " |")
L.append("\n## 4. Measured findings the amendment does not use, by effect size\n")
L.append("| Rank | Effect | Finding | Records |")
L.append("|---:|---|---|---|")
for t in UNUSED: L.append("| " + " | ".join(cell(x) for x in t) + " |")
L.append("\n## 5. Recommendations\n")
L.append("| Decision | Recommended default | Evidence grade | Records |")
L.append("|---|---|---|---|")
for t in RECS: L.append("| " + " | ".join(cell(x) for x in t) + " |")
L.append("")
prose = open(os.path.join(HERE, "prose.md")).read()
L.append(prose)
out = "\n".join(L)
open(os.path.join(NOTES, "measured_deltas.md"), "w").write(out)
words = sum(len(re.findall(r"\S+", ln)) for ln in out.split("\n") if not ln.lstrip().startswith("|"))
print("records", len(A), "official_ab", sum(r["kind"] == "official_ab" for r in A), "prose words (non-table lines)", words)
