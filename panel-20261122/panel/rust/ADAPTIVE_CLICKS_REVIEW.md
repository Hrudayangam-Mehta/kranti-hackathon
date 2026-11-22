# Independent adaptive click review

## Exact scope

Read the complete delta between `experiments/dense-combined/src/fast/mod.rs` and `experiments/dense-adaptive/src/fast/mod.rs`, plus the surrounding grouping, radix, session and cleanup implementations. Reviewed source SHA-256: `bc8a5180cac54823671ac5d3512b4315328c95eaa8a2a551fbf43528187a0114`.

No source edits or CPU tests were performed by this reviewer. The parent owns the candidate build and measured decision; the database expert owns the independent behavioral gate.

## Function contracts and findings

| Function/path | Required invariant | Source finding |
|---|---|---|
| `Worker::partition`, click grouping | All clicks for a canonical person enter one contiguous range; unrelated users are ignored. | Existing exact lookup and prefix-scatter retained. Removing the global sort does not change group membership. |
| `Worker::partition`, ranges of at most four clicks | Later processing must not assume temporal order. | These groups skip sorting and exclusively use the direct scan in `credit_session`. |
| `Worker::partition`, 5–64 clicks | Sort timestamp ascending; equal timestamps must place the bytewise smallest ID last. | Comparator uses timestamp ascending and `Domain::cmp(b.click, a.click)`, preserving exact dense/hex/opaque-ID order. |
| `Worker::partition`, more than 64 clicks | Same order as the medium path, including timestamp ties. | Copies group into reusable local scratch, radix-sorts timestamps, then sorts each equal-time run by descending exact ID. Low/high are computed from the same nonempty group. |
| `radix_by_ts` | Scratch length equals current group length and every source timestamp lies within supplied bounds. | Existing routine clears/resizes its scratch on each nontrivial invocation. Early low==high return preserves the full copied data; subsequent tie sort still runs. Vector swapping does not retain stale logical lengths. |
| `credit_session`, direct path | Consider every click in the inclusive seven-day window, choose latest timestamp then smallest ID, count each assisting campaign once per session. | Future-time check short-circuits before unsigned subtraction. `> WEEK_MS` excludes only out-of-window times. Exact comparison selects the proper tie. `in_window` is used as a membership flag; it and `active` are cleared after every direct session. |
| `credit_session`, ordered path | Maintain an incremental inclusive window as session starts advance. | Existing high/low cursor and count logic preserved. Exact boundary equality stays eligible. The last active sorted click remains the correct primary credit. |
| `credit_session`, shared accumulation | Credit one session, add conversion/revenue only for positive revenue, and increment distinct campaign assists. | This is the original common accumulation moved into one function. No output schema or category semantics change. |
| `Worker::person` / `Worker::person_bins` | Both session algorithms must use identical attribution and clear person-specific active state. | Both now call the same routine and retain end-of-person cleanup. Direct and sorted modes cannot switch within one person because the fixed range length controls the mode. |

No new unchecked access was introduced by the change. The assist unchecked write still depends on campaign indices validated by the parser/dimension table, as in the baseline. The `active_at` entries left untouched by direct mode are harmless: direct mode never removes by stored position, and ordered mode rewrites the position whenever a campaign enters an empty window.

## Remaining evidence and performance limits

The static review found no correctness blocker. Applicable behavioral boundaries are 4/5 and 64/65 clicks, exact seven-day equality and one millisecond beyond it, duplicate campaigns, latest-time ID ties across ID encodings, and multiple sessions before/after expiration. These were sent to the database reviewer; passing them must be reported separately from this source review.

The direct path performs at most four click inspections per session. This removes sort traffic for tiny groups but repeats those inspections for users with many sessions; the constant bound makes that an intentional measured tradeoff. Medium local comparison sorting and per-whale radix scratch can win or lose depending on group distribution. No speedup or peak-memory reduction is asserted from source alone.
