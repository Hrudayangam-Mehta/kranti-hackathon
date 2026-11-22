# Adaptive Mech — independent algorithm and function review

**Final disposition: accepted for the bounded local release gate, with the modeling and scope limits below.** The primary policy keeps one tactical owner in `prof.js`; the equipment fork consumes its readiness estimate and adds independently checked physical gates. Neither candidate has an official score at this review. The 5.47 capture entry remains the score reference.

The primary reviewed `prof.js` SHA256 is `e85059ee5c3772d241ffac407b45c763c8f14f8e46c32cbbc759c79eb646ad06`; primary `params.js` is `ff597ff51e9f059a1ebe197c424e6969f145bb03b019e30d8e88ac3498c898d9`. Complete source and bundle pins are in `adaptive-builds.json` and the runtime release receipt. Review is an audit of the existing implementation and targeted changes, not a claim that every function in the repository was rewritten.

## 1. Findings that changed the candidate

| Finding | Evidence and implication | Final treatment |
|---|---|---|
| Sustained DPS was treated as a ready finish | Capture could mark a foe finishable while the gun was empty/reloading and the laser was cooling. | Finite-horizon readiness uses observed ammo, reload, cooldown, charge, energy, torso delay, flight, pitch and range. A finish uses the maximum feasible single channel rather than summing incompatible shared-torso shots. |
| Tactical target and actual shot could disagree | Different four-second target and three-second shot retaliation windows can select a far low-HP tactical target but a different near shot target. Two remaining bullets may finish only the former. | Finish privilege requires `S.shot === B.target` and a fresh physical line. No extra target owner was added. |
| A positive-ammo shot could also request reload | The inherited six-second quiet reload branch could run after the controller asserted the gun trigger. | Optional early reload is suppressed when a positive-ammo trigger is asserted; empty-gun reload remains available. |
| Cached reward goals could outlive safety | Grab and loot selection run at 0.25/0.5-second intervals. Existence of a resource does not prove its route is still admissible after damage or a zone change. | The chosen drop, `S.grab`, `B.loot`, and separate calm-retreat `B.grab` receive cheap current-budget admission before mode/legs. Expensive route search is not repeated every decision. |
| Nominal best range could cause permanent refusal | With full HP, gun/lightning and a distant 500-HP gun foe, the original draft chose 28 m, then rejected its costly approach. Restricting the same model to an already enumerated 130 m band admitted the exchange. The database reviewer reproduced this on the real map at 198 m. | `exchangeAt` is the single admission predicate. Only after the nominal band fails, existing bands are tested for a feasible alternative. The admitted band is retained in `S.hold` and used by movement. |
| Boost affordability ignored charge slowdown | The draft checked boost energy at full boost speed, then halved movement for a held laser. For a 50 m trip, 19.5 m/s boost and 17 energy/s, a 0.5 movement multiplier changes the cost from about 43.6 to 87.2 energy. | Apply the movement multiplier before both the boost-affordability test and travel-time estimate. |
| Successful setup still waited for 75 seconds | Capture's opening permission ignores a usable early secondary and an observed upgrade until its cube/time threshold. | After the unchanged 20-second uncertainty phase, usable secondary capacity plus an observed upgrade can temporarily open the practice gate. It never writes a permanent early-open timestamp. The same survival and zone tests still decide combat. |

The repaired range regression is preserved separately from the original counterexample. On the final source, the stationary 200 m test chooses an admitted 160 m band with a positive modeled margin; the close 40 m control continues to choose 28 m and produces the same action as the explicit close-band control. The exact chosen far band is not a universal optimum or a gameplay result.

One reviewer objection was **withdrawn**: I initially said `charge_turn_mult` belonged under mech stats. The exact initial configuration places it under `weapons.laser`; `charge_move_mult` is under mech. The existing weapon-stat lookup was correct and was retained. This correction is distinct from the valid charging-movement energy finding.

## 2. Complete `prof.js` function map

The table covers named functions and local callable helpers in this tactical module. The parent inventory covers the remaining repository modules. “Preserved” means inspected in the surrounding control flow and retained, not proven correct for every possible game state.

