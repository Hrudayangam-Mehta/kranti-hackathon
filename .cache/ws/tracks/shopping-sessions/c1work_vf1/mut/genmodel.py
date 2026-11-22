#!/usr/bin/env python3
"""Verifier's own replica of the kit generator's ID scheme, written from
kit/unz/generator/src/{random.rs,plan.rs,text.rs,user.rs}.

random.rs: SplitMix64 streams; plan.rs Dataset::plan draws window, 4 rates,
then user_key, event_key, click_key; text.rs scramble/base36; user.rs
user_id = 'u' + base36(scramble(index*512 + alias, user_key)), kiosk IDs
from KIOSK_BASE = 1<<39 plus the kiosk number.
"""
M64 = (1 << 64) - 1
MASK40 = (1 << 40) - 1
GOLDEN = 0x9E3779B97F4A7C15
DAY = 86_400_000
ALIAS_SLOTS = 512
KIOSK_BASE = 1 << 39
DIG = "0123456789abcdefghijklmnopqrstuvwxyz"

STREAM = {"Dataset": 0, "Products": 1, "Campaigns": 2, "UserPlan": 3, "User": 4,
          "ShuffleEvents": 5, "ShuffleClicks": 6, "Parts": 7, "ShuffleLinks": 8}


def mix(v):
    v &= M64
    v = ((v ^ (v >> 30)) * 0xBF58476D1CE4E5B9) & M64
    v = ((v ^ (v >> 27)) * 0x94D049BB133111EB) & M64
    return v ^ (v >> 31)


class Random:
    def __init__(self, seed, stream, index):
        self.state = mix(mix(seed ^ 0x5D588B656C078965) ^ mix(STREAM[stream] + 1)
                         ^ ((index * GOLDEN) & M64))

    def next_u64(self):
        self.state = (self.state + GOLDEN) & M64
        return mix(self.state)

    def below(self, bound):
        return (self.next_u64() * bound) >> 64

    def unit(self):
        return (self.next_u64() >> 11) / float(1 << 53)

    def rate(self, lo, hi):
        return lo + (hi - lo) * self.unit()


def days_from_civil(y, m, d):
    y = y - 1 if m <= 2 else y
    era = y // 400
    yoe = y - era * 400
    doy = (153 * ((m + 9) % 12) + 2) // 5 + d - 1
    return era * 146097 + yoe * 365 + yoe // 4 - yoe // 100 + doy - 719468


def plan_keys(seed):
    r = Random(seed, "Dataset", 0)
    first = days_from_civil(2025, 1, 1)
    last = days_from_civil(2028, 12, 31) - 14
    ws = (first + r.below(last - first)) * DAY
    for _ in range(4):
        r.rate(0, 1)
    uk, ek, ck = r.next_u64(), r.next_u64(), r.next_u64()
    return ws, uk, ek, ck


def scramble(value, key):
    m = value & MASK40
    m = ((m * 0x9E3779B97F4B) ^ key) & MASK40
    m ^= m >> 17
    return (m * 0xD6E8FEB86659) & MASK40


INV2 = pow(0xD6E8FEB86659, -1, 1 << 40)
INV1 = pow(0x9E3779B97F4B, -1, 1 << 40)


def unscramble(n, key):
    m = (n * INV2) & MASK40
    m ^= m >> 17
    m ^= m >> 34
    m = (m ^ key) & MASK40
    return (m * INV1) & MASK40


def base36(v):
    if v == 0:
        return "0"
    s = []
    while v:
        s.append(DIG[v % 36])
        v //= 36
    return "".join(reversed(s))


def user_id(number, key):
    return "u" + base36(scramble(number, key))


def decode(uid, key):
    """Canonical generator ID -> (person, alias); None otherwise."""
    if isinstance(uid, bytes):
        try:
            uid = uid.decode("ascii")
        except UnicodeDecodeError:
            return None
    if len(uid) < 2 or uid[0] != "u":
        return None
    body = uid[1:]
    if any(c not in DIG for c in body):
        return None
    if len(body) > 1 and body[0] == "0":
        return None
    v = int(body, 36)
    if v > MASK40:
        return None
    x = unscramble(v, key)
    return x >> 9, x & 511


def _selftest():
    import random
    rnd = random.Random(5)
    for _ in range(20000):
        k = rnd.getrandbits(64)
        x = rnd.getrandbits(40)
        assert unscramble(scramble(x, k), k & MASK40) == x
        assert unscramble(scramble(x, k), k) == x
    return True


if __name__ == "__main__":
    import sys
    _selftest()
    for s in sys.argv[1:]:
        ws, uk, ek, ck = plan_keys(int(s))
        print(s, ws, hex(uk & MASK40), hex(uk))
