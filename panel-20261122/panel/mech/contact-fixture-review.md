# Contact fixture and final runtime reconciliation

**Accepted for actual pressure path coverage and bounded protocol/latency diagnostics.** This review does not certify a feasible engine history or every synthetic timer/zone state. The exact production bundles remain unchanged and accepted by the earlier source review.

## Exact artifacts

- Fixture SHA-256: `409fa491361d4c2defcb0e155ffe30d3a0bc1b1f839c5d585ea26b9189a091c5`.
- Push bundle: `609dad433c99b3ff1c086daedb014cbc524c1ffc51b7927eceb1b98ed9d95797`.
- Burst bundle: `deb215812f7a8ef0786c1a98ab41a9b10d2d853f167aeb42d838a76c14e6ba1d`.
- Source and artifact hashes are recorded individually in `contact-fixture-review.json`.

## Source findings

| Component | Finding and scope | Status |
|---|---|---|
| Layout search / point / clear | Searches the real arena Nav grid. The self position is passable with at least 10 m wall distance. All targets are passable, in the same component, inside arena margin, at nav ground level, with a walk line and clear shot/sight rays. Nav defaults radius 2.5 m and height 9 m match the unchanged hello mech config. | source accepted; helper-level geometry, not server engine proof |
| actor / weapon / scenes | Actor IDs exclude self ID 3. Dense opponents use >=6 m center separation for radius 2.5 m. All 15 dense opponents are within 44 m (inside 45 m near vision); other contacts are within the 200 m vision range and in front. Weapon and mech stats clone the hello config; upgrades and cubes remain empty/zero. | source accepted for schema/map counterfactual coverage; timer caveat below |
| Observation construction | 300 observations in nine scenes, tick 2000+2*i and t=100+0.1*i for the actual 20 Hz / decide-every-2 config. Safe current/next zone centers are at self, deliberately preventing zone-urgent bypass. Empty upgrade arrays do not invent unavailable stat bonuses. The armed deadline activates pressure after 90 s. | source accepted for branch coverage; synthetic zone is not hello schedule |
| Geometry assertions | Checks passability and nav-level feet for every observed target plus pairwise opponent separation. Search construction already checks self-target separation for dense actors and minimum 25 m nominal range for singleton actors. The source does not run a full physics step or prove sequential reachability. | accepted within stated scope |
| Pressure wrapper | Wraps the actual B.pressure.legs closure on each created brain, increments entry before calling it exactly once, and increments returns only for a truthy result. The original function is not replaced with a fabricated return; no source/bundle is edited. Normal bundled runtime timing is collected separately. | accepted |
| Coverage assertions | Both candidates require active=300, zoneUrgent=0, pressureLegsReturns=300 and nonzero close/fire/seek branches; burst additionally requires cycle. Per-scene phases and final legKind are retained. Counters require zero internal errors/fuse events. | accepted; author-run result reviewed |
| Strict paired diagnostic | Two predetermined orders, three candidates, official and contact streams give 12 planned processes. Official acceptance parses timely/missed/late counts and rejects internal retries. Contact receipts have exactly 300 answered and zero late/schema/wrong-tick/bad-line/no-answer errors. All 12 raw results are retained. | 12/12 accepted; existing evidence read, no rerun by this reviewer |

## Actual policy coverage

Existing source instrumentation records the following actual calls and final movement branches. It wraps the original closure once; it does not replace policy behavior. Timing uses the unmodified bundled programs separately.

| Candidate | Actual legs entries / true returns | Close | Fire | Cycle | Seek | Capture finish | Zone urgent |
|---|---:|---:|---:|---:|---:|---:|---:|
| mech-pressure-cycle | 300 / 300 | 120 | 147 | 0 | 30 | 3 | 0 |
| mech-burst-cycle | 300 / 300 | 45 | 147 | 75 | 30 | 3 | 0 |

Both candidates changed movement and aim in 297 of 300 frames against capture. Push changed boost on 150 frames, burst on 75; both changed fire on 45. These are action differences, not measured match utility. The bundled diagnostic records independently agree with these differences.

## Runtime reconciliation

The earlier burst official checker reported **298/300 timely answers, two late answers, and 243.3 ms maximum**, while still printing PASS under its tolerance. Those raw records remain unchanged. The cause is unestablished.

The subsequent predetermined two-round, 12-process diagnostic completed every planned run. Every official and contact run answered exactly 300 observations on time with no internal retry, late answer, schema error, wrong tick, or bad line. This result supports the publication decision in `final-validation/release-validation-status.json`; it does not erase the original outliers.

| Candidate | Official maxima, rounds 1 / 2 | Contact maxima, rounds 1 / 2 | Contact p99, rounds 1 / 2 |
|---|---:|---:|---:|
| capture | 13.5 ms / 6.7 ms | 20.62 ms / 10.04 ms | 4.61 ms / 4.63 ms |
| pressure-cycle | 4.0 ms / 11.9 ms | 8.17 ms / 5.23 ms | 7.12 ms / 3.63 ms |
| burst-cycle | 7.0 ms / 6.4 ms | 6.12 ms / 7.84 ms | 4.22 ms / 6.35 ms |

## Limits retained

- The fixture is counterfactual protocol input, not a reactive simulation, server engine replay, or a claimed feasible complete match history. Actions do not advance the subsequent supplied observations.
- The synthetic zone center/radius/times differ from the hello zone phase schedule. This is intentional branch isolation, not proof that the exact zone exists at t=100 in the official engine.
- The nearby_pickup scene supplies laser cooldown 3 seconds while the copied base laser stat is 1.65 seconds. This is schema-valid blocked-weapon stress input, not a proved engine-reachable timer state.
- Geometry validity is checked with the repository World/Nav implementation and official arena data. It does not independently prove the authoritative engine collision or movement semantics.
- The borrowed end message place=13, kills=0 is protocol termination only and has no score/evaluation meaning for this fixture.
- Original burst official checker results remain 298/300 in time, 2 late, max 243.3 ms. The later predetermined 12-process diagnostic is clean but does not erase or explain those outliers.
- The warmup source gap remains documented: normal 800-decision rehearsal reaches at most 79.9 s per fresh brain and does not activate pressure. No active-warmup change was promoted.
- No official placement improvement, 7.5 score, hard real-time guarantee, or Docker/cgroup equivalence follows from these checks.

## Verification ownership

This reviewer read the full fixture constructor, the relevant World/Nav geometry contracts, the pressure activation/legs contracts, the strict diagnostic source, the metadata, raw result counts and final release receipt. Existing author-run behavior and algorithm-owned runtime evidence are identified as such. No extra replay, generation or performance run was launched during the quiet window.
