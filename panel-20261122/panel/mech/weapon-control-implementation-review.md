# Independent review of the integrated weapon controller

## Acceptance and pins

The Rust/physics reviewer read the complete new `weapon_policy.js`, all changed fire-control, economy and mover paths, and the four brain wiring additions. The final paired modules were recopied together and reviewed after the pickup corrections. No source blocker remains in the frozen integrated pair.

| Module | SHA-256 |
|---|---|
| `weapon_policy.js` | `84e082f5fccd68e395756191538ac922e289f5e31449bc622415a343136ab8c2` |
| Integrated `firecontrol.js` | `628087cf29166d2412359c7993bc74643250ff9d85aa74024b8395fedbdab6b7` |
| `economy.js` | `db9a988ca1134ba7de3b4be2cc29734b07d56280705bf136625a7b80fe5e18f0` |
| `mover.js` | `3a1ebe1fca55e1c80dfbc858d5e57e3aad5313d281d0ef5a39b0a693ad1da49f` |

The integrated fire controller differs from the standalone ready/varied controller only by the pressure-active bypass of the FFA-specific gun-flight specialization. The macro has its own pressure-only profile hook changes. Every file and final bundle is pinned in `pressure-integration-builds.json`; the independent backend reviewer separately recomputed and accepted those pins in `pressure-source-acceptance.json`.

## Function-by-function review

The table covers every named function and named local function arrow in the new policy module. Anonymous array callbacks are checked with their containing function. This is source review plus specified tests, not a proof that every numerical state is reachable in the game.

| Symbol | Purpose and concrete check | Status / tests |
|---|---|---|
| `value` | Preserves only finite numeric values; substitutes explicit defaults for missing/malformed input. | Reviewed; malformed configuration stress. |
| `makeWeaponPolicy` | Owns independent RNG, bounded dodge choices, pickup dwell/caches and a conservative armor bound derived from live upgrade definitions. Does not alter the baseline movement RNG. | Reviewed; replay identity and independent-variety cases. |
| `on` | Gates all new weapon behavior using a boolean option. | Reviewed; feature-off capture identity. |
| `decisionS` | Converts live decision cadence and physics step to seconds. | Reviewed; observation-dwell and energy-window tests. |
| `turnMult` | Reads the live modifier from `laser.st.charge_turn_mult` only during observed charge, with finite bounds. | Reviewed; charge-turn scheduling tests. |
| `reserve` | Reads the committed macro's finite reserve when present, otherwise preserves the standalone finishing/ordinary reserve. | Reviewed; actual integrated lightning-firing fixture at low energy. |
| `slew` | Uses wrapped yaw distance and pitch distance divided by actual rates; maximum expresses concurrent two-axis movement. | Reviewed; slow-torso and readiness fixtures. |
| `laserAim` | An observed uncharged cooling laser cannot steal aim. Full charge retains aim ownership; otherwise compares slew and remaining charge with a ready aligned gun's conservatively sufficient hit. | Reviewed; zero-charge short, early slew, full-charge and gun-finish cases. |
| `energyOk` | Counts possible held-trigger pulses during a decision and subtracts movement drain plus the required post-action reserve. | Reviewed; low-energy, boost and zone tests. Future regeneration is conservatively not credited. |
| `legal` | Preserves hold-fire; applies NPC conditions; uses fresh profile firewall when relevant; permits living mech candidates through the committed macro policy. | Reviewed; all-mode behavior and hold preservation. Candidate existence/liveness is established by callers. |
| `nearestLightning` | Collects observed living tracks and fresh crates, compares 3D distance, LOS and conservative angular membership, and marks near-equal ties ambiguous. | Reviewed; the first narrow-cone blocker bug was corrected before integration. |
| Local `consider` | Implements nearest-object update without treating the desired aiming inset as physical membership; equal-distance conflicting objects suppress a precise target claim. | Reviewed; nearer neutral/crate at 13 degrees and tied-object fixtures. |
| `lightningAligned` | Applies a separate desired-target inset and range margin after nearest-object collection. | Reviewed; final trigger and interrupt use the same admission rule. |
| `interruptAim` | Considers only a presently charging laser threat, legal target and affordable pulse; protects a committed/full own laser release; predicts reachable next-tick yaw before choosing the nearest threat. | Reviewed; wrong-nearest, full-own-charge, cooldown and energy cases. |
| `refresh` | Invalidates caches on observed weapon change, tick/time, posture, selected target, urgent zone and commitment state. Tracks actual equipment changes for anti-thrash. | Reviewed; same-decision context change and actual swap tests. |
| `capacity` | Scores a common four-second horizon with range, raw pitch, LOS, torso motion, actual cooldown/ammo/charge and equip delay. Unknown pickup-gun ammunition receives a full refill delay. | Reviewed as a tactical estimate; incoming-gun, charge, range and energy cases. |
| Local `read` | Reads finite nonnegative live/base statistics for unheld weapons. | Reviewed; malformed configuration stress. |
| `pickup` | Rejects duplicate kinds and a charged laser slot; enforces actual equipment cooldown before full-slot fallback; requires a persistent capacity margin. Pressure may replace a gun in both postures and uses one observation of dwell without a low-HP veto. | Reviewed; both-mode gun replacement, dwell gap, dropped-gun reacquisition, no-target fallback, charged slot and empty-slot cases. |
| `pickupLimits` | Caps horizontal take distance by live pickup radius and vertical distance by the stated four-metre limit. | Reviewed; reduced live radius and vertical rejection fixtures. |
| `preparePickups` | Pre-evaluates visible nearby pickup kinds inside the existing hands pass, without a movement diversion or new loot goal. | Reviewed; committed full-slot integration swap while loot/grab remain null. |
| `dodgeSides` | In the varied option only, gives a stable private-RNG ordering to two already-checked dodge directions; map is capped at 64 entries. | Reviewed; stable choice and no base-RNG consumption tests. |

