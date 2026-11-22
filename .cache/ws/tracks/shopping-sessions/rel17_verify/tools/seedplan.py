#!/usr/bin/env python3
import datetime as dt
import sys

M = (1 << 64) - 1


def mix(v):
    v = ((v ^ (v >> 30)) * 0xBF58476D1CE4E5B9) & M
    v = ((v ^ (v >> 27)) * 0x94D049BB133111EB) & M
    return v ^ (v >> 31)


class R:
    def __init__(self, seed, stream, index=0):
        self.s = mix(mix(seed ^ 0x5D588B656C078965) ^ mix(stream + 1) ^ ((index * 0x9E3779B97F4A7C15) & M))

    def nxt(self):
        self.s = (self.s + 0x9E3779B97F4A7C15) & M
        return mix(self.s)

    def below(self, bound):
        return (self.nxt() * bound) >> 64

    def between(self, lo, hi):
        return lo + self.below(hi - lo + 1)


def days(y, m, d):
    return (dt.date(y, m, d) - dt.date(1970, 1, 1)).days


def plan(seed):
    r = R(seed, 0)
    first, last = days(2025, 1, 1), days(2028, 12, 31) - 14
    start = first + r.below(last - first)
    p = R(seed, 7)
    p.between(3, 6)
    ev = p.between(24, 160)
    return dt.date(1970, 1, 1) + dt.timedelta(days=start), ev


def main():
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    leap = dt.date(2028, 2, 29)
    for seed in range(lo, hi):
        s, ev = plan(seed)
        e = s + dt.timedelta(days=14)
        flag = "LEAP" if s <= leap < e else ""
        if flag or ev >= 150 or "-v" in sys.argv:
            print(seed, s, e, "event_files", ev, flag)


if __name__ == "__main__":
    main()
