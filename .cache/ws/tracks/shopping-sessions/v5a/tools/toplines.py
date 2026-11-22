import re, sys
cur=None; rows=[]
for line in open(sys.argv[1]):
    m = re.match(r"-- Annotated source file: (.*)", line.strip())
    if m: cur = m.group(1).split("/")[-1]; continue
    m = re.match(r"\s*([\d,]+)\s+(?:\(.*?\)\s+)?(.*)", line.rstrip("\n"))
    if cur and m and m.group(1).replace(",","").isdigit():
        n = int(m.group(1).replace(",",""))
        t = m.group(2)
        if "annotated" in t or "threshold" in t: continue
        if n > int(sys.argv[2]): rows.append((n, cur, t.strip()[:140]))
rows.sort(reverse=True)
for r in rows[:int(sys.argv[3])]: print(f"{r[0]:>12,} {r[1]:<14} {r[2]}")
