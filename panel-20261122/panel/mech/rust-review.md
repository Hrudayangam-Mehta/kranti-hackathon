# Independent Mech geometry review

## Scope and evidence

Reviewed `experiments/mech-geometry/bot` against the verified local P26 source at `handoff/.cache/ws/variants7/P26_all/bot`. Only `lib/firecontrol.js` differs between those source trees at this review.

- Baseline `firecontrol.js` SHA-256: `b51dbe1a1df728a08a51ab601d54f9d088308c9c0e7e74faeb091c0d9a5a25eb`.
- Initially reviewed candidate SHA-256: `d2b7cd0c5039b5f42220e947e4f632f280ab0d59bd4f9ac2010aedd786213431`.
- Corrected source SHA-256, independently reread: `59fc257de4f792191e35ec063f93eede202b9ff0c1e61942d504aea10112c2f7`.
- Read the changed fire-control paths, their geometry/math helpers, live-stat handling, P26 profile activation, environment update order, and the existing regression/checker receipts.
- This reviewer ran no CPU tests, simulator, build or game-server operation during the Shopping timing window.

Primary rule evidence is the official starter protocol at `handoff/.cache/ws/mechbot/kit/protocol.md`, corresponding to [the official protocol download](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1). Its coordinate, muzzle, weapon and cover sections establish metres/seconds/radians, actual torso aim, a forward muzzle offset shortened by geometry, and solid obstacles stopping shots. The algorithm author confirmed it did not inspect an authoritative engine implementation, so this review does not claim exact parity with the engine's clip epsilon or terrain samples.

## Resolved blocking finding: stale profile flag at the FFA transition

**The initial candidate did not satisfy a strict first-decision firewall guarantee; the corrected candidate resolves this finding.** This is an existing activation-order weakness inherited by the new geometry branch, rather than a newly introduced assignment bug:

1. In `brain.act`, the assess stage calculates `B.p26on = !!prof && hunt.firewall()`.
2. The later stance stage calls `stance.update(obs)`.
3. `stance.environment` updates `B.foreignDeaths` and can latch `B.env = 'FFA'` using that observation.
4. Fire control then executes with the earlier `B.p26on` value.

A newly latched FFA decision, or the first observation crossing the foreign-death threshold, can therefore have a false live firewall and a true cached profile flag. Both the new near-barrel check and new laser reachability branches initially used that cached flag. A test that disables the profile from the start does not cover this transition.

Recommended correction sent to the algorithm author and parent: derive a **fresh geometry-only enable flag** at fire time using `B.p26on` and the live `B.hunt.firewall()`. Use it for every new geometry conditional while retaining the preexisting P26 behavior for all other logic. This avoids expanding the change into a global profile-scheduling rewrite. A transition regression should compare the candidate with the original when the cached profile remains true but the current environment is FFA or current foreign-death count crosses the threshold.

The author applied exactly that bounded correction. `geometry()` now requires both the cached profile and the current `B.hunt.firewall()`; the prefix check calls it, and all new laser reachability branches use its result. When it is false, the original P26 range-minus-five behavior and clamped target-angle behavior remain. I reread the final diff and found no missing new-geometry branch. The stored crafted-case receipt now has six successful stale-profile probes: FFA and foreign-death transitions, each exercising a near wall, unreachable pitch and the alternate-rung range boundary. **The blocker is resolved for the corrected source hash above.**

## Geometry and arithmetic findings

| Function/path | Checks performed | Finding |
|---|---|---|
| `muzzleClear` near segment | Origin is predicted feet plus current muzzle height; offset is current radius plus 0.5 m; direction uses cosine/sine in the established axes and radians. | Arithmetic is consistent with the documented muzzle model. The additional solid-geometry check closes the previous gap between the body muzzle point and the assumed full forward origin. |
| `World.shotClear` / `_cast` | Uses shot any-hit mode, which tests solid prisms and terrain, excludes tree trunks/canopy and rejects nonfinite coordinates. | Appropriate obstacle class for the protocol. It is a point-segment approximation using the existing map implementation, not a new server-equivalence proof. |
| `World._rayTerrain` | Start-below-ground check, bounded grid march, vertical-segment handling and finite inputs reviewed. | The prefix uses the existing terrain sampler. The patch does not repair preexisting terrain discretization differences. |
| `run`, initial laser rung | Keeps the raw target elevation under the active new policy; reachability compares that angle against physical pitch limits. | Correctly distinguishes a reachable target angle from a clamped command angle. Clamping first could make an impossible target appear reachable. |
| `run`, range/rung search | Tests every configured rung for pitch and three-dimensional distance; each candidate is checked again before visibility acceptance. | A lower reachable/in-range rung can now be selected even when the first one is impossible. Angles and distances use the same predicted origin. |
| `predPitch` / `predYaw` and final output clamp | Existing slew prediction and final legal command bounds remain. | The new target-angle checks do not remove command limits or the actual-aim firing gate. |
| `senseSelf` live stats | Radius, muzzle height and pitch limits come from the current observation/configuration with existing validation and scaling. | The patch does not hard-code the default 7 m muzzle height or default pitch bounds. Existing upper size clamps remain a separate model limitation. |
| `hunt.firewall`, `stance.environment`, `brain.act` | Traced update order rather than checking only the boolean name, then reread the fresh geometry guard. | Initial transition blocker is resolved in the corrected candidate; the baseline profile-selection schedule itself remains unchanged. |

