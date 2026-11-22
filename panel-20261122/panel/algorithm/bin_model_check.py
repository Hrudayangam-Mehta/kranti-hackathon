#!/usr/bin/env python3
"""Independent model check of exact session bins; no production implementation imported.

The reference sorts every person's events. The candidate groups timestamps into
half-open bins, walks only occupied bins, and follows original event indices.
It compares full session membership as well as daily counts/revenue/categories.
"""
from __future__ import annotations

from collections import defaultdict
from itertools import combinations_with_replacement, permutations
import hashlib
import json
from pathlib import Path
import random
import time

GAP = 1_800_000
DAY = 86_400_000
SEED = 0xA19B3C77


def by_sort(events, gap):
    people = defaultdict(list)
    for index, (person, ts, price, category) in enumerate(events):
        people[person].append((ts, index))
    sessions = {}
    for person, rows in people.items():
        rows.sort()
        out, current = [], []
        previous = None
        for ts, index in rows:
            if previous is not None and ts - previous > gap:
                out.append(current)
                current = []
            current.append(index)
            previous = ts
        if current:
            out.append(current)
        sessions[person] = out
    return sessions


def by_bins(events, gap):
    people = defaultdict(dict)
    for index, (person, ts, price, category) in enumerate(events):
        bucket = ts // gap
        existing = people[person].get(bucket)
        if existing is None:
            people[person][bucket] = [ts, ts, [index]]
        else:
            existing[0] = min(existing[0], ts)
            existing[1] = max(existing[1], ts)
            existing[2].append(index)
    sessions = {}
    for person, occupied in people.items():
        out, current = [], []
        previous_max = None
        for bucket in sorted(occupied):
            minimum, maximum, members = occupied[bucket]
            if previous_max is not None and minimum - previous_max > gap:
                out.append(current)
                current = []
            current.extend(members)
            previous_max = maximum
        if current:
            out.append(current)
        sessions[person] = out
    return sessions


def normalize(events, sessions, origin):
    exact = {}
    daily = {}
    for person, groups in sessions.items():
        exact[person] = []
        rows = defaultdict(lambda: [0, 0, 0, defaultdict(int)])
        covered = []
        for indices in groups:
            covered.extend(indices)
            timestamps = [events[index][1] for index in indices]
            start, end = min(timestamps), max(timestamps)
            day = (start + origin) // DAY
            revenue = 0
            categories = defaultdict(int)
            for index in indices:
                _, _, price, category = events[index]
                if price:
                    categories[category] += price
                    revenue += price
            exact[person].append((start, end, tuple(sorted(indices)), revenue, tuple(sorted(categories.items()))))
            row = rows[day]
            row[0] += 1
            row[1] += len(indices)
            row[2] += revenue
            for category, value in categories.items():
                row[3][category] += value
        assert len(covered) == len(set(covered)), "Repeated event index in sessions"
        expected = [index for index, event in enumerate(events) if event[0] == person]
        assert sorted(covered) == expected, "Session membership lost or added events"
        exact[person].sort()
        for day, (count, size, revenue, categories) in rows.items():
            top = min(categories, key=lambda c: (-categories[c], c.encode("utf-8"))) if categories else None
            daily[person, day] = count, size, revenue, top
    return exact, daily


def check(events, gap=GAP, origin=0):
    left = normalize(events, by_sort(events, gap), origin)
    right = normalize(events, by_bins(events, gap), origin)
    assert left == right, (gap, origin, events, left, right)


def run():
    started = time.monotonic()
    rng = random.Random(SEED)
    categories = ["a", "z", "unknown", "rare", "Zulu", "é", "Ω", "漢", " c "]
    deterministic = [
        [],
        [("a", 0, 0, None)],
        [("a", 0, 5, "z"), ("a", GAP, 5, "a")],
        [("a", 0, 5, "z"), ("a", GAP + 1, 5, "a")],
        [("a", GAP - 1, 0, None), ("a", GAP + 1, 1, "rare")],
        [("a", 1, 0, None), ("a", 2 * GAP - 1, 1, "rare")],
        [("a", DAY - 1, 5, "z"), ("a", DAY, 6, "a")],
        [("a", DAY - 1, 5, "z"), ("a", DAY + GAP, 6, "a")],
        [("a", 0, 0, None), ("b", 0, 5, "rare"), ("a", GAP, 5, "a")],
        [("a", 0, 10_000_000, "z"), ("a", 0, 10_000_000, "a")],
        [("a", (1 << 32) - 2, 1, "rare"), ("a", (1 << 32) - 1, 1, "rare")],
        [("a", k * GAP, 10_000_000, categories[k % len(categories)]) for k in range(400)],
    ]
    # Interleaved whales crossing many midnights, with >32-bit total revenue.
    deterministic.append([
        ("whale" if k % 3 else "shared-device-person", k * 10_000,
         10_000_000 if k % 7 == 0 else 0, categories[k % len(categories)])
        for k in range(80_000)
    ])
    for events in deterministic:
        for origin in (0, DAY - 17, -DAY - 1):
            check(events, origin=origin)
            reversed_events = list(reversed(events))
            check(reversed_events, origin=origin)
    exhaustive = 0
    # Small integer timestamps exhaustively cover every within/across-bin relation.
    for length in range(0, 8):
        for values in combinations_with_replacement(range(10), length):
            events = [("x", t, 1 if i % 2 else 0, categories[i % len(categories)]) for i, t in enumerate(values)]
            check(events, gap=3, origin=DAY - 5)
            exhaustive += 1
    random_cases = 4_000
    event_total = sum(map(len, deterministic))
    for case in range(random_cases):
        people = ["p" + str(i) for i in range(rng.randrange(1, 9))]
        events = []
        for person in people:
            cursor = rng.randrange(0, 10 * DAY)
            for _ in range(rng.randrange(0, 150)):
                cursor += rng.choice((0, 1, GAP - 1, GAP, GAP + 1, DAY, rng.randrange(0, 2 * GAP)))
                price = rng.choice((0, 0, 0, 1, 10_000_000, rng.randrange(1, 10_000_001)))
                events.append((person, cursor, price, rng.choice(categories)))
        rng.shuffle(events)
        event_total += len(events)
        check(events, origin=rng.randrange(-2 * DAY, 2 * DAY))
    result = {
        "result": "PASS",
        "reference": "sort each person's event timestamps, split on gap > threshold",
        "candidate": "half-open threshold-width bins; exact minimum/maximum boundary comparison",
        "deterministic_cases": len(deterministic),
        "deterministic_orders": 2,
        "deterministic_day_origins": 3,
        "exhaustive_small_cases": exhaustive,
        "random_cases": random_cases,
        "random_seed": SEED,
        "generated_events_in_deterministic_and_random_cases": event_total,
        "seconds": round(time.monotonic() - started, 3),
        "limits": [
            "Model verifies mathematics and payload membership, not the Rust unsafe indexing implementation.",
            "Inputs already have canonical person identities and have completed event dedup/validation.",
            "No claim about speed, allocation behavior, thread safety, or official scoring follows from this test."
        ],
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
    Path(__file__).with_name("bin_model_results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    run()
