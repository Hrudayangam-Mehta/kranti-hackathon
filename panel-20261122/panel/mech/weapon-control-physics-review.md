# Weapon cycling: independent mechanics and control review

## Scope and evidence

This is an independent source and physics review for the algorithm owner's next Mech candidate. No game-server interaction, match simulation or CPU benchmark was performed here. I read the official current protocol through the public track download, the official kit's recorded `hello.config`, the action/weapon schema, and the existing geometry candidate's firing, aiming and selected target/loadout/movement functions. The candidate source is `experiments/mech-geometry/bot`; its corrected geometry was already reviewed and passed bounded protocol tests.

Primary public sources:

- https://www.joinbuilders.org/buildathon/tracks/builders — current track and runtime contract, retrieved 22 November 2026.
- https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1 — current mechanics and action contract, retrieved through the track's protocol link.
- The same official protocol, schema and recorded check stream are in `handoff/.cache/ws/mechbot/kit/`.

Search-source references available to the parent: `turn109616202view1` (track) and `turn327919904view0` (protocol). The parent must open these before citing them. The public protocol's introductory match count remains stale relative to the track's builders-4 rules; that inconsistency does not alter the action semantics below.

The recorded configuration excerpt is saved as `weapon-config-excerpt.json`. It is evidence of the test recording, not a promise of future balance values. A production policy must read live weapon stats and `hello.config`.

## What “switching” legally means

The action has two independent slot-trigger booleans and one shared torso aim. Both carried weapons can be used when their aim and readiness constraints agree. There is no active-weapon equip toggle and no general heat variable in the current contract. Cooling, ammunition, reload, laser charge and energy are the observable resource states.

Changing the carried pair is a separate action: take a nearby pickup, specifying the replaced slot when full. Pickup range is horizontal plus a separate vertical limit; duplicate kinds are forbidden. New equipment incurs the configured equip/cooldown delay; dropped gun ammunition persists. A charging laser cannot itself be replaced. Replacing the other slot does not violate that laser-specific lock.

A laser trigger falling from held to released fires the beam; it is not a cancellation or a harmless switch. Charge persists only while deliberately held, with minimum-charge and forced-hold behavior governed by the live rules. Any new controller must preserve that state transition explicitly.

## Existing implementation and concrete gaps

| Function(s) inspected | Current contract and behavior | Consequence for the new policy |
|---|---|---|
| `firecontrol.run`, `predYaw`, `predPitch`, `gunLatency` | Calculates aim for a gun, lets a sufficiently charged laser take over, gives mortar lower priority, then allows lightning under the final predicted yaw. | The scarce resource is shared torso direction. A new policy should arbitrate aim, then independently gate compatible triggers. |
| `gunSolve`, `intercept`, `airZ` | Uses muzzle-offset intercept, motion lead, target reversal damping and bounded airborne refinement. | Reuse these solutions and their uncertainty limits. A new aim score must not replace a valid intercept with raw target bearing. |
| `muzzleClear` and corrected laser rung search | Rejects near-barrel obstruction and unreachable laser rungs under a fresh live firewall. | Every newly introduced aim branch needs the same reachability and geometry constraints. |
| `prof.selectTarget`, `fireTarget`, `ownDps`, `prefRange`, `laserVeto` | Selects legal targets, estimates sustained damage/range, and protects against a closing lightning carrier before starting laser charge. | Sustained DPS is useful for range planning but does not express which weapon can deliver the next useful shot. Preserve legal-target and threat vetoes. |
| `economy.wantPickup`, `hands`, `reachable`, `pathEst` | Mostly fixed weapon ordering; P26 rejects mortar; pickup hands run after firing. | Improve carried-weapon aim allocation separately from loadout replacement so equip delays and charge locks remain reviewable. |
| `mover.standoff`, `walkable`, `bulletMiss`, `bulletDodge` | Seeded strafe timing, navigation/zone constraints, and acceleration-aware bullet avoidance already exist. | New variation must not bypass walkability, lethal threat reactions, zone escape or body acceleration. |
| `senses.senseSelf` | Reads upgraded cooldown, damage, range, charge and movement values into normalized weapon objects. | Read these values rather than assigning fictitious heat or assuming default equipment statistics. |
| `brain.act`, `chargeHold` | Legs are selected before firing; exception fallback preserves a partially held laser. | Aim arbitration must preserve charge through normal decisions as well as through the existing exception fallback. Fresh firewall evaluation remains necessary after stance updates. |

