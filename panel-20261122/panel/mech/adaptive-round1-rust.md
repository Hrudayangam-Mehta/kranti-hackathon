# Adaptive placement policy: round 1 source forensics

## Scope and evidence

Owner-reported results are capture `099e7e392a863346575d7ef45bb9af3432544329` at **5.47**, pressure `69ed1814707634fb4b5e5953082f3d67ac9e52f8` at **4.74**, and burst `26f382eab378e1193ab9203bb4ec7e706c6780bf` at **4.67**. These scores establish that the submitted aggressive variants scored worse in those evaluations. They do not identify which changed subsystem caused the loss, or establish paired-seed statistical significance.

This review reads our capture, pressure and burst source. The eleven checks in `adaptive_round1_cases.mjs` passed using those unmodified trees; results are in `adaptive-round1-cases.json`. These are decision-unit counterfactual states, without a simulated map/history or a placement outcome. They demonstrate branch behavior and numerical contradictions. Existing conformance and latency receipts remain intact and do not become evidence of gameplay quality.

The supplied local official protocol §4 gives **16 − placement** points and says kills give cubes. A kill has no separate direct score award. Each additional surviving opponent that dies before us earns one further placement point, subject to the stated simultaneous-death/time-limit rules. The current official evaluation-version and match-count verification belongs to the root's live-source audit; this report does not reuse the older kit's match-count assumption.

## Function-level decision ownership

| Function/stage | Capture behavior actually read | Failed pressure/burst behavior | Consequence under the revised placement objective |
|---|---|---|---|
| `brain.act` / sense | Refreshes authoritative resources, weapon timers, tracks and events | Same input stage | Preserve; internal reward predictions must never mutate resources. |
| `prof.update` | Hostility and hit-rate history | Still runs after pressure becomes active | Useful data is maintained even while the later policy ignores its risk output. |
| `hunt.pre/post` and `finUpdate` | Run before mode selection; most hunt behavior is disabled by default parameters | Skipped once pressure is active | Do not claim every legacy hunt branch was active. Reusing its unchecked TTK helper blindly would introduce another model. |
| `prof.selectTarget` | Chooses legal target/shot, preferred range, incoming DPS, TTK/TTD and finish flag | Entire selection is skipped after latch | Capture already has a reversible tactical owner; start there. |
| `pressure.update` | Absent | Eligibility at secondary+upgrade, upgraded gun at 60 s, or any weapon at 90 s permanently sets `S.on` | Equipment/time is treated as permanent risk permission, even after HP, energy and weapon changes. |
| `pressure.rangeFor`, `damageRate`, `burstDamage` | Absent | Fixed close bands and own-output estimates | Range choice and actual resource gates can disagree. |
| `pressure.support`, `select` | Absent | Neighbor count is a small ranking penalty; target score omits own HP, alive count, TTD, and exit time | Supported targets remain mandatory fights when every available choice is bad. |
| `prof.econ` / `chooseDrop`, `chooseGrab`, `chooseLoot` | Recomputes drops every decision; caches grabs 0.25 s and loot 0.5 s | `econ.update` skipped; all economic goals cleared except the final 0.6 s of an owned uncontested capture | Safe progress toward weapons, cubes, upgrades and resource restoration is lost after eligibility. |
| `prof.decideMode` | Zone, finish, drop/grab, retreat latch, avoidance/fight, heal/loot | Replaced by `pressure.mode` | Existing capture priority exceptions also need correction: a distant drop or cached grab can precede a lethal retreat latch. |
| `stance.update`, `applyVetoes` | Estimates posture and may set hold-fire/defensive intent | Still runs, followed by a second `pressure.mode` that clears those outputs | Redundant policy writers; adding another wrapper would worsen ownership. |
| `pressure.legs` | Absent | Bypasses normal retreat/profile/FFA legs; closes, cycles by only a short distance, or searches | A nominal cooldown cycle is not an escape/recovery policy. Geometry/zone/dodge still operate. |
| `firecontrol` | Physical/accuracy/readiness gates | New controller and pressure exceptions alter aim, reserve, charge and gun-specialization behavior | This broad independent change prevents attributing the score loss to macro aggression alone. Keep it out of the first macro ablation. |
| `econ.hands`, `econ.pick` | Legal in-range pickup and static upgrade ranking | Still run, then `pressure.hands` overwrites reload and upgrade selection | The final upgrade ranking is fixed by weapon kind, not current HP, time or remaining opponents. |
| `pressure.wrapProfile` | Absent | Replaces fire target/legal/reload/crate/laser-veto hooks | Policy ownership is distributed across wrapper, brain and firecontrol. Remove it by rebasing the next candidate on capture. |

