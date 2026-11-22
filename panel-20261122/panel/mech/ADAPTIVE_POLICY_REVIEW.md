# Capture-based adaptive policy: implementation and review

## Decision and scope

This candidate starts from the owner-selected capture submission `099e7e392a863346575d7ef45bb9af3432544329` (owner-reported 5.47). It does not include the failed pressure/burst wrappers or the full weapon-cycle controller. Only `bot/lib/prof.js` and `bot/lib/params.js` differ from the capture source. The switch is `pfAdaptive`; false retains the baseline behavior for comparison.

The existing profile dispatch remains intact. The new policy applies within the same practice envelope; forced FFA, late-zone and low-alive fallbacks continue through the existing controllers. There is an inherited one-decision lag when stance discovers the first foreign death/FFA transition after target/mode assessment. This candidate does not silently change that classifier or dispatch order.

The hypothesis is that readiness-aware exchange decisions and survivable resource goals are better aligned with placement than permanent aggression. Local tests establish branch behavior, action conformance and runtime only. They cannot establish an improved official score or a 7.5 result. The older scored capture entry should remain the reference until the owner has a scored comparison.

## Three review rounds

### Round 1: source forensics and counterexamples

`adaptive-round1-rust.md` documents the full decision chain and the source differences behind the failed pressure policies. Eleven checks on the unmodified source demonstrated HP/alive-invariant attack ranking, a lightning range/energy contradiction, discarded safe cube progress, a cooling-weapon false finish, and drop/grab exceptions ahead of a lethal retreat latch. They also preserve the nuance that full-HP capture can already pursue drops through the lower-priority loot path.

These findings justify narrow edits. They do not prove which subsystem caused the owner-reported 4.74/4.67 results, since the variants combined macro aggression and weapon-control changes and no paired match-level outcome set is available.

### Round 2: one policy owner, three coherent corrections

**Readiness and reversible engagement.** `readyDamage` accounts for current gun ammunition, remaining reload/cooldown, magazine cycles, gun intercept/travel, raw pitch/range, torso settlement, laser charge and lightning energy above the existing ordinary reserve. It uses the live weapon fields and cube multiplier once. An observed upgrade plus a usable secondary can temporarily open the profile after its original 20-second uncertainty period; this does not write `gateEndT`. Depletion can return it to the original gate. The ordinary 75-second/10-cube qualification remains the baseline path.

`killTime` searches the same finite-horizon capacity envelope, rather than dividing target HP by an average DPS that might imply a kill before the first ready shot. A finish exception requires a fresh center-ray, the selected fire target to equal the movement target, a feasible single weapon's output, and a short survival/zone margin. It does not sum mutually incompatible gun/laser aim bursts to award finish status.

Ordinary exchange evaluation uses the predicted completion time, approach time, current and prospective incoming pressure, observed incoming damage, an escape allowance for other opponents, and a retained HP margin. It re-evaluates each decision. Short hysteresis admits a small near-boundary margin while already fighting; acute resource/zone failure still fails admission. The prior `own DPS − incoming DPS` bypass cannot independently authorize combat at arbitrarily low HP.

**Reward admission and current-state revalidation.** Drop value includes missing HP, missing energy, uncapped stat gains, configured upgrade-threshold crossings and a penalty for extra body growth beyond the stat cap. Value coefficients are explicit heuristics, not calibrated placement probabilities. Route, wait and capture completion must fit the current exposure and zone budget. Contested capture has no invented finite completion; usable owned progress remains valuable. A full-HP, depleted-energy mech may now receive an explicit high-priority drop task, while an unnecessary beyond-cap drop can be declined.

Drop selection remains per decision. Existing bounded grab/loot selection intervals stay intact, but `decideMode` cheaply revalidates cached objectives after resource, enemy or zone changes. This includes the separate calm-retreat `B.grab` path as well as `S.grab`, ordinary loot and drops. The check does not rerun A* for every object.

**Recovery-compatible actions.** Recovery uses the live regeneration delay/rate and the maximum of last received/dealt damage. Quiet recovery suppresses crate/NPC farming and opportunistic crate shots; safe resource pickup and a beneficial admitted capture remain available. A positive-ammunition gun shot is not overwritten by a quiet-time manual reload. Empty-gun reload remains supported.

