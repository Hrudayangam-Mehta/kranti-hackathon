# Brain checkpoint: layers 1-5 (written before layers 6 and 7 were started)

Files: `bot/lib/brain.js` (orchestrator), `params.js` (every tunable, `PARAMS`), `senses.js` (layer 1),
`firecontrol.js` (layer 2), `mover.js` (layer 3), `tactics.js` (layer 4), `economy.js` (layer 5), `stance.js`
(layers 6-7, at this point only the idle pull). Tests: `tools/test_brain.js` + `tools/arena_micro.js`.
Run: `taskset -c 0 ./bun tools/test_brain.js` (`--only=<word>` runs one group, `--quick` shortens the fuzz).

## What works (22/22 checks at this checkpoint)

| check | result |
|---|---|
| stream replay, map and no map | no exception, 0 internal stage errors, valid actions; cold pass mean 0.3 ms, p99 7 ms, max 12 ms |
| gun, target walking across at 60 / 100 / 150 m | 0.98 / 0.92 / 0.84 with the real 0.6 deg dispersion (0.98 / 1.00 / 0.97 without) |
| gun, strafing target reversing every 2 s at 100 m | 0.72 |
| gun, stationary at 200 m | 1.00 without dispersion; 0.80 with it (physical ceiling 0.84 at the range held) |
| zone | reaches the next circle with 0 ticks outside; outside the zone it boosts on every decision with energy |
| heal at 30% hp | line of fire broken in 1.7 s, 0 shots while healing, 90% at 26 s, fires again at 27 s |
| shell dodge | 24/24 shells aimed at us and 24/24 led shells land >= 13 m away |
| laser | 13/13 beams through the body, all released at full charge |
| offer, pickup, crate loot | priority list, take / drop rules, crate shot open and cube collected |
| path following around a building (3 cases) and the stuck ladder without navigation | goal reached; jump, sidestep, abandon |
| duel against a scripted hunter on the real map, 6 seeds | 6 kills, hp back above 90% |
| fuzz, 2000 perturbed observations x 2 | 0 throws, 0 invalid actions, 0 internal stage errors |
| conformance `kit/check/check.py` | PASS, 300/300 in time, worst 9 ms |

## Read this before trusting the numbers

- **The 200 m criterion (>= 0.9) cannot be met with the real gun.** Forensics measured 0.65 / 0.61 deg sd per
  axis. A perfect aim then hits a 2.5 m body at 200 m about 80% of the time. The test checks 0.9 on the
  fire-control error alone (dispersion off) and 92% of the physical ceiling with dispersion on.
- **The micro-arena is my own stepper, not the server.** Its enemies are scripts: they deal a fixed dps while
  they see us (reduced when we move sideways beyond 60 m) and do not dodge, flank, or regenerate. Duel results
  say the machinery works together; they do not predict practice scores.
- **Shot timing.** The arena fires on the first simulated tick after the decision (0.05 s), which is what the
  replay forensics show (`tools/forensics/out/logs/bullet_kinematics.txt`: fire ticks are odd). The brain keeps
  the spec default `latency = 0.10`. Both timings pass (columns "shot one tick later" in the test output); the
  0.05 s mismatch costs about 0.6 m of lead on a walking target. Sweep `latency` 0.05-0.10 in the simulator.
- Against two hunters arriving together the scripted duel is lost in 5 of 6 seeds with 0-1 kills. No pass
  criterion was set for it.

## Missing at this checkpoint

- Layer 6: corner ambush (M2), shoot and relocate (M3), bastion last stand. Only the "doomed" rule exists
  (fight on when we would die before reaching cover).
- Layer 7: stances, F / Q environment counters, channel vetoes, FFA manoeuvres. `stance` is fixed to an
  OPPORTUNIST-like default and `env` to SQUAD.
- No full-simulator run: `sim/run.js` did not exist.
- Never exercised in a closed loop: lightning, mortar firing, supply drops, drones, the laser-charge reaction,
  the "isolate" position evaluation with real second attackers, kill-drop collection.