The capture profile itself is active only within the existing `hunt.firewall` practice envelope: SQUAD, no qualifying foreign death, more than three alive and a sufficiently large next zone. A `prof.js`-only improvement preserves the existing FFA and late-game fallback. It must not be described as a new global policy.

## Demonstrated contradictions and narrower limits

1. **Permanent combat permission ignores the current survival state.** Both pressure policies select the same target score at 1 and 1,400 HP and at 2 and 16 alive; all four combinations choose FIGHT. With twelve nearby opponents and 100 HP, pressure still fights. Capture's corresponding incoming estimate gives about 0.043 s TTD and chooses DISENGAGE. These are differences in policy, not a forecast that the modeled TTD is accurate.

2. **The movement/output model promises unavailable lightning.** At 6 energy, shot cost 3 and retained reserve 6, pressure chooses 30.6 m and adds 240 DPS from lightning. `weaponPolicy.energyOk()` rejects firing. The next macro policy must use the same reserve/resource boundary as the downstream action policy, or explicitly omit that weapon's short-horizon contribution.

3. **Setup completion discards valuable safe progress.** A cube 10 m away, enough to cross the first configured upgrade threshold, is selected by capture. Once pressure is latched it clears that goal and searches even without an enemy. Nearby take actions are still possible in pressure; the defect is loss of route value, not prohibition of every pickup.

4. **Capture's sustained-rate finish flag is not a ready finish.** With a 100-HP target, our 100 HP, a 2.4-s gun reload and 1.65-s laser cooldown, capture predicts about 0.48 s to finish and chooses FIGHT. The earliest gun impact is about 2.64 s and earliest full laser release about 2.4 s, both beyond its 1.6-s finish horizon; the modeled TTD is about 0.71 s. `S.finishing` also prevents the retreat latch. This is a concrete readiness defect independent of the failed pressure implementation.

5. **Capture's absolute DPS-difference exception can ignore HP.** `own − incoming > pfAdv` admits `S.fight` even at 1 HP; the separate retreat latch happens to override it in the demonstrated case. A single reversible survival margin should replace that contradiction, rather than relying on another layer to repair it.

6. **Reward priority currently lacks a completion survival budget.** A 100-m supply drop requiring about 12.03 s takes priority while the retreat latch is set and modeled TTD is 0.71 s. A safe-looking cached cube likewise precedes the latch. A cheap current-state admission check must run each decision; existence-only cache validation is insufficient after damage/zone/equipment changes. No repeated route search is necessary for this check.

7. **Full-HP drop handling has a subtler gap.** `chooseDrop` rejects unowned drops at full HP, but `chooseLoot` can still route to them as ordinary drop loot. The demonstrated 1-energy, full-HP state chooses LOOT for that drop. Improve its explicit energy/cube/threshold value and holding/completion priority; do not claim the baseline never collects full-HP drops.

8. **Regeneration can conflict with opportunistic farming.** The profile's `crateShot` hook returns a crate while mode is HEAL and the damage-free timer is 4.9 of 5 s. Final firecontrol can still veto it, so this test proves only the missing guard in the hook. Successful crate or drone damage resets regeneration according to the protocol; recovery policy must use `max(lastHurtT,lastDealtT)` and current in-zone status.

9. **Upgrade ranking is contextual only by weapon presence.** The pressure implementation selects laser damage over armor/nanites at both 1 and 1,400 HP and both 2 and 16 alive. That is an observed static order, not proof that armor is always preferable. Any new ranking must value actual configured effects, expected usable time and existing stats, with a separate ablation from the macro change.

