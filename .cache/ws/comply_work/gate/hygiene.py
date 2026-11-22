#!/usr/bin/env python3
"""Static hygiene checks of a submission folder (REPO_HYGIENE.md). Prints "PASS|FAIL <id> <message>" lines.

usage: hygiene.py <dist dir> <web dir with leaderboard snapshots> [--schema kit/mechfight.schema.json] [--waive id,id]
"""
import json, os, re, sys

dist, web = sys.argv[1], sys.argv[2]
waive = set(sys.argv[sys.argv.index("--waive") + 1].split(",")) if "--waive" in sys.argv else set()
out = []
def res(ok, cid, msg):
    tag = "PASS" if ok else ("FAIL" if cid not in waive else "FAIL[waived]")
    out.append(f"{tag} {cid} {msg}")

files = sorted(f for f in os.listdir(dist))
texts = {f: open(os.path.join(dist, f), encoding="utf-8", errors="replace").read() for f in files if os.path.isfile(os.path.join(dist, f))}
bundle = texts.get("bot.js", "")
prose = {f: t for f, t in texts.items() if f != "bot.js"}
# string literals of the bundle ("..", '..', `..`), the part a reader sees as words
lits = re.findall(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`', bundle)
lits = [a or b or c for a, b, c in lits]
littext = "\n".join(lits)

# H1 file set
expect = {"Dockerfile", "LICENSE", "README.md", "bot.js"}
extra = [f for f in files if f not in expect]
res(set(files) >= expect and not extra, "H1-files", f"files {files}" + (f"; unexpected: {extra}" if extra else ""))
# H2 the owner's grep, case-insensitive, any substring (exactly as REPO_HYGIENE.md)
rx = re.compile(r"fare.i|royale|mechfight|osu|ohio|campus|buildathon|builders", re.I)
hits = []
for f, t in texts.items():
    for m in rx.finditer(t):
        hits.append(f"{f}: ...{t[max(0, m.start() - 25):m.end() + 15]}...")
res(not hits, "H2-forbidden-words", "owner grep prints nothing" if not hits else f"{len(hits)} hit(s): " + " | ".join(hits[:4]))
# H3 other teams' names
names = set()
for fn in ("mech_leaderboard_now.json",):
    try:
        for row in json.load(open(os.path.join(web, fn))): names.add(str(row[1]))
    except (OSError, ValueError, IndexError): pass
try: names.update(json.load(open(os.path.join(web, "mech_submission_times.json"))).keys())
except (OSError, ValueError): pass
nh = []
for n in sorted(names):
    pat = re.compile(r"(?<![A-Za-z0-9])" + re.escape(n) + r"(?![A-Za-z0-9])", re.I if len(n) >= 4 else 0)
    hay = {**prose, "bot.js(strings)": littext}
    if len(n) >= 6 and not n.isdigit(): hay["bot.js(code)"] = bundle
    for f, t in hay.items():
        if pat.search(t): nh.append(f"{n!r} in {f}")
res(bool(names) and not nh, "H3-team-names", f"{len(names)} team names checked" + (f"; hits: {nh[:6]}" if nh else "") + ("" if names else "; NO NAME LIST FOUND"))
# H4 leaderboard scores (text files and bundle strings; numeric code literals listed only)
scores = set()
try:
    for row in json.load(open(os.path.join(web, "mech_leaderboard_now.json"))): scores.add(f"{float(row[2]):.2f}")
except (OSError, ValueError, IndexError): pass
sh = [f"{s} in {f}" for s in sorted(scores) for f, t in {**prose, "bot.js(strings)": littext}.items() if re.search(r"(?<![0-9.])" + re.escape(s) + r"(?![0-9])", t)]
codehits = sorted({s for s in scores if re.search(r"(?<![0-9.])" + re.escape(s) + r"(?![0-9])", bundle)})
res(bool(scores) and not sh, "H4-scores", f"{len(scores)} board scores checked in prose and strings" + (f"; hits {sh[:6]}" if sh else "") + (f"; (numeric code literals equal to a board score, not counted: {codehits})" if codehits else ""))
# H5 comments in the bundle
cl = [l for l in bundle.split("\n") if l.strip().startswith("//") and l.strip() != "// @bun"]
blk = len(re.findall(r"/\*", bundle))
res(not cl and blk == 0 and "@license" not in bundle, "H5-no-comments", f"comment lines {len(cl)}, block comments {blk} (only the // @bun pragma allowed)")
# H6 secrets, local paths, personal or project names
leak = re.compile(r"ghp_[A-Za-z0-9]{10,}|github_pat_\w{10,}|gh[ousr]_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|/tmp/claude|/home/user|/root/|scratchpad|mechbot|yang_mills|sourceMappingURL")
lh = [f"{f}: {m.group(0)[:30]}" for f, t in texts.items() for m in leak.finditer(t)]
res(not lh, "H6-no-secrets-or-paths", "no tokens, keys, local paths or source maps" if not lh else f"hits: {lh[:5]}")
# H7 README minimal and carrying the required statements
rd = prose.get("README.md", "")
need = {"build command": "docker build" in rd, "libraries statement": re.search(r"librar", rd, re.I) is not None,
        "earlier-code statement": re.search(r"earlier code|before the (event|weekend)", rd, re.I) is not None,
        "AI statement": re.search(r"\bAI\b", rd) is not None, "MIT licence": "MIT" in rd}
bad = re.search(r"strateg|tactic|kite|kiting|retreat|laser|score|leaderboard|placement|architecture|brain|FFA|squad", rd, re.I)
res(all(need.values()) and not bad and len(rd) < 1500, "H7-readme", f"{len(rd)} bytes; " + ", ".join(k + ("" if v else " MISSING") for k, v in need.items()) + (f"; method/result word {bad.group(0)!r}" if bad else ""))
# H8 MIT licence text
lic = prose.get("LICENSE", "")
res(lic.startswith("MIT License") and "Permission is hereby granted, free of charge" in lic and "WITHOUT WARRANTY OF ANY KIND" in lic, "H8-mit-license", "LICENSE is the MIT text" if lic else "LICENSE missing")
# H9 method exposure: named parameter table and descriptive strings in the bundle (protocol words excluded)
voc = set()
def walk(x):
    if isinstance(x, dict):
        for k, v in x.items(): voc.add(k); walk(v)
    elif isinstance(x, list):
        for v in x: walk(v)
    elif isinstance(x, str): voc.add(x)
schema_path = sys.argv[sys.argv.index("--schema") + 1] if "--schema" in sys.argv else ""
if schema_path:
    try: walk(json.load(open(schema_path)))
    except (OSError, ValueError): pass
allow = {"/arena", "utf8", "world.json", "terrain.i16", "v2", "[bot]", "fs", "path", "function", "object", "number", "string",
         "boolean", "undefined", "uncaughtException", "unhandledRejection", "crownBase", "crownR", "crownX", "crownY", "trunkR", "data"}
params = sorted(set(re.findall(r"[{,]([A-Za-z_$][A-Za-z0-9_$]{5,}):-?[0-9.]+(?:e-?[0-9]+)?(?=[,}])", bundle)))
desc = sorted({s for s in lits if s not in voc and s not in allow and re.search(r"[A-Za-z]{4,}", s)})
sentences = [s for s in desc if " " in s.strip()]
res(len(params) <= 20 and not desc, "H9-method-exposure", f"{len(params)} named numeric parameters (e.g. {', '.join(params[:5])}); {len(desc)} non-protocol words/strings (e.g. {', '.join(repr(x[:40]) for x in desc[:5])}), {len(sentences)} of them log sentences")
print("\n".join(out))
sys.exit(1 if any(l.startswith("FAIL ") for l in out) else 0)