One inherited mortar issue deserves separate treatment before promoting mortar acquisition: the clearance test checks only an early arc segment. Its endpoint uses horizontal distance `cos(pitch) * a` but gravity time `a / (speed * cos(pitch))`. If `a` is distance along the launch direction, the consistent time is `a / speed`; if `a` is horizontal distance, the endpoint should instead advance horizontally by `a`. The existing expression overstates gravitational drop at high pitch. This is not a new regression, and current P26 refuses mortar pickups, but a new mortar-seeking loadout policy would activate the unvalidated path. I sent this finding to the algorithm owner before implementation.

## Proposed control equations

These equations are original design recommendations inferred from the mechanics and source. They are not an engine specification or evidence of a score improvement.

### 1. Earliest useful shot, including torso motion

Let the live simulation step be `δ = 1 / config.match.tick_hz`. The decision duration is `Δ = decide_every * δ`. Let `Qδ(t)` round an admissible firing delay up to the next possible simulation step, with at least one step after an observation. Exact update ordering should retain the existing tested tick convention.

For a candidate aim `(yaw_w, pitch_w)`, use the actual observed torso angles:

```
T_slew(w) = max(
    abs(wrap(yaw_w - actual_yaw)) / live_yaw_rate,
    abs(pitch_w - actual_pitch) / live_pitch_rate
)
```

Reject an unreachable raw pitch before clamping the outgoing command. If a live laser charge-turn modifier changes the turn rate, apply it to this estimate; the recorded default of one is not a general guarantee.

For a loaded gun:

```
T_gun_fire = Qδ(max(cooldown_remaining, reload_remaining, T_slew(gun)))
T_gun_hit  = T_gun_fire + intercept_flight_time
```

When the magazine is empty and reload has not begun, the refill delay belongs in the estimate; an empty gun does not become ready merely because its cooldown is zero. Time spent reloading and slewing can overlap, so summing both would incorrectly over-penalize the gun.

For a desired laser charge `q*`, with current charge `q`:

```
T_charge = max(0, q* - q)                         if already charging
T_charge = cooldown_remaining + q*               if not charging
T_laser_hit = Qδ(max(T_charge, T_slew(laser)))
```

Charge time and slew can overlap too. Use at least the live minimum charge when starting a release schedule. For an already sufficiently charged beam, the main remaining cost is actual aim settlement. Do not add another full charge or cooldown to an already-held beam.

For lightning, use the next admissible cooldown/slew time with no projectile flight. Its value must refer to the nearest eligible object inside the actual cone with line of sight, not automatically to the chosen tactical target. A closer crate or drone can intercept that selection and alter chain value. If exact nearest-object modeling is unavailable, conservatively omit an assumed target-specific interrupt bonus.

For mortar, add solved shell flight after cooldown/slew. A valid ballistic root is only a reachability condition; it does not certify that the curved path clears intervening terrain or that the eventual splash is safe.

### 2. Compare useful outcomes over the same short horizon

A bounded horizon such as the next one or two seconds permits a few candidate aim schedules without searching the entire game tree. Use the same horizon for every weapon; comparing one laser burst with one gun bullet without accounting for repeat gun shots is biased.

A useful HP-equivalent objective is:

```
U(action) = sum_over_shots(
    P_hit * useful_damage
    + interrupt_value
    + kill_completion_value
)
- expected_incoming_HP_while_exposed
- expected_self_splash_HP
- energy_shadow_price * energy_spent
- mobility_loss_cost
- direction_change_cost
```

`useful_damage` is capped by the remaining target HP estimate so already-secured damage is not rewarded repeatedly. Armor, rear exposure, cube scaling and the mortar-carrier laser multiplier enter damage where supported by live information. The interrupt term can credit lightning against a presently charging enemy only if the actual struck target is justified.

The energy shadow price increases when energy is needed for a known escape, jet route or zone deadline. The laser movement penalty increases when the selected leg plan needs full speed. These are costs of observed resource constraints, not a synthetic heat mechanic. Keep existing `noCharge`, forced escape and low-energy gates as hard constraints before tuning a soft score.

For an initial bounded implementation, compare only already-computed gun and laser aim candidates, and consider a lightning aim candidate only when it can safely reach a useful actual target. Retain baseline mortar acquisition and aiming until its separate ballistic review is complete.

### 3. Uncertainty and map lookahead

A constant-velocity intercept is less reliable as the target's arrival-time uncertainty grows. One conservative planning scale is:

```
predicted_position_error ≈ velocity_error * T_hit
                         + 0.5 * acceleration_uncertainty * T_hit²
```

Combine that with spread and the target's horizontal/vertical angular silhouette when estimating a hit probability. The existing learned hit curve and reversal/steadiness signals are safer starting estimates than an uncalibrated assertion of exact probability.

Use the already selected movement vector and acceleration to predict the near-future firing origin. Check raw pitch, range and solid clearance from that origin. Visibility through trees and collision with buildings are different tests; the existing shot map properly excludes tree trunks/canopy. Keep the ray budget bounded rather than launching a fresh navigation search for every weapon.