### Round 3: independent challenges and bounded corrections

The algorithm reviewer identified two secondary dispatch contracts: a different `S.shot` must not borrow another target's finish flag, and the calm-retreat cube pointer must not bypass the new admission check. Both are addressed. The obsolete sustained-DPS/finish block is skipped on the adaptive path instead of computing a second model and then overwriting it.

The root requested the reversible early-open qualification after observing that an otherwise prepared healthy bot would still wait for the inherited 75-second gate. Four focused tests cover a favorable 30-second engagement, depletion back to the gate, rejection of a losing exchange despite eligibility, and unchanged behavior with the adaptive switch off.

The independent review also found a concrete greedy-range refusal: a full-HP gun/lightning bot rejected a distant 500-HP gun opponent because the highest-output 28-m band required too much exposed approach, although an existing farther band passed the same risk calculation. The final source factors that calculation into `exchangeAt`. Only when the nominal band fails, it checks the existing eight bands once for the selected target and retains an admitted band with the shortest modeled approach-plus-completion time. The selected band is the same `S.hold` consumed by movement. Tests retain a favorable close band, admit the demonstrated farther alternative, decline all-unsafe bands and preserve the zone veto. A separate dimensional correction applies the charge movement multiplier before testing boost-travel energy affordability.

The database reviewer owns independent real-map/config/zone-constrained state and reward fixtures. The algorithm reviewer owns source dispatch, fallback identity and no-fight equilibrium review. Root owns final bundling, runtime tests, any separate equipment ablation and publication. This report does not turn another reviewer's preliminary receipt into a later source-freeze claim.

## Shared helper contract

`B.prof.readyDamage(weapon, horizontalRange, target, horizonSeconds)` returns a finite nonnegative modeled damage amount. The horizon is capped at 12 seconds. `weapon` is a normalized live slot object with the same fields as `B.me.weapons`: common `kind`, `st`, `damage`, `range`, `cd`, `cooldown`; gun `ammo`, `mag`, `reload`, `reloadS`, `speed`; laser `charge`, `full`, `cookoff`; lightning `energy`. The function does not mutate resources or emit actions.

The range argument is **horizontal feet-to-feet distance**. The helper adds the target-center elevation and evaluates three-dimensional range/pitch internally. A future-range utility can evaluate a virtual point on the current target bearing; a current-position call must use the actual horizontal distance. Gun lead assumes constant observed velocity; the public intercept helper supplies the trajectory. Mortar returns zero explicitly because this readiness model does not solve a terrain-safe mortar arc. That zero is not replaced by a fake 1-DPS finisher. The unchanged fire controller can still operate its existing mortar channel.

The helper is shared with the root's separate equipment experiment to avoid another incompatible DPS model. A prospective pickup must be normalized with actual equip/cooldown and conservative ammunition assumptions before calling it. Primary capture macro behavior does not include those equipment changes. FFA-specific gun-specialization caps and future movement `noCharge` decisions remain downstream constraints; this helper is not an engine-equivalent action simulator.

## Function-by-function changes

| Symbol | Contract and review check |
|---|---|
| `update` | Cache finite authoritative live armor, boost drain and energy-regeneration facts; refresh the recovery clock. Preserve observed self-state authority. |
| `readyDamage` | Bound the horizon, support exact current timer/ammo fields, check trajectory/aim/resource eligibility, return finite damage; unsupported mortar is explicit zero. |
| `readyTotal` | Sum capacities for an exchange estimate; use maximum single capacity for a finish privilege. |
| `killTime` | Eight bounded bisections over the same envelope; returns an upper modeled threshold or infinity when not reached. |
| `freshShot` | Current listed target, observation age, outgoing line and fresh center-ray; no swept-volume or engine-identity claim. |
| `escapeTime` | Known cover distance and available boost-energy budget, otherwise an explicit unknown-cover allowance. Charging movement multiplier retained. |
| `incomingAt` | Current/prospective target range, relevant other opponents, live own armor on weapon priors and observed damage without reapplying armor. |
| `exchangeAt` | One shared admission predicate for nominal and existing fallback bands; no separate planner or differently defined safety test. |
| `ownDps`, `prefRange` | Use the same window capacity; avoid selecting an unmodeled lightning band; account for the existing enemy-lightning keep distance. |
| `selectTarget` | Preserve target/shot ranking, add temporary setup eligibility, completion/exposure/zone budget and compatible-shot finish privilege. |
| `cubeValue`, `dropValue` | Configured threshold crossings and resource benefits; separate capped stats from uncapped size; no simulated inventory increments. |
| `goalBudget` | Finite completion horizon, current/route exposure, retained HP and exit/zone margin; restoration occurs after surviving capture. |
| `cubesWanted`, `chooseDrop` | Admit useful resource goals and use real capture ownership/progress/contest semantics. |
| `chooseGrab`, `chooseLoot`, `econUpdate` | Filter goal admission while preserving existing bounded route-search/cache schedule; avoid farming during valuable recovery. |
| `decideMode` | Single tactical owner; revalidate all goal pointers each decision, including calm retreat grabs. Preserve zone priority and reversible recovery. |
| `recoveryWanted`, `crateShot` | Stop optional damage that would reset a valuable quiet recovery interval. |
| `wantReload` | Preserve an already asserted positive-ammo gun shot; retain empty-gun reload. |

