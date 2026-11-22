import sys, collections, re, os
out, want = sys.argv[1], sys.argv[2]
fl = fn = None; acc = collections.Counter(); files = {}
for line in open(out):
    if line.startswith("fl="): fl = line[3:].strip(); continue
    if line.startswith("fn="): fn = line[3:].strip(); continue
    if fn and want in fn and line[:1].isdigit():
        a = line.split()
        acc[(fl, int(a[0]))] += int(a[1])
tot = sum(acc.values()); print(f"total {tot:,}")
src = {}
def text(f, n):
    if f not in src:
        try: src[f] = open(f).read().split("\n")
        except Exception: src[f] = []
    L = src[f]; return L[n-1].strip()[:110] if 0 < n <= len(L) else "?"
for (f, n), c in acc.most_common(int(sys.argv[3])):
    print(f"{c:>11,} {os.path.basename(f)}:{n:<5} {text(f, n)}")