## Deviations from BRAIN_SPEC_V2 (deliberate)

1. HEAL holds fire only once nobody has had a line of fire on us for 0.5 s. While still exposed it shoots
   back: being hit resets the regen timer anyway.
2. Finish-or-flee against a lone hunter caps `tCover` at 4 s in `H_esc` and keeps a winning duel going.
   With the plain formula a full-hp bot ran from every single hunter whenever cover was more than ~70 m away.
3. Damage from a mech that is not listed creates a phantom track on the damage bearing, and the brain treats
   it as an attacker with a line of fire (retreats, faces it). The spec only covers listed mechs.
4. Blind fire at a dead-reckoned target for 1.5 s after it leaves view (trees block sight, not shots).
5. The laser takes the torso 0.1 s before full charge (`laserAimTakeS`), not 2 ticks.
6. Nanites after the first two offers ranks between armor and gun_rate (the spec does not place it).

---

# Addendum: after layers 6 and 7 (same session)

Layer 6 and layer 7 were added in `bot/lib/stance.js` after the 22 checks above passed. The suite now has 29 checks.

| added | what it does | test |
|---|---|---|
| corner ambush (M2) | target listed but no line either way: stand 45-55 m from the point where its path comes into view, torso pre-aimed there, laser charged on its ETA; aborts after a 3 s stall or 12 s | emergence at 97 m: aim error 0.03 rad at first sight, first shot 0.1 s later, kill, no damage taken |
| relocate (M3, reduced) | against a laser or mortar holder the reload is spent moving in one direction, no jink reversals; reload behind a hide cell within 8 m | not tested on its own |
| disengage (M10) | survival veto `hp/A < 1.5 tCover + 2 s` forces DISENGAGE; once hidden the bot continues to a hidden cell 60-80 m further from the enemy centroid | not tested on its own |
| LAST-STAND + bastion | doomed (`hp < A (tCover+1)`), `n1 >= 3` without cover, `hp < 25%` under fire, final shrink: fight on, target = smallest time to kill, walk to a cell with a wall <= 4 m behind and few open rays (12 rays) | 2 attackers at 18% hp: LAST-STAND on 29/30 decisions, weakest enemy shot until we died |
| stances | DEFENSIVE / OPPORTUNIST / OFFENSIVE / LAST-STAND parameter sets, 1 s to go bolder, 3 s hold, immediate fall-back | healthy SQUAD duel: OPPORTUNIST; 43% hp: DEFENSIVE |
| environment | F / Q counters, FFA latch, `PARAMS.env` = 'auto' / 'squad' / 'ffa' | beams between two other mechs latch FFA; quiet mechs stay SQUAD; overrides |
| torso veto | an attacker of >= 60 dps is kept within 80 deg of the commanded yaw (bisector for two) | worst offset 80.8 deg |
| idle pull | SQUAD, healthy, 20 s without a line of fire: walk to the last known enemy | seen in the heal test (`HOLD/pull`) |
| kill drops | cubes of our kill are fetched while regenerating | 2/2 cubes, 0 shots |
| JIT warm-up | one synthetic 200-decision run inside `createBrain` (once per process, about 0.1-0.3 s) | conformance worst decision 3 ms instead of 9 ms |

Not implemented: M5 (third party), M6, M7, M8 ring watch, M9 zone-edge gate, M11 endgame switch, virtual guns,
bullet-reactive dodging, rooftop play. In FFA the bot only changes stance (DEFENSIVE default, silent first-shot
policy, no idle pull, plating first).

Bug found by the fuzz test while adding layer 7: a fuzzed `alive` value made a loop run 1e12 times (a hang, not
an exception). Fixed, and the fuzz now also fails on any decision slower than 25 ms.

The stream in `kit/check/stream.jsonl.gz` is a free-for-all (three foreign deaths in 36 s): the brain latches FFA
on it at t = 22.7 s. A false FFA latch in a practice match would cost kills; set `env: 'squad'` in the overrides
of a practice-only submission if the simulator shows any false latch.
