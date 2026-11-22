import sys, glob, csv
MASK = (1 << 40) - 1
M1, M2 = 0x9E3779B97F4B, 0xD6E8FEB86659
IM1, IM2 = pow(M1, -1, 1 << 40), pow(M2, -1, 1 << 40)
def unscr(x, k):
    y = (x * IM2) & MASK
    y = y ^ (y >> 17) ^ (y >> 34)
    y ^= k & MASK
    return (y * IM1) & MASK
D = "0123456789abcdefghijklmnopqrstuvwxyz"
def canon(s):
    if len(s) < 2 or len(s) > 9 or s[0] != "u" or any(c not in D for c in s[1:]) or (len(s) > 2 and s[1] == "0"):
        return None
    x = int(s[1:], 36)
    return x if x <= MASK else None
key, gcap = int(sys.argv[2], 0), int(sys.argv[3])
ids = set()
for f in glob.glob(sys.argv[1] + "/events/*.csv"):
    with open(f) as fh:
        next(fh)
        for line in fh:
            parts = line.rstrip("\n").split(",")
            if len(parts) == 7:
                ids.add(parts[1].strip('"'))
inlane = 0
canonical = 0
for s in ids:
    x = canon(s)
    if x is None:
        continue
    canonical += 1
    v = unscr(x, key)
    if (v >> 9) < gcap and (v & 511) < 16:
        inlane += 1
print(f"distinct user IDs {len(ids)}, canonical {canonical}, in lane with key {key:#x} gcap {gcap}: {inlane}")