| Function/helper | Role and audit decision |
|---|---|
| `makeProf` | Creates bounded profile state, memories and hooks. New fields are predictions/reason codes; it does not award resources or create a new top-level controller. |
| `cnt` | Diagnostic counters only. Counts are not score or kill rewards. Preserved. |
| `memOf` | Bounded per-mech hostility/hit memory. Existing 64-entry ceiling retained. |
| `ign` | Checks resource-ignore expiry against observation time. Preserved. |
| `update` / local `live` | Reads current live armor/energy parameters and recovery timing after authoritative self sensing, then maintains hostility and gun observations. Does not increment HP, cubes, energy or upgrades from reward events. |
| `hostile` | Existing recent-damage/aim-memory interpretation. NPCs are not classified as hostile mechs; incoming NPC damage is handled separately. |
| `hitOwnCurve`, `hitFoe` | Existing bounded distance heuristics. They are not calibrated hit probabilities for these candidates. |
| `hitOwn` | Combines existing curve with bounded observed gun hit history. Sampling and attribution limits remain. |
| `ownDps` | In adaptive mode, converts finite-horizon modeled output to a rate for range ranking. The disabled branch preserves capture's original arithmetic. |
| `readyDamage` / local velocity getter | Shared finite-horizon capacity model. Handles current timers, ammo/refill, charge, energy reserve, flight/slew and raw pitch/range. Uses horizontal range as its input; actual callers must not pass the already-3D `tr.dist`. Mortar returns zero as explicitly unsupported. |
| `readyTotal` | Aggregates channel capacities for qualified exchange estimates; maximum single channel for finish estimates. Sum is not a promise that all slots can fire simultaneously. |
| `killTime` | Bounded search over the capacity function. Produces infinity when the allowed horizon cannot remove the modeled HP; avoids treating average rate as immediate burst. |
| `freshShot` | Requires a current listed target and fresh center-line ray for finish privilege. Conservative center-line rejection can miss an exposed upper rung. |
| `escapeTime` | Uses known-cover distance, effective charged walk/boost speed and affordability; otherwise an explicit inherited unknown-cover allowance. The allowance is not proof that cover exists. |
| `incomingAt` | Combines observed incoming damage with current-range and target-band priors at our location. Avoids the old target-neighbor-only support proxy. Hidden enemy cooldown/upgrades/armor remain unknown. |
| `exchangeAt` | One reusable range admission predicate: capacity, completion time, approach, exposure, reserve, escape and zone horizon. Used for nominal and fallback bands. |
| `recoveryWanted` | Selects quiet in-zone recovery below its explicit health threshold, unless finishing or under current modeled fire. It does not assume that farming damage permits regeneration. |
| `cubeValue` | Unitless authored heuristic for pre-cap stat gain, cumulative threshold crossings and post-cap body growth. No claim of learned optimal coefficients. |
| `dropValue` | Separately values missing HP, missing energy and cube/upgrade benefit; full HP alone no longer discards a useful drop. |
| `goalBudget` | Checks finite completion, future zone margin and current/route endpoint/midpoint exposure before and after predicted restoration. Restoration is a forecast, not a local grant. |
| `foeDps` | Retains explicit config/cube priors, including NPC and mortar estimates. Unknown opponent state prevents a guaranteed survival bound. |
| `prefRange` | Ranks existing candidate bands with currently usable loadout output; keeps the lightning separation floor. Failed nominal admission now gets a bounded fallback. |
| `strength` | Opening comparison inherits the new output estimate. It remains a heuristic used only by existing opening avoidance. |
| `legal` | Keeps unsure/gate/open attack rules. Early setup changes the current phase, not this function's authority or FFA ownership. |
| `selectTarget` | Owns phase, legal target, actual shot, consistent chosen band, ready finish and reversible exchange admission. The obsolete capture calculation is skipped on the adaptive path rather than computed and overwritten. |
| `fireTarget` | Existing dispatch returns the shot target before a movement target. Finish calculation now respects this exact dispatch. |
| `cubesWanted` | Uses current authoritative cubes and cumulative thresholds; does not spend cubes or infer a reward from elapsed time. |
| `mechNear` | Existing spatial exclusion helper. Preserved as a resource-screening heuristic. |
| `mechInView` | Existing listed-mech visibility helper; listing is not proof of a clear physical ray. |
| `pathOk` | Retains one bounded A* call per decision and short path-ratio cache. No unbounded new path search. |
| `sameComp` | Existing navigation-component reachability check. Body dimensions remain sourced by sensing. |
| `dropPlan` | Preserves banked ownership versus currently uncontested capture. Known contest makes completion infinite; holder progress and future-zone tests remain authoritative. |
| `chooseDrop` | Ranks only valuable, budget-admissible drop plans. Owned progressing capture remains distinguishable from a contested clock. |
| `chooseGrab` / local `tryOne` | Existing nearby weapon/cube candidates, geometric reachability and ignore rules, plus current goal admission. |
| `chooseLoot` / locals `consider`, `reach` | Existing resource/hunt ranking with current budgets. Drop selection is not duplicated through a weaker fallback; farming is suppressed during chosen recovery. |
| `econUpdate` | Keeps existing bounded selection cadence; calm retreat cubes receive the same new safety contract. |
| `stillThere` | Existence check only. Callers separately validate current risk and timing, so this is no longer mistaken for safety. |
| `decideMode` | The single mode priority owner. It revalidates cached goals, preserves zone urgency, chooses admitted combat/reward/recovery, and allows retreat to end. No permanent aggression wrapper. |
| `boostIf` | Existing instantaneous boost helper. Actual energy still comes from the next observation. |
| `legs` | Dispatches the selected profile mode, then permits the original fallback legs when unhandled. |
| `fightLegs` | Executes the admitted `S.hold` band with existing collision/line/rush logic. It does not overwrite the selected band with a fixed close distance. |
| `lootLegs` | Existing resource-specific movement and timeout/ignore rules, reached after current admission. |
| `afterLegs` | Existing immediate retreat boost behavior. Retained. |
| `crateShot` | Existing opportunistic geometry, now blocked during chosen recovery so dealing crate damage does not restart the healing clock. |
| `wantReload` | Preserves required empty-gun reload and quiet top-ups while avoiding the positive-ammo fire/reload conflict. |
| `laserVeto` | Existing new-charge constraints retained; readiness respects this known veto. Held charge is treated separately. |
| `isLegal` returned closure / rung filter | Uses the current legal set and validated rung fractions. No second legality model or copied competitor constants were introduced. |

