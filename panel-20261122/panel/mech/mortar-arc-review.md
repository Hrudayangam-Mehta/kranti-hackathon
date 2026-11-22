# Isolated mortar trajectory correction

## Outcome and exact scope

Implemented a separate candidate at `experiments/mech-mortar-arc/bot`, copied from the corrected geometry source. Only `lib/firecontrol.js` and new `lib/mortar.js` differ. Weapon acquisition, target legality, cooldown policy, upgrades and the ballistic solver are unchanged. This is an explicit physical firing-policy change wherever a mortar is already carried; it is not restricted to the practice profile and does not newly seek mortar pickups.

The lightweight deterministic gate passed **18/18 cases**, including paired old/new fire-control behavior. No full protocol checker, map timing, Docker sandbox, local match ranking or game-server operation was run for this candidate by this reviewer. The algorithm owner received the patch for independent review and integration choice.

- `lib/firecontrol.js` SHA-256: `98a300fc9e3d992ebca0f0c2214f4e9ebfa4b3eed4457e6cf3105e1d4b5f4969`.
- `lib/mortar.js` SHA-256: `566edaf7332af1b7cee3e9139101a115a221beb214398b5d84323120d8550275`.
- Base fire-control SHA-256: `59fc257de4f792191e35ec063f93eede202b9ff0c1e61942d504aea10112c2f7`.
- Mergeable delta: `panel/mech/mech-mortar-arc.patch`.
- Source receipt: `panel/mech/mortar-arc-source.json`.
- Harness/results: `panel/mech/mortar_arc_cases.mjs`, `panel/mech/mortar-arc-cases.json`.

## Proven source problem

The original mortar clearance test advances horizontally by `a * cos(pitch)`, with `a` defaulting to 12 metres, but calculates gravitational fall using time `a / (speed * cos(pitch))`. Those two choices cannot describe the same trajectory time. For the stated horizontal displacement, the matching elapsed time is `a / speed`. The old expression increasingly overstates drop as pitch rises.

For example, the deterministic case uses pitch 1.15 rad, speed 72 m/s and gravity 22 m/s². Over 12 metres along the initial direction, the consistent gravitational drop is approximately 0.306 m; the old mixed calculation exceeds five times that. This is a dimensional/arithmetic finding, not a simulator-derived performance opinion.

The original check also ends within its early 12-metre segment. The integrated fixture places a solid vertical obstruction 30 metres along a 60-metre shot. The baseline fires because its only mortar clearance ray stops before the obstruction; the candidate does not fire. An unobstructed 60-metre shot still fires at the same solved angle.

## Corrected trajectory and bounded geometry

The existing solver supplies yaw, pitch and flight time. The new helper uses one parametric path throughout:

```
direction = [cos(pitch) cos(yaw), cos(pitch) sin(yaw), sin(pitch)]
origin = tube_base + muzzle_offset * direction
position(t) = origin + speed * direction * t - [0, 0, gravity * t² / 2]
```

The tube base remains predicted feet height plus current body height plus 0.5 m. The muzzle offset remains current body radius plus 0.5 m. The prefix between tube base and nominal forward origin is tested first, then every segment of the planned arc is tested using the existing solid-shot map query. The helper does not introduce tree occlusion or an independent collision engine.

The final timestamp is shortened by one microsecond to avoid making the expected ground-impact endpoint a negative-height floating-point artifact. This is a numerical endpoint tolerance, not a metre-scale skipped terminal segment.

For a trajectory of duration `T`, let `Vmax` be the larger initial/final velocity magnitude. Velocity is affine in time under the model and its norm is convex, so these endpoints bound speed over the interval. The segment count is the maximum of:

```
ceil(T / 0.15)
ceil(T * Vmax / 12)
ceil(T / sqrt(0.64 / gravity))
1
```

Consequently, each accepted segment spans at most 0.15 seconds and at most 12 metres of bounded path length. A parabola's maximum vertical separation from its chord over a time interval `h` is `gravity * h² / 8`, so the last constraint limits that geometric approximation error to 0.08 m.

