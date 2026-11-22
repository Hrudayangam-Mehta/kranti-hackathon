# Database/backend review — round 3

## Result

The `bins-purchases` candidate passed **270 of 270** behavioral executions. This is 27 case families, each run with fast NCPU 1/4/8, forced scalar, and the general path, and each run twice into the same output directory. Every process exited successfully and wrote zero bytes to stdout. Every output matched the reference row multiset through **both PyArrow and DuckDB**, with exact column sets, a Parquet DATE day column, and correct null categories.

Evidence: `round3-adversarial.json`, `round3-adversarial.meta.json`, and `round3-adversarial.log`. The metadata sidecar records the executed binary SHA-256, the independent reference's SHA-256, the harness SHA-256, and the arguments used.

## Three-round database review record

| Stage | Binary / source | Execution result | Decision |
|---|---|---|---|
| Initial baseline | Live `exp` head `ad8526b3410bfb6b8b8febff35affe6bd5b42499` | 95/100 behavioral executions passed; five modes all failed the same hidden-input case | Confirmed a shared input-discovery defect. |
| Round 1 | `round1` | 200/200 passed, including repeated output writes | Accept the `.csv` input inclusion fix; other reviewed semantics remain correct. |
| Round 2 | `bins` | 240/240 passed with two Parquet readers; another 6/6 forced-bin and 6/6 forced-sort executions passed | Accept the session-bin implementation's tested correctness. |
| Round 3 | `bins-purchases` | 270/270 passed with both readers | Accept the purchase-only bin payload optimization's tested correctness. Performance promotion remains the coordinator's measured decision. |

The earlier two-run focused reproduction is deliberately not added to the baseline count above. Counts describe real subprocess executions, not the number of individual row assertions or a simulated panel vote.

## Final algorithm check

Round 2 established exact session connectivity from occupied time bins: each bin is internally connected, and consecutive occupied bins join if and only if the next minimum minus the previous maximum is at most the session gap. The corresponding category and day accounting was reviewed independently of the implementation author.

Round 3 separates event counting from purchase payload traversal. `SessionBin::count` records **every** valid surviving event, while `PurchaseLink` stores only positive-price purchase payloads. A no-purchase bin must still be occupied and must still connect sessions; the implementation therefore tests `count == 0`, not an empty purchase head, to identify unused bins. Every consumed bin resets its count and purchase head. Its minimum/maximum values are overwritten when reused.

The second traversal follows each purchase link exactly once, adding its original price and category. Event totals come from the bin count. Session starts, click windows, attribution, assist membership, and day finalization are unchanged by removing nonpurchase payload traversal. This is a reduction in work performed on the common view/cart rows; a speedup is not inferred until measured on frozen binaries.

The additional round 3 cases specifically test:

- A 20,000-event, four-ID linked whale with only views/carts. Invalid-looking price text is correctly ignored; the complete event count remains and category is null.
- A 12,000-purchase case at the maximum accepted 10,000,000 cents. Total revenue is 120,000,000,000 cents, ensuring the revenue path is not accidentally narrowed to 32 bits.
- Repeatedly reused bins alternating between purchase and no-purchase content across eight people, alongside rejected zero/negative-price purchases and category ties.

These are in addition to the round 2 shared-device whale, exact boundary geometries, randomized boundary gaps, and multi-page Parquet interoperability case.

## Function review completeness

`FUNCTION_REVIEW.md` has one row for each of **110 production functions** in the 14 assigned modules. `FUNCTION_REVIEW.sources.json` records their module inventories and SHA-256 values. All 14 reviewed files were verified byte-identical in the round 3 candidate. Existing unit-test bodies are listed separately and are not counted as production functions.

The table explicitly distinguishes source inspection from exercised behavior, and identifies untested exceptional I/O paths. It also records why the general click path may retain identical duplicate clicks without changing attribution or distinct-campaign assistance.

## Reproduce

From the workspace root, with the earlier independent handoff reference present and PyArrow/DuckDB installed:

```bash
python3 panel/database/adversarial.py \
  --binary bench/bin/bins-purchases \
  --bin-cases --large-output --purchase-cases --second-reader \
  --mode 1 --mode 4 --mode 8 --mode 1:slow --mode 1:scalar \
  --repeat --report panel/database/round3-adversarial.json
```

The synthetic data is generated locally by the harness. It is not needed in the shipped submission tree. All QA scripts, data, and reports remain outside that tree; no README was changed by this reviewer.

## Scope of acceptance

This is a correctness recommendation for the exact tested candidate and specified workload. It does not establish an official leaderboard score, a statistical performance advantage, or an all-input formal proof. Organizer fixture/dev verification, large-scale 20M/60M execution, controlled interleaved timing, final container restrictions, and pushed commit identity are separate coordinator-owned release checks. A report should claim those only when their corresponding logs exist.