10. **Combat loadout capacity is an isolation candidate, not a free improvement.** The four-second controller accounts for timers/equip cost and anti-thrash, but ranks capacity against one current target. It does not value ranged coverage after that target leaves, unknown future contacts, full route safety or escape energy. Its cone/aim/pickup changes belong in a separate derived variant with the macro model shared, not another independent DPS estimator.

## Placement-aligned model and uncertainty

With N mechs alive, the already-secured placement score is approximately `16 − N`. Ignoring simultaneous deaths and the terminal HP rule, expected final score can be written as that secured score plus the sum, over the other surviving mechs, of the probability that we outlive each one. This identity explains the objective; it is **not** a calibrated probability model available to this bot.

The implementable local proxy should use explicit physical/time budgets instead of invented win probabilities:

- `D(r,H)`: modeled damage that observed ammunition, reload, cooldown, charge and energy permit within horizon H at the evaluated range r, after an aim/travel allowance. Record unsupported weapon geometry rather than inventing positive damage.
- `T_finish`: earliest modeled horizon at which usable output reaches target HP, with hidden enemy armor/hit uncertainty retained as a qualification. A finish privilege also needs time to act and survive the exchange.
- `I`: current exposure estimate from tracked weapon/config/cube priors and observed recent incoming damage. Enemy cooldowns, upgrades and armor are hidden; this is an estimate, not knowledge of their current burst.
- `T_exit`: reachable known cover travel, or a bounded explicit unknown-cover allowance. Energy and actual walk/boost speed constrain escape. Do not assume a cover route exists.
- `M = HP − I × (T_finish + T_exit + decision allowance) − zone loss − retained reserve`: a reversible engagement margin. Favorable fights remain available; low HP alone does not prohibit a genuinely ready safe finish. A positive sustained DPS difference cannot bypass a negative survival budget.
- For a reward, compare its current route/capture time and exposure with restoration of missing HP/energy, the value of a cube before the stat cap, and crossings of configured cumulative upgrade thresholds. Contested capture has no finite guaranteed completion. Rewards are predictions only; `senseSelf` remains resource authority.
- Regeneration value is conditional on being in-zone and not dealing or receiving damage for the live delay. The usable horizon ends at the next zone/escape deadline. A long quiet farming detour can be worse than finishing recovery.

The next candidate will not implement this as a broad probabilistic planner. It will correct the existing profile's estimates and priority exceptions, keep a single mode owner, and expose bounded numerical evidence and reason codes for review. Short hysteresis may stabilize target/action selection; acute safety violations override it immediately. There is no permanent setup-to-combat permission latch.

## Round 2 moderated edit boundary

Authorized source: `experiments/mech-adaptive/bot/lib/prof.js` and `params.js`, derived from capture. A shared readiness helper is additionally authorized if useful to avoid duplicate math in later equipment work. Root owns equipment/firecontrol changes in a separate variant. No changes to brain dispatch, pressure wrappers, FFA controller, README, remote branches or published controls are made here.

Implement in order: finite-horizon weapon readiness and finish; current incoming/escape margin; per-decision cached-goal admission; reward-aware drops/cubes; recovery-compatible farming. Provide one baseline-off option, not a large parameter matrix. Keep expensive route scans at their current bounded rates. Unit and integration cases must include favorable fights as well as refusals, live stat changes, fractional timer boundaries, insufficient lightning reserve, contested capture, owned progress, imminent zone transitions and damage that invalidates a cached objective.

The relevant conceptual resources are LaValle's *Planning Algorithms* chapters on feedback, sequential decisions and information, and Millington's *AI for Games* chapters on decisions, tactics and execution. They motivate repeated current-state evaluation and clear control ownership. TD-MPC2 and world-model papers are research context only: this code does not contain a learned model, calibrated expected-placement estimator, or reproduced paper performance. Primary links and chapter mappings are retained in `panel/RESEARCH_NOTES.md`.
