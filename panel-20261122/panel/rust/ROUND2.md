# Rust pipeline panel: round 2 experiment

## Status and ownership

Implemented an experimental alternative in `experiments/bins`, copied from the team's round-1 source. Production source remains unchanged by this round. The parent owns compilation, official-fixture/reference gates, timing, and promotion decisions. The algorithm reviewer owns an independently written model verifier and the database reviewer examines semantic equivalence.

## Exact sparse-bin sessionization

The baseline globally radix-sorts event timestamps within each person-hash partition, then scatters them by person while preserving that time order. The experiment scatters by person first. For groups with at most `SESSIONS_BIN_THRESHOLD` events (default 8), it sorts the group's packed event values and runs the original session code. Larger groups use sparse bins of exactly 1,800,000 milliseconds.

Each bin records its minimum timestamp, maximum timestamp, and a linked list of original event indices. Occupied bin IDs are sorted. All events within one half-open bin are connected because their maximum possible gap is 1,799,999 milliseconds. Between occupied bins, sessions join exactly when the next minimum minus the preceding maximum is at most 1,800,000 milliseconds. Original events are traversed to accumulate every event count, purchase, and category contribution. Attribution and daily rows use the session's minimum timestamp, including when a connected session crosses midnight. Click sorting and tie resolution are unchanged.

The occupied-bin list is reset per person, and only touched bin heads are reset. Arrays have one entry per possible bin in the already validated compact window; no histogram over unbounded absolute timestamps is allocated. The original per-event radix scratch vector is removed. Original records and their per-person scatter remain.

## Why this is exact

For every nonempty bin, let `min_b` and `max_b` denote minimum and maximum timestamps. Because the bin width equals the session threshold, all events in a bin belong to one connected component of the sorted threshold graph. The only possible connection to the next occupied bin is between `max_b` and `min_next`. Those are exactly the consecutive boundary timestamps in a complete sorted traversal. Replacing an internal sorted run with its extrema therefore preserves every component boundary. Each event belongs to exactly one original-index list, so all additive values are preserved. Day assignment happens after component discovery, using the component start, and is unaffected by internal order.

## Required acceptance evidence

- Full fixture, generated-reference, scalar and threaded gates.
- Exact-threshold and bin-boundary cases at `GAP-1`, `GAP`, `GAP+1`; chains continuing across midnight and multiple days.
- Equal-time events with different categories and category-revenue ties.
- Few-event users, many-event users, a whale component, and unusually click-heavy data.
- Repeated interleaved benchmarks against both original live tip and round 1, with threshold 0, 8 and another short-group cutoff if needed. The experiment is a hypothesis, not an improvement claim.

## Implementation caveat

Grouping before sorting was slower in earlier team research for some distributions. This experiment adds exact bin aggregation to that approach, but the extra linked-list traversal and sparse-array access may still cost more than linear radix passes. If it loses on representative data or increases worst-case memory unacceptably, retain the original algorithm and record the rejected experiment.
