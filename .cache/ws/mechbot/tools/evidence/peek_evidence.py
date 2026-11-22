# Inspect the 37 per-mech match-summary rows in the dmclaughlin evidence file.
import json, sys, collections
path = sys.argv[1]
rows = []
with open(path, encoding="utf-8", errors="replace") as f:
    for line in f:
        line = line.strip()
        if line:
            rows.append(json.loads(line))
mm = [r for r in rows if "match_kind" in r]
print("match rows", len(mm))
c = collections.Counter()
for r in mm:
    c[(r.get("match_kind"), r.get("group"), r.get("evidence_class"), json.dumps(r.get("source"))[:80])] += 1
for k, v in c.most_common():
    print(v, k)
print()
for r in mm[:2]:
    print(json.dumps(r, indent=1)[:5000])
    print("-----")
mk = collections.Counter()
for r in mm:
    for k in (r.get("metrics") or {}).keys():
        mk[k] += 1
print(mk)