For a later mortar experiment, sample the solved arc in a bounded sequence of segments. Under constant gravity, the maximum vertical deviation between a parabolic arc and a chord over interval `h` is `g*h²/8`; this gives an explicit resolution budget. It still does not prove server collision identity without the engine's finite projectile/contact model. Check the near muzzle segment and predicted blast distance to our moving body separately.

### 4. Switching hysteresis and bounded variation

Select a different aim owner only when its advantage exceeds an absolute plus relative margin:

```
U_new > U_current + epsilon_abs + epsilon_rel * max(abs(U_current), 1)
```

Retain a short commitment interval while both actions remain admissible. An invalid current target, lethal shot opportunity, imminent incoming projectile or forced escape may override it immediately. The commitment must never force a cooling or blocked weapon to retain aim when a safe ready shot exists.

For behavioral variation, randomize only among near-equal admissible movement or aim schedules. Use a separately seeded local stream so adding a choice does not consume `B.rng` and perturb all existing strafe/salt decisions. Hold the sampled choice over a meaningful episode; drawing every 0.1 seconds can cause torso thrashing and repeated acceleration reversals.

The RNG is reproducible and its public slot seed is not a secret. The supported claim is bounded behavioral variation, not cryptographic unpredictability. Do not randomize missed deadlines, unsafe triggers, pickup legality, target legality or imminent dodge reactions.

## Loadout utility, kept separate from trigger arbitration

For a pickup `p` replacing slot `j`, a concrete comparison is:

```
Delta_loadout = integrated_expected_pair_value(new_pair, planning_horizon)
              - integrated_expected_pair_value(current_pair, planning_horizon)
              - approach_exposure_cost
              - equip_delay_opportunity_cost
              - energy_or_zone_route_cost
              - lost_upgrade_or_current_charge_value
              - carry_specific_vulnerability
```

The new weapon is unavailable for its configured equip/cooldown delay. Its stats should reflect our persistent weapon upgrades when known; they belong to the mech. A mortar's cook-off vulnerability is a carrying cost even when its trigger is idle. The gun's reload/ammunition persists through a drop, so a swap cannot be valued as an ammunition reset.

Require a positive improvement margin and a pickup dwell/cooldown policy to avoid swapping back and forth over the same two items. Record failed pickups to avoid retry loops, preserving the existing bad-pickup handling. Do not drop a useful current weapon without a validated replacement operation.

## Required edge cases for the new candidate

| Case | Required result |
|---|---|
| Both slots ready and both aligned | Compatible triggers may both fire; do not impose an invented single-active-weapon rule. |
| Gun ready while laser charging below release threshold | Gun can retain useful aim without releasing the laser accidentally. |
| Fully charged laser versus ready gun | Compare actual slew/clearance and useful damage; preserve deliberate release semantics. |
| Gun cooldown zero, empty magazine, reload not begun | Treat refill delay as unavailable firing time. |
| Reload and torso slew overlap | Use their maximum readiness cost rather than double-counting elapsed time. |
| Huge yaw wrap across −π/π | Use the shortest angular difference; no near-full-circle slew penalty. |
| Raw laser pitch outside the live bounds | Reject the shot despite a valid clamped output command; test both upper and lower bounds. |
| Target behind near-barrel wall, behind solid terrain, or screened only by trees | Solid geometry blocks; trees do not become artificial shot blockers. |
| Lightning candidate obscured by a nearer crate/drone | No unsupported target-specific short/kill credit. |
| Lightning energy just below/at cost plus escape reserve | Preserve energy and route safety constraints exactly at the boundary. |
| Charging laser receives an observed short effect | Reconcile the next observed charge/cooldown state; do not assume a cached hold still exists. |
| New charge during forced zone escape or shell dodge | Hard mobility veto wins over nominal damage utility. |
| Pickup at horizontal/vertical boundary, full slots, same-kind item, active charge | Match legal take/drop constraints; the charging-slot lock is specific to that slot. |
| Newly equipped weapon and dropped/reacquired gun | No firing before equip/cooldown; no invented ammunition reset. |
| Tied utilities across successive decisions | Hysteresis limits oscillation; local RNG does not alter unrelated movement stream. |
| Fresh FFA latch with cached P26 flag still true | Practice-only additions use the live firewall on this decision. |
| Upgrade changes cooldown, charge, range, speed or turn rate | Use live stats and recompute; no stale default-based threshold. |
| Candidate disabled | Action identity with its documented base where the feature is inactive. |

These are behavioral properties to test once the algorithm owner supplies the implementation. No simulation ranking or official score prediction follows from this design review.