The helper rejects a path needing more than 64 segments. It therefore performs at most **65 solid-ray queries**, including the muzzle prefix, and performs zero queries when the budget or input/TTL check already fails. This bounds the number and length of queries; it does not independently prove a wall-clock maximum inside the existing spatial data structure.

The recorded default and twice-upgraded-speed 7-second path fit the case's 65-call budget. Exceptional live configurations may have a physically reachable path rejected because it exceeds the computational budget. That is an intentional conservative limitation.

## Function contracts

| Changed function/site | Required behavior | Implemented check |
|---|---|---|
| `mortarArcClear` input guard | Never trace invalid, nonfinite, nonpositive or expired trajectories. | Checks all inputs, positive speed/gravity/flight/TTL, nonnegative offset, flight ≤ live TTL. |
| `mortarArcClear` segmentation | Use one time parameter and bounded ray work. | Analytical positions, 64-segment cap and explicit temporal/distance/chord-error limits. |
| `mortarArcClear` muzzle prefix | A ray must not begin beyond an intervening wall. | Tests tube base to nominal forward origin before arc segments. |
| `mortarSelfClear` | Reject predicted blasts too close to the present body or simple future inertial position. | Horizontal distance must exceed splash radius + body radius + retained policy margin at both positions. |
| `firecontrol.run`, mortar prediction | Launch origin and actual-aim gate use the same firing delay. | Computes the existing tick-based mortar delay first, then calls `predictSelf` for that delay. |
| `firecontrol.run`, pitch | Do not take torso ownership with an unreachable solution. | Rejects both below-minimum and above-maximum raw pitch. |
| `firecontrol.run`, expected impact | Self-risk uses the same trajectory as clearance. | Computes horizontal endpoint from muzzle offset, solved flight and launch velocity rather than a separately advanced target point. |
| `firecontrol.run`, trigger | Preserve firing eligibility and other weapon coordination. | Existing cooldown, target, movement-speed/flight, own-held-laser and actual-aim gates remain. |

## Self-blast interpretation and limits

The self check now includes our body radius in addition to the prior splash-plus-margin distance. It also screens the body position obtained by continuing the current horizontal velocity until the predicted impact, including the observation-to-launch delay. This catches an obvious case where a currently safe stationary distance becomes unsafe because we are moving toward the blast.

This projection is a risk screen, not a claim about future control. It does not model later steering, collisions, acceleration changes or a target/body intercept that detonates the shell earlier than the planned endpoint. Walls can also shield splash, but the helper deliberately does not rely on that to relax the clearance threshold. It can reject shots that the authoritative engine would make safe.

## Deterministic evidence

The 18 cases cover:

- Exact parametric coordinates and correct gravity time at a steep angle.
- Prefix obstruction and an obstacle beyond the old early segment.
- Clear travel above a low obstacle and an overhead obstruction.
- Arbitrary yaw, default solved ground contact and a no-map fallback.
- TTL equality, one instant beyond TTL, finite/positive input guards and budget rejection.
- An upgraded default path staying within the ray cap.
- Body-radius inclusion and strict self-clearance equality.
- Current-velocity motion toward and away from the impact.
- An integrated clear shot preserved, a previously permitted wall shot vetoed, raw lower-pitch rejection and action identity without a mortar.

The world fixtures use analytic planes or simple ground conditions. They verify the controller's math and branching independently of the production world map, but do not establish exact authoritative-engine contact behavior. The existing map's own terrain sampling and point-segment collision approximation remain material limits. A very thin obstruction within the 0.08 m chord envelope is not ruled out by these tests.

## Expected tradeoffs and next gate

The correction should prevent some map-blocked mortar attempts and remove the inconsistent early-arc geometry. It adds bounded geometry work and more conservative self-clearance and TTL/budget vetoes. A shell that would explode usefully against cover, or a safe path beyond the budget, can be rejected. No net score gain is asserted.

The next concrete gates are the algorithm owner's independent source review and the parent's coordinated protocol/full-map latency check before publishing a combined candidate. Current protocol semantics come from the official track's rulebook; the local simulator was not used as an engine oracle.

Official mechanics: https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1
Runtime contract: https://www.joinbuilders.org/buildathon/tracks/builders