## 3. Equipment fork review

This fork is separately testable and has a larger change surface. It consumes `B.prof.readyDamage`; it does not reintroduce `pressure.js` or own movement/target selection.

| Function/module | Review outcome |
|---|---|
| `loadout.active` | Requires both the profile flag and a fresh firewall at use time, preventing stale `p26on` from authorizing a new equipment decision after stance changes. |
| `loadout.target`, `horizon`, `num` | Bounded current listed-target and time/number helpers. Missing context falls back to the established policy. |
| `loadout.normalize` | Builds only a hypothetical capacity input. An incoming unknown-ammo gun includes equip time followed by reload time; it does not assume a free full magazine. |
| `loadout.prospective` | Applies recorded owned upgrades once to the config base of the prospective kind. Current held stats are already upgraded and are not multiplied twice. |
| `loadout.damage` | Uses the shared helper with actual horizontal displacement, avoiding double-counted elevation. |
| `loadout.pickup` | Requires a clear modeled advantage, short observation-time confirmation and four-second post-equipment anti-thrash. Charged-slot protection and empty-slot behavior remain explicit. |
| `loadout.utility` | Applies supported numeric effects to hypothetical live stats. Newly feasible output when the previous capacity was zero now gets a bounded positive value. Unmodeled energy/utility effects use the existing order rather than fabricated payoff. |
| `loadout.pick` | Bounded three-choice selection; unknown effects and ties preserve the baseline preference. |
| Economy hooks | Invoke equipment choice without a second tactical mode owner. Original pickup legality/reachability remains in force. |
| Config and sensing hooks | Preserve bounded upgrade definitions and observed IDs/live stats. Observation state remains authoritative; no duplicate event increments. |
| `lightningRecipient` | Finds the physical nearest object before applying tactical legality; a closer crate/NPC/neutral cannot be hidden by a desired-target aim margin. Boundary ambiguity is treated conservatively. |
| `lightningEnergy` | Budgets pulse and simultaneous movement drain together against reserves. This is a local actuation gate, not a complete future energy planner. |
| `mortarArcClear` | Checks a bounded parametric arc with one consistent time/distance relation, TTL and muzzle prefix. Segment approximation and the available world geometry remain limits. |
| `mortarSelfClear` | Checks current and constant-velocity projected self distance from the modeled blast. Does not claim a full reactive future trajectory. |
| Firecontroller integration | Physical gates are shared by both posture modes; dynamic equipment remains practice-profile gated. Acquisition does not promote unsupported mortar capacity. |

The larger fork's equipment/physical-specific crafted cases were run by the parent: 19 shared-readiness loadout cases, 20 lightning cases and 18 mortar cases. Its actions are identical to the primary on the two final runtime inputs, so those replays do **not** independently establish a swapping/upgrade advantage. Keep it a separate hypothesis.

## 4. Independent checks and remaining boundaries

`adaptive-cross-mode-cases.json` records **16/16** checks on the final primary hash. They include 900 exact recorded-action comparisons with adaptive disabled, profile disabled and forced FFA; active disabled identity; late-zone and low-alive startup fallback; actual own-kill/foreign-death/FFA transitions; and three early-setup cases that inspect actual dispatch. The ready early setup fires, the unusable secondary stays gated, and a losing exchange still disengages.

The inherited classification order remains: profile activation is computed in assess before stance updates foreign deaths/FFA. The first observation that detects a foreign death or FFA therefore has a one-decision lag for existing profile decisions; the following decision is disabled. Startup FFA identity is not described as instantaneous transition isolation. The new equipment hook adds its own fresh firewall because it runs after stance.

The final runtime status is in `adaptive-final-validation/release-validation-status.json`. The original fourteen-process batch remains intact, including six fixture-termination failures caused by an omitted terminal message. Only those six affected runs were repeated with the same observations plus a valid end; they passed. There is no discarded late-answer attempt in this batch, and there is no claim that all twenty attempts passed.

The damage curves, finite prediction horizon, unknown-cover allowance and resource utility weights remain authored heuristics. Aim/cover can change after the observation; enemy upgrades/cooldowns and house hunter escalation are incompletely observed; a predicted finite finish is not a certainty. Future movement and weapon energy are re-evaluated each observation, not jointly solved as an exact long-horizon control problem. There is no current authoritative reactive ranking simulator and no calibrated probability that either candidate reaches 7.5. The next official receipt, rather than replay action differences, should determine selection.
