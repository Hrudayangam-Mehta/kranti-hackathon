#!/usr/bin/env python3
"""Static packaging checks of a submission folder. Prints "PASS|FAIL <id> <message>" lines.

usage: pack.py <dist dir>
"""
import json, os, re, stat, sys

dist = sys.argv[1]
# oven/bun:1.4.4-slim as served by registry-1.docker.io on 2026-11-21 07:15 UTC (index sha256 verified
# against the Docker-Content-Digest header; tag last pushed 2026-10-22; image revision 38afee6c8 = local bun)
TAG = "oven/bun:1.4.4-slim"
KNOWN = {"sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4": "multi-arch index",
         "sha256:13b43f8bb2c63f5d89c56205c4279b85620363296a00ada33ff7ad568f3688e7": "linux/amd64 manifest"}
ENGINE = ["BUN_JSC_useFTLJIT=0", "BUN_JSC_useConcurrentJIT=0", "BUN_JSC_useConcurrentGC=0", "BUN_JSC_numberOfGCMarkers=1",
          "BUN_JSC_numberOfBaselineCompilerThreads=1", "BUN_JSC_numberOfDFGCompilerThreads=1", "BUN_JSC_numberOfFTLCompilerThreads=1",
          "BUN_JSC_minNumberOfWorklistThreads=1", "BUN_JSC_maxNumberOfWorklistThreads=1"]
out = []
def res(ok, cid, msg): out.append(f"{'PASS' if ok else 'FAIL'} {cid} {msg}")

df_path = os.path.join(dist, "Dockerfile")
df = open(df_path).read() if os.path.isfile(df_path) else ""
res(bool(df), "P1-dockerfile-top", "Dockerfile at the top level" if df else "no Dockerfile at the top level")
# logical instructions (join continuation lines, drop comments)
logical, cur = [], ""
for raw in df.splitlines():
    if not cur and raw.strip().startswith("#"): continue
    cur += raw.rstrip("\\").rstrip() + " " if raw.rstrip().endswith("\\") else raw
    if not raw.rstrip().endswith("\\"):
        if cur.strip(): logical.append(cur.strip())
        cur = ""
instr = [(l.split(None, 1)[0].upper(), l.split(None, 1)[1] if " " in l else "") for l in logical]
froms = [a for k, a in instr if k == "FROM"]
img = froms[0].split()[0] if froms else ""
dig = img.split("@", 1)[1] if "@" in img else ""
res(len(froms) == 1 and img.split("@")[0] == TAG, "P2-base-version", f"FROM {img or '(none)'} (expected tag {TAG}; local bun is checked against it separately)")
res(dig in KNOWN, "P3-base-digest", f"digest pin {dig} = {KNOWN[dig]}" if dig in KNOWN else
    ("no @sha256 digest: a re-pushed tag would change the base image of a final rebuild; use " + TAG + "@" + next(iter(KNOWN)) if not dig else f"unknown digest {dig}"))
bad = [f"{k} {a[:50]}" for k, a in instr if k not in ("FROM", "ENV", "WORKDIR", "COPY", "ENTRYPOINT", "CMD", "LABEL", "USER", "ARG")]
copies = [a for k, a in instr if k == "COPY"]
netty = [a for k, a in instr if re.search(r"https?://|curl|wget|apt|apk|npm|bun (install|add)|pip|git ", a)]
res(not bad and not netty and all(not re.search(r"--from|https?://", c) for c in copies), "P4-no-build-network",
    f"instructions {[k for k, _ in instr]}: no RUN/ADD, no downloads, COPY only from the build context" if not (bad or netty) else f"build steps that may need network or run code: {bad + netty}")
ep = [a for k, a in instr if k == "ENTRYPOINT"]
wd = [a for k, a in instr if k == "WORKDIR"]
try: epj = json.loads(ep[-1]) if ep else None
except ValueError: epj = None
ok_ep = isinstance(epj, list) and len(epj) >= 2 and epj[0] == "bun" and epj[1].startswith("/bot/") and wd and wd[-1] == "/bot" and "COPY . ." in [f"COPY {c}" for c in copies] \
    and os.path.isfile(os.path.join(dist, epj[1][len("/bot/"):]))
res(ok_ep, "P5-entrypoint", f"ENTRYPOINT {ep[-1] if ep else None} (exec form), WORKDIR {wd[-1] if wd else None}, target file present" if ok_ep else f"ENTRYPOINT/WORKDIR/COPY do not resolve to a file in the folder: {ep} {wd} {copies}")
envtxt = " ".join(a for k, a in instr if k == "ENV")
missing = [e for e in ENGINE if not re.search(r"(?<![A-Za-z0-9_])" + re.escape(e) + r"(?![0-9])", envtxt.replace("\\", " "))]
res(not missing, "P6-engine-limits", "all 9 BUN_JSC_* one-CPU settings in ENV" if not missing else f"missing engine settings {missing}")
total, modes, links = 0, [], []
for root, dirs, files in os.walk(dist):
    for f in files + dirs:
        p = os.path.join(root, f); st = os.lstat(p)
        if stat.S_ISLNK(st.st_mode): links.append(f)
        elif stat.S_ISREG(st.st_mode):
            total += st.st_size
            if not st.st_mode & stat.S_IROTH: modes.append(f)
res(total < 20_000_000, "P7-size", f"{total} bytes in the folder (limit 20,000,000 at the commit; .git adds its own objects)")
res(not modes and not links, "P8-file-modes", "every file world-readable, no symlinks (uid 65534 must read /bot)" if not (modes or links) else f"unreadable {modes} symlinks {links}")
b = open(os.path.join(dist, "bot.js")).read() if os.path.isfile(os.path.join(dist, "bot.js")) else ""
imps = sorted(set(re.findall(r'from"([^"]+)"|import\("([^"]+)"\)|require\("([^"]+)"\)', b)))
imps = sorted({x for t in imps for x in t if x})
builtin = {"fs", "path", "os", "node:fs", "node:path", "node:os", "util", "node:util", "perf_hooks", "node:perf_hooks"}
res(b.startswith("// @bun\n") and all(i in builtin for i in imps), "P9-single-bundle", f"bun bundle pragma present; imports only {imps}" if b else "bot.js missing")
print("\n".join(out))
sys.exit(1 if any(l.startswith("FAIL") for l in out) else 0)