### Deliberately bounded interpretation

The new prefix check is conservative. It rejects a firing ray when the body-to-full-offset segment crosses solid map geometry; it does not reproduce the engine's exact clipped start point. The rest-of-ray check still stops one metre before the selected target point, an existing target-contact tolerance. Motion prediction and geometric sampling remain approximate.

The range margin of five metres is inherited from the P26 policy and is measured from the body muzzle point, not the forward shifted beam origin. The change makes rung reachability internally consistent; it does not claim optimal use of the engine's entire beam range or complete continuous target-cylinder intersection.

The existing force-release branch remains: a fully charged laser can be released after `laserForceS` even if the precision gate is false. The no-charge escape can also release a charge. Therefore the improvement is a precision gate and rung-selection correction, **not a guarantee that every released beam can hit**. The algorithm author agrees with this interpretation.

## Hot-path cost and 50 ms limit

The additional work is proportional to the existing short aim ladder. The current P26 profile has four rungs. It adds a bounded reachability pass and one short solid-geometry query per tested ray. With the currently validated radius capped at 30 m, the new prefix is at most 30.5 m; normally it is about 3 m before cube scaling. Spatial traversal still depends on local map density and terrain resolution, so source reasoning alone cannot certify a worst-case wall-clock bound.

The reachability `.some` creates a small callback each laser decision. This is a possible micro-optimization if profiling identifies it, not an observed deadline problem. No extra unbounded search, network call, file read or large collection allocation was introduced in the changed path.

The final corrected bundle (`a19a4364c40bf3008ef1cddb5d48324a913849066e3a76d9218fad390fbd4bab`) passed the official local checker on 300/300 observations: no late/missing answers, wrong ticks or malformed lines. The corrected receipt in `protocol-results.json` reports p50 0.3 ms, p99 2.7 ms, maximum 2.9 ms and ready time 1812 ms. The run used Bun 1.4.4 with CPU affinity restricted to one core.

The independent lockstep-driver receipt in `latency-results.json` also passed 300/300 with zero schema/errors/late answers. Its p95/p99/maximum were 1.20/2.96/4.21 ms, against the verified baseline's 1.10/2.28/2.99 ms. Sampled peak resident high-water mark was 81,812 KiB versus baseline 79,840 KiB. The corrected geometry has a small observed latency increase on this stream, while retaining substantial margin to 50 ms. These are bounded conformance and host measurements, not a hard worst-case guarantee, Docker/cgroup sandbox result or official score. No backlog or stall tests ran in that driver receipt.

## Existing test coverage and completed gate

The initial `panel/mech/decision-cases.json` contained 15 cases across two experiments, eight geometry and seven capture cases. The current receipt records **23 passed cases: fourteen geometry and nine capture**. Geometry cases cover clear gun paths, obstacles before/after the assumed muzzle, profile-off identity, impossible laser elevation, lower reachable and lower in-range rungs, clear laser behavior, and six fresh-firewall transition probes. Their map stub is a simple plane-wall predicate; they do not independently validate the full map collision engine.

The final corrected bundle has its own successful official-checker and lockstep-driver receipts, completed at 07:37:23 UTC on 22 November 2026. A below-minimum-pitch case and equality-at-pitch/range-boundary cases could strengthen coverage if a concrete remaining risk warrants them. Do not rerun match simulations for ranking: the owner's standing handoff explicitly retires that use of the simulator, and builders-4 official results are a different evaluation distribution.

No score improvement is predicted from this source review. The corrected candidate is accepted by this source reviewer with the final bounded protocol gate passed and the stated model limits retained.
