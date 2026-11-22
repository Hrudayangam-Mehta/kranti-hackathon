# Dump the showdown rows of the dmclaughlin evidence file in compact form (data parsing only).
import json, sys
path = sys.argv[1]
rows = []
with open(path, encoding="utf-8", errors="replace") as f:
    for line in f:
        line = line.strip()
        if line:
            rows.append(json.loads(line))
mm = [r for r in rows if "match_kind" in r]
print("== derived group metrics (winner / top4 / bottom)")
for r in mm:
    if r.get("group") != "all":
        continue
    m = r["metrics"]
    bg = m.get("by_group", {})
    def fmt(g):
        d = bg.get(g)
        if not d:
            return "-"
        return "mean=%s med=%s n=%s [%s..%s]" % (d.get("mean"), d.get("median"), d.get("n"), d.get("min"), d.get("max"))
    print("%-18s | %-45s | W %s | T4 %s | B %s | n=%s conf=%s" % (r["metric"], m.get("description"), fmt("winner"), fmt("top4"), fmt("bottom"), r.get("sample_size"), r.get("confidence")))
    extra = {k: v for k, v in m.items() if k not in ("description", "by_group", "winner_minus_bottom")}
    if extra:
        print("   extra", json.dumps(extra)[:600])
print()
print("== winner rows")
for r in mm:
    if r.get("group") == "all":
        continue
    print(json.dumps({k: r[k] for k in ("id", "subject", "match_ids", "timestamp", "sample_size", "confidence", "notes", "source")}))
    print("   ", json.dumps(r["metrics"]))
print()
print("== other rows")
for r in rows:
    if "match_kind" in r:
        continue
    print(json.dumps(r)[:1800])
    print()
