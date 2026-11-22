# Adaptive Mech — round 1 mechanics, state and reward audit

**Recommendation: retain the 5.47 capture entry as the reference. Test two bounded changes first: value safe supply drops by energy and cube/upgrade benefit as well as health; make aggressive pursuit conditional and reversible using actual readiness, incoming exposure, escape reserve and zone time.** The failed pressure/burst policies remove several useful choices permanently. Their lower owner-reported scores are consistent with that concern, but fresh private seeds and absent match-level outcomes prevent causal attribution.

No production source was changed for this audit. All source and initial-file hashes are in `adaptive-round1-mechanics.sources.json`. Numeric starter values below were independently extracted from the checked-in initial `hello`; `adaptive-round1-initial-config.json` retains the complete config. Runtime observations and live config must override defaults.

## 1. Reward and evidence boundary

The owner reports capture `099e7e3` at **5.47**, pressure `69ed181` at **4.74**, and burst `26f382e` at **4.67**. These correspond algebraically to mean placement 10.53, 11.26 and 11.33. The decreases are 0.73 and 0.80 placement points. They are unpaired aggregates, not an estimate of a causal effect or a confidence interval.

The [current official track](https://www.joinbuilders.org/buildathon/tracks/builders) specifies `mean(16 - place)`, 96 practice matches against a cooperating house squad, escalating hunters, and fresh private seeds. The [current protocol](https://www.joinbuilders.org/buildathon/tracks/builders/files/protocol.md?inline=1) still contains an older 48-match submission paragraph; use the current track for scorer setup. Exact hunter-count/alive/time thresholds are not published. Do not encode an invented schedule or assume that every visible house bot is actively shooting.

A kill is useful through one less surviving opponent, resources and reduced immediate pressure; its cost can include the next hunter wave. It is not an independent bonus reward. In FFA, other deaths can improve placement without our engagement. At timeout, HP matters. The comment in `stance.js::chooseStance` that “kills are the score” is misleading and should not become the new objective. At most, use a transparent heuristic for placement opportunity per exposure time; no calibrated win/kill probability has been established.

## 2. Mechanics that constrain the next policy

| Mechanic | Starter config / observation contract | Decision implication |
|---|---|---|
| Cubes | Thresholds 1,3,6,10,15,21,28,36,45; stats cap 10; +4% HP/damage; +5% body scale uncapped | Upgrades do **not** spend cubes. Count newly crossed thresholds; beyond cap, include body cost. |
| Offers | Queued; 5 s expiry; choice 0 fallback; effects and stacks in config | A pending offer is an opportunity, not proof a combat upgrade already exists. |
| HP recovery | 45 HP/s after 5 s without dealing or receiving damage, inside zone | Crate/NPC hits also reset recovery. Use live delay/rate. |
| Energy | 100 base; 18/s after 0.6 s without spending; boost 17/s, jet 15/s | Do not forecast regen while repeatedly firing lightning or boosting. |
| Drops | Calls 70/140/210 s; land 25 s later; 8 m ring, 4 s capture; +3 cubes, full HP/energy | Full HP alone does not imply zero value. |
| Capture state | Multiple occupants freeze; empty/different sole occupant resets | Trust holder/progress; separate banked progress from ability to finish. |
| Gun/laser | Live ammo/reload/cooldown/charge; actual torso aim; charging slows movement | Nominal sustained DPS is not available damage over the next second. |
| Weapon effects | Cook-off, short and concussion; nearest-object lightning | Preserve actual target/geometry/charge locks and reserve checks. |
| Zone | Current and next circles, interpolated shrink; no armor or HP regen outside | Use observed zone geometry and phase DPS; budget route and escape time. |

These are constraints, not a proposed rewrite of the engine. In particular, body scale and cube damage are separate from upgrade-modified weapon statistics; do not multiply cube bonuses twice.

## 3. Exact-source findings

### A. High-priority policy defects and opportunities

1. **Irreversible combat commitment.** `pressure.js::update` sets `S.on` once from equipment/upgrade eligibility or a time deadline. It never returns to setup/recovery after damage, weapon loss, energy depletion or stronger enemy contact. `mode` clears losing/disengage/hold-fire flags and resource goals; `brain.js::act` skips economy and hide maintenance after activation. This is a structural difference from capture, independent of score variance.

2. **Capture recovery and resources are suppressed.** Pressure's `captureFinish` protects only an already-owned drop with at most 0.6 s left. It cannot begin a useful capture, preserve 1–3 s of valuable progress, route to a healing/energy drop, collect an upgrade cube or replenish equipment beyond incidental hands-range pickup. Capture retains these choices. Starting from capture avoids reconstructing them.

3. **Pursuit has no own-health survival admission.** `pressure.js::select` ranks targets through nominal outgoing damage at the desired range, approach time and a small nearby-enemy term. It does not reject a fight because current HP cannot survive approach + firing + escape. `rangeFor` can choose short lightning range from two shot costs of energy, without valuing closing expenditure. `burstDamage` omits actual torso alignment, cover, hidden armor and shared energy/movement costs. These remain heuristics, not guaranteed finishes.

4. **Full-HP drop opportunity is discarded in capture.** `prof.js::chooseDrop` skips every unowned drop at `hp >= maxHp - 0.5`. A full-HP mech with depleted energy, or cubes just below an upgrade threshold, receives no high-priority drop task through this chooser even when capture is safe. The separate chooseLoot path can still route toward a drop, so this is a priority/value omission, not total inability to collect one. Keep the existing geometry/progress logic and extend only this benefit test, subject to travel/exposure/zone limits. A full-HP/full-energy, far-from-threshold state is an important negative control.

5. **Capture is not immune to bad ordering.** `prof.js::decideMode` selects drop/grab before retreat latch. A valuable resource task can therefore override a low-HP recovery state. New benefit logic must not increase that problem: validate survival admission before selecting a drop, and reevaluate on new damage/contest/zone change.

6. **Mortar-only readiness is unsupported by pressure.** Armed-deadline activation permits a mortar-only loadout, while `damageRate`/`burstDamage` ignore mortar and `allCooling` considers only gun/laser/lightning. Fall back to the existing supported policy, or add a tested mortar model separately; do not use a nominal 1-DPS target with a generic close range as an aggression mandate.

### B. State and event audit

| Function(s) read | Finding | Disposition |
|---|---|---|
| `brain.js::normalizeConfig` | Capture copies only `DEF_CFG` top-level sections and omits `hello.config.upgrades`. Static upgrade order is unaffected; any new effect-based upgrade evaluator must explicitly retain a sanitized list. | Root owns that correction in the separate adaptive-weapons experiment; not claimed as a cause of the scored decline. |
| `senses.js::senseSelf` | Reads authoritative HP, energy, equipment, upgrade count, live speed/turn/regen/weapon stats each observation. Cube body growth and damage multiplier are separate. | Preserve. This is not an event-only inventory. |
| `senseSelf`; `weapon_policy.js::energyOk` | `me` does not retain live armor, energy regen/delay or boost/jet drain. The latter uses cfg drain; enemy armor is hidden. | Adaptive admission must read actual `self.stats` or add explicit fields. Do not apply our armor to zone DPS. |
| `senses.js::senseEvents` | Damage sets hurt time, including zone; hit sets dealt time, including crate IDs. Kill removes target and records credit. Missing effect/pickup/upgrade/drop handlers do not corrupt authoritative self state, refreshed first. | Preserve exact self-state authority. Use effects only for additional prediction; no duplicate resource increments. |
| `bot.js` + `io.js::mergeSkipped` | Selected preset enables merge; skipped events/sounds/beams are merged with age correction, newest entries retained under 64/32/16 caps. | Ordinary backlog is handled. The comment promising events are never lost is stronger than the cap: an old kill can be evicted. Test this as bounded transport stress, not an observed scoring cause. |
| `senseTracks`; `assess` | Server-listed mechs may be current memory tracks behind cover; first ten tracks get geometric LOS queries, farther listed tracks are assumed clear. | Admission must use fresh physical LOS for the selected action. Listed is not synonymous with unobstructed. Hidden enemies remain uncertain. |
| `stance.js::environment` | Auto FFA latch uses foreign deaths and never unlatches. Zone/NPC deaths or lost kill credit can be evidence without actual inter-bot fighting. | Treat as inference, not a server mode field. Do not force a classifier change in the minimal round. |
| `senseZone`; `zoneSlack` | Interpolates from observed current circle to next over remaining shrink time; late `nrEff` intentionally shrinks the planning target further. | Separate exact zone exposure from conservative planning margin in an adaptive utility calculation. No double interpolation from phase origin. |
| `prof.js::dropPlan` | Owned/banked progress and uncontested advancing ownership are separate; current capture fix uses real holder/progress and actual ring occupancy. | Preserve. Unknown occupants still limit certainty; task completion must come from observation/event, not local elapsed time alone. |
| `prof.js::ownDps`; `pressure.js::damageRate` | Gun cycle denominator differs: `mag*cd+reload` versus `(mag-1)*cd+reload`. Default estimates differ by about 4.8%. | Model discrepancy, not a proven engine bug: public prose does not resolve all reload/tick ordering. Use actual ammo/readiness for short-horizon decisions. |
| `firecontrol`; `weapon_policy` | Actual-aim/clearance gates, laser charge protection, nearest lightning blocker, pickup range and anti-thrash remain useful. | Preserve independently of macro policy; do not trade them for a nominal kill flag. |

## 4. Minimal adaptive contracts for round 2

**C1 — A candidate goal, not a permanent latch.** Evaluate `fight`, `recover`, `drop`, `equip`, `cube`, `zone` against current authoritative state. The capture policy remains the fallback. Hard changes (incoming damage, unsafe zone, lost target, newly contested ring, weapon unavailability) invalidate a chosen goal immediately; a small dwell prevents harmless near-tie oscillation. Store one reason and expiry, not several competing global flags.

**C2 — Survival admission before reward.** A pursuit or resource route needs an admissible travel estimate, local exposure estimate, readiness-aware completion time, and escape margin. Example auditable inequality: `estimated incoming damage over travel + completion + escape < current HP - explicit margin`. Use conservative observed incoming damage plus relevant enemy priors; both are estimates. Enemy support must be related to our path/line, not only to distance from the target. A short finisher may qualify, but ordinary sustained DPS must not masquerade as that case.

**C3 — Drop benefit has three separate terms.** Health restored, energy restored, and cube/threshold value are independently positive. Use live missing amounts, `drops.cubes`, and the count of thresholds crossed by the reward. Compare benefit with route/wait/capture time and exposure. At cap, body growth can make extra cubes undesirable unless threshold or recovery benefits justify them. Progress only reduces capture time while holder/occupancy make that progress usable. Keep the repaired contest/leave/reenter semantics.

**C4 — Recovery really permits recovery.** Forecast HP regen from `max(lastHurtT,lastDealtT)` and the live delay/rate; require in-zone and no continuing combat damage. During a chosen safe recovery interval, do not shoot a crate or an unneeded target and reset the timer. Reentering zone restarts the clock after last zone damage. Energy forecasts must respect the live spend delay and combined movement/weapon drain.

**C5 — Actual loadout and configuration.** Derive useful ranges, shot counts, charging mobility cost, equip delay and upgrade effects from live self/config data. An unavailable channel contributes no immediate damage. Unknown dropped-gun ammo is not a refill. Never swap a charging laser, duplicate a held kind, or drop a gun solely because an unobserved enemy is inferred to favor another weapon.

**C6 — Reward and alive counts constrain risk, not hardcode hunters.** At few survivors, the value of an unnecessary fight changes, but physical feasibility does not. Use `alive`, remaining zone time, current HP/energy and a reasoned goal. Do not add a fictitious kill bonus or assume a published exact escalation schedule that does not exist.

## 5. Independent integration fixture plan

The full matrix is in `adaptive-round1-fixtures.json`. These are **planned tests**, not passes. Rust owns separate source-level decision counterexamples; this reviewer owns config/zone/state-valid integration boundaries, so the work does not duplicate.

Construct from the official initial hello and recorded legal map positions. For later times, derive phase start/end/radius/DPS from that same config and sample nested circle centers; never shift only `t` while leaving the old zone. Mark every counterfactual field. Clone live stats consistently with actual upgrade effects and cube/body formulas. For transient weapon values use within-config cooldown/reload/charge bounds, or document an actual equip/short effect. Validate schema, radius/height map clearance, actor separation, visibility/memory justification and current `in_zone`.

Use paired single-decision or short scripted observations to test one boundary: full HP + low energy versus full HP + full energy; two cubes versus ten/threshold distance; one safe opponent versus two damaging lines; cooling weapon versus ready; zone-safe route versus route overtaken by shrink; owned capture versus contest versus exit/reset; a real hit on a crate before a recovery window; live armor versus zone damage; queued offers after multi-cube reward. Scripted observations are individually constrained counterfactuals, not reactive gameplay or a claimed possible complete match.

The unchanged official 300-observation replay remains a regression/transport gate; it covers t=0..36.8 s and at most two events per observation in this stored stream. It does not establish late-game adaptive utility. Final runtime results must parse exact timely/late counts and retain every predetermined run, as in the corrected previous diagnostic.

## 6. What would change my conclusion

A public authoritative server source could settle reload order, status-effect timers, cone boundary semantics and exact house scheduling; none has been established here. Official per-match/replay outcomes could separate poor engagement selection, lost recovery, loot starvation and runtime outliers. Until then, source counterexamples justify targeted corrections, and official scores decide selection. Synthetic action differences, nominal damage ratios and faster local replay are not evidence of a higher placement score.

The next two implementation rounds should avoid a broad macro rewrite: first admit safe, valuable drop goals from capture; then test a reversible fight/recovery admission while preserving the same weapon controller and fallback. Publish distinct commits for those hypotheses only after correctness and runtime gates. This keeps an observed score change interpretable enough to decide what to retain.