## Changed callers

`firecontrol.muzzleClear` rejects unreachable raw pitch and tests both the body-to-muzzle prefix and the remaining ray while cycling is enabled. `predYaw` and `predPitch` account for the observed charge-turn multiplier. In `run`, the gun intercept is still calculated and the final command is rechecked against the actual predicted torso before firing. Laser ownership is scheduled through the new policy, while its held/released trigger semantics remain explicit. Lightning interrupt and final firing both consult the same nearest-object model and energy budget. Compatible gun and laser triggers remain independent; there is no invented active-weapon switch or general heat meter.

The integrated pressure-only FFA flight change keeps the base accuracy rule and the original physical intercept, ammo/reload/cooldown, range, clearance and final aim gates. A crafted 78-metre retreating reverser case now has a viable gun shot in the macro's selected band; a 210-metre non-steady case remains flight-gated. The readiness-aware off-axis policy remains in place.

`economy.wantPickup` computes the existing fallback and passes it to the contextual policy. The renamed `basePickup` retains setup behavior. `economy.hands` previews nearby kinds, then independently scans actual pickup distance/height/freshness and calls the same policy before emitting take/drop. Its operation survives the macro's deliberate skip of `econ.update`. It never needs a remote loot movement goal.

`mover.bulletDodge` still scores both candidate directions through its existing geometric/survival checks; the varied option only changes their visit order. `brain.normalizeConfig` retains live upgrade definitions, and `createBrain` stores the seed and constructs the policy before the mover/fire controller. The macro's subsequent final hands pass cannot override a positive-ammo gun shot with an optional early reload after the regression correction.

## Accepted limits

The protocol's cone wording does not establish an exact implementation-level half-angle convention. The controller deliberately collects blockers using the full configured angular deviation, then requires a narrower target inset. This can reject otherwise valid shots; it does not prove engine-equivalent nearest-target selection. The ray tests also use the existing map representation, not a newly proved collision oracle.

Four-second pickup value and macro damage estimates assume future LOS, range and target motion. The gun finish override uses a configuration-derived armor bound, but macro finish remains an optimistic modeled opportunity because hidden upgrades, actual slew and hit uncertainty are not fully known. No weapon policy guarantees that a full laser will never release unaligned: the inherited force-release and immediate movement-release behavior remain.

The new controller's owner reports 48 final behavior cases. This reviewer independently ran the final macro and integration suites and the source replay/stress suite, followed by the official bundled recording checker. The precise counts and tested hashes are in the combined manifest and receipts. These establish defined action behavior and conformance, not the requested 7.5 score. Quiet runtime results and subsequent official scores must be reported separately.

The isolated mortar-arc correction is not present in these bundles. Its dimensional and bounded-clearance review lives in `mortar-arc-review.md` and the independent backend/algorithm receipts; it must not be attributed to the primary pair.
