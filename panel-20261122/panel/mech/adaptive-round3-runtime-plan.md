# Adaptive Mech — predetermined runtime gate

Status: planning only. No timing results are implied by this file.

The three controls are the published capture baseline at 5.47, the bounded adaptive profile, and the adaptive profile plus separately reviewed equipment/physical gates. Final source and bundle hashes must be fixed before the timed batch. The second fork is not automatically preferable because it changes more code.

## Inputs and required coverage

1. The unchanged official 300-observation stream provides a protocol/regression input. It is early-match input and cannot establish late adaptive decisions by itself.
2. A new 300-observation active stream must use the official initial configuration, actual map geometry and phase-derived nested zones. It must contain admissible fight, rejected fight, ready finish, safe recovery, useful drop, invalidated cached reward, equipment opportunity and late fallback states. The database reviewer owns construction and authoritative state validation.

The active input consists of individually constrained counterfactual observations, not a reactive match history. A test-only source audit must record actual helper/mode counts and reasons, not infer coverage solely from later timestamps. Check at least practice-profile activation, new readiness/margin decisions, recovery, drop admission/rejection, and late or low-alive fallback. Compare whole actions and movement/trigger/equipment channels against capture and explain differences without calling them wins.

## Fixed timing batch

The complete predetermined plan has fourteen processes: the organizer's `check/check.py` once for each new bundle, then two rounds × three frozen bundles × two inputs = twelve independent strict-driver processes. The strict driver imports the kit's exact schema, records every action, and has no internal retry. It is described as official input with kit schema, not as an organizer-checker invocation. Every process uses the same pinned Bun 1.4.4, one CPU affinity, map files and runtime flags. Rotate order in round 2 to avoid giving one variant only the earliest or latest slot. Record UTC start/end, source and bundle SHA256, runtime version, CPU affinity, input hashes, hello/init duration, decision p50/p95/p99/max and the complete raw output/stderr. Parent and peers reserve a CPU-quiet window before the batch.

Release criteria are strict: 300 valid answers and 300 timely answers for each expected 300-observation run; zero late, malformed, missing or extra actions; zero internal stage errors. The official checker's exit status and its `PASS` text alone are insufficient. Parse the exact timely/late counters and retain them alongside our independent decision timings. Confirm that observed source-level activation is represented by the frozen bundle's input/action stream.

Every predetermined attempt stays in the report. The previous burst control had an initial 298/300 timely run with two late answers even though the checker printed PASS; the later clean diagnostic did not erase that outlier. The new batch follows the corrected rule from its first attempt. If a failure occurs, pause publication, investigate one bounded concrete cause, and require a new documented source hash or explicitly justified diagnostic scope before more timing; do not repeat unchanged tests until a favorable sample appears.

## Warmup boundary

Audit the original scratch warmup for execution of new branches. A missing warmup branch is a coverage gap, not proof that it causes a later outlier. Change warmup only if a specific risk and a small reproducible fix justify it. A warmup-only candidate must keep real-observation actions identical and remain inside the hello budget. No unmeasured claim that every code path is JIT-compiled is permitted.

Passing this gate establishes local protocol conformance, bounded replay execution and observed decision differences. It does not predict official placement. Capture remains the selected score reference until a new official result supports replacing it.