## Evidence and limitations

`adaptive-round2-unit.json` contains **28 passing own-source decision cases**, including an actual firecontrol execution producing `fire=true` and `reload=false`, not merely a mocked flag check. The final independent state suite passed **33/33**, the goal/readiness suite **32/32**, and the cross-mode/early-dispatch suite **16/16** on the frozen source. The state/goal suites together checked 375 observations, with the official schema check recorded separately. Cross-mode checks include 900 recorded action comparisons and document the inherited dispatch-transition lag. These counts cover different test families and are not matches or independent score samples.

Final macro source pins are `prof.js` **e85059ee5c3772d241ffac407b45c763c8f14f8e46c32cbbc759c79eb646ad06** and `params.js` **ff597ff51e9f059a1ebe197c424e6969f145bb03b019e30d8e88ac3498c898d9**. They were independently rehashed after the runtime batch.

The runtime batch retained **20 process attempts**, not 20 passes. Two organizer checks and six strict official-stream checks passed. The original six active-stream attempts produced all 300 answers on time but failed the terminal-message contract: the fixture omitted its `end` record, and the driver recorded an extra terminal output. A bounded correction appended only that terminal record, kept the same 300 observations and unchanged source/bundles, and reran exactly those six predetermined active cases; all six passed. The original failures remain in `adaptive-final-validation/results.json`; the corrected results are in `adaptive-final-validation/corrected-active/results.json`.

For the macro candidate, the two strict official-stream maxima were **5.21 and 29.44 ms**; corrected active-stream maxima were **7.04 and 6.47 ms**. Each accepted strict run answered 300/300 with no late, wrong-tick or schema errors. These are one-host, one-CPU-affinity measurements under Bun 1.4.4, not Docker/cgroup testing or a guarantee over every possible observation. Runtime source/bundle hashes stayed unchanged throughout both batches.

The finite-horizon model is a planning approximation. Enemy upgrades/armor and future aim are unknown. Gun hit probability is a bounded prior with limited observed feedback. The ordinary exchange estimate can sum channels whose shared aim later competes; the short finisher uses a single channel, but even that is not a guaranteed hit. Future movement, shell dodging, cover, charge vetoes and final trigger gates can invalidate a modeled opportunity. The known ray is a center-line test, not a swept-body clearance proof. The unknown-cover allowance can underestimate an open-map escape.

Incoming pressure is estimated from current tracks and recent observations; it is not an omniscient house-team schedule. Route endpoint/midpoint weapon-range estimates do not reconstruct all future LOS along a complex navigation path. Hidden opponents and changing geometry remain risks. Resource utility weights, the 12% retained HP margin, 4-second capacity window and 18-second goal horizon are transparent uncalibrated policy choices. They are candidates for official evaluation, not demonstrated global optima.

The conceptual references are the feedback/sequential-decision/information chapters of LaValle's *Planning Algorithms*, decision/tactics/execution chapters of Millington's *AI for Games*, and collision-query qualifications from Ericson. The exact primary links remain in `panel/RESEARCH_NOTES.md`. No learned world model or reproduced research-paper performance is claimed.
