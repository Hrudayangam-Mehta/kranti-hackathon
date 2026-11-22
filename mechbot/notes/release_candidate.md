# Release candidate RC1 (release engineer, Opus sub-agent; 10:42-10:57 UTC Sat Nov 21)

Verdict: **GO**. Release gate GO in 2 of 2 runs (35 PASS, H9-method-exposure waived). All four suites pass, and so does
the conformance check. All three check2b FAILs are fixed (two in the bot, one in the gate policy). Nothing was pushed or
submitted. /home/user/kranti-hackathon was read only (its working tree is clean). Scripts and raw outputs are in
tools/rc/ (out/ holds the results).

## Build id (dist/, built by tools/package.sh at 10:53 UTC)

| File | Bytes | sha256 |
|---|---:|---|
| bot.js (minified single-file bundle of bot/bot.js) | 196496 | da88060b96eeec992cb76c3e175a483dad3c68c0987809ac8e748dd9906cb358 |
| Dockerfile (oven/bun:1.4.4-slim@sha256:1846adf2..., 9 BUN_JSC_* one-CPU limits, useConcurrentJIT=1) | 496 | e04b4bec72c9507ac9d199714e2e1b4c9b6537a9f986249d6be6aa4f90d52c1a |
| LICENSE (MIT; byte-identical to /home/user/kranti-hackathon/LICENSE) | 1074 | 2838d6d1f7a64a81cbb66d1056cd3425c46b0405b560744c0474f80837bf059e |
| README.md (byte-identical to /home/user/kranti-hackathon/README.md) | 518 | f289218b28c8f20e85beac222155ae132a15a282c5feb1fe3546f5941f730975 |

- dist/ holds exactly these four files. The two gate runs did not change it (tools/rc/dist_after.sha256).
- Readable source: tools/rc/bot_final.sha256. At the start of this pass: tools/rc/bot_start.sha256 (= pass 2b final).
- Changed files: lib/params.js, lib/senses.js, lib/steal.js, lib/tactics.js. bot.js and the Dockerfile are unchanged.

## Changes in this pass (one per check2b FAIL)

1. **Gate P6, engine limits.** tools/release_gate/pack.py now requires BUN_JSC_useConcurrentJIT=1 (one line, with a
   comment). bot/Dockerfile is unchanged.
   - Reason: one-core worst decision is 11.8-12.3 ms with =1, against 14-27 ms compile pauses with =0 (check2b section
     5, pass 2b timing).
   - Original kept: tools/rc/pack.py.orig.
2. **R1b kill drops** (steal.js deathItem). A healthy survivor that aims at us (within 120 m) still blocks the START of a
   rush. Once we have gone for a death's drops (`d.go`), its torso turning to us as it walks to its drops no longer turns
   us back. Path time, our hp below 50% and LOSING still do.
   - check2b 8 geometries, survivor walking: 3+ cubes 5/8 -> **8/8**, laser 3/8 -> **8/8**. Standing survivor: 8/8,
     8/8 (unchanged).
   - "It is first" cases unchanged: survivor 22-25 m or 6 m from its drops -> we stay at least 35 m away.
3. **Farm-first gate** (tactics.js ofAnswer, senses.js nearHostT). "Answered" means it hit us in the last 4 s, and
   either:
   - the hit came from within 100 m (as before), or
   - the hit belongs to a hostile spell that began within 100 m (gaps of up to 4 s keep the spell alive).

   The same rule now governs the candidate gate, the torso veto and the R2 rear pick (before, they each had their own
   copy).
   - check2b openfarm: 85 m / 20 dps 0 shots -> **12 shots, first at 2.8 s**; 95 m / 40 dps -> **12 shots at 1.6 s**.
   - Unchanged: 125 m shooter (0 shots, break the line), calm mech (0 shots), the 75 s and 10-cube end.
   - This also removes a flip-flop: before, a mech answered at 90 m stopped being answered once our laser stand-off took
     the next hits past 100 m.
4. **New preset `openFarm: 'd0'`** (off by default). Inside the gate, any D0-hostile mech (aim or hit, any range) is
   answered at once. This is dossier lesson 1 ("answer any hostile at once") and the addendum's `openGuard75`.
   - Measured: aim-only mech at 60 m -> shot at 0.2 s; 125 m shooter -> shot at 0.2 s.
   - **Decision on the checker's "aim from 60 m" point:** the default stays the measured proj1 rule (answer hits),
     because:
     - it is the rule the proj1 ladder (5.42 / 5.60) was scored with;
     - in the final's opening, before the latch, D0 aim hostility has no dwell in SQUAD posture, so `d0` would open
       fire on proj1 copies whose sweep crosses us (addendum K2);
     - `d0` is the ready one-change alternative.

Regression tests: tools/test_brain.js group `rc` (2 checks; tools/rc/rc_group.js).
- Both FAIL on the pre-fix code: walking 2/4, trace geometry 0 cubes at 5.6 m; 85 / 95 m 0 shots.
- Both PASS on the fix.

## Switch defaults (SELECT in bot/lib/params.js)

```
laserRange far, healExit 70, farmHp 90, strafe d4, ffaPair on, beamClue off, gunlessClue off, idlePull off, env auto,
ffaCounters on, ffaRules on, aimDwell off,
R1 on, crateGate ffa, R2 on, R3 on, aimCal off, openFarm on, cxFinish on, cxKiterRamp on, cxBrawler off,
ffaThirdFix on, ffaBreakFix on, hidePlanCap on, pass2b on;  PARAMS.salt 0
```

## Presets for later one-change submissions (edit one string in SELECT)

SQUAD-affecting (these change the practice score):

| Preset | Values | One-line description |
|---|---|---|
| laserRange | **far** / mid / far170 | Laser stand-off: hold 150 m in 125-185 / hold 115 m in 100-130 / hold 170 m in 145-195 (addendum item 2). |
| healExit | **70** / 90 | Leave HEAL at 70% / at 90% hp. |
| farmHp | **90** / 50 | Farm crates and drones only at 90%+ hp / down to 50%. |
| strafe | **d4** / fast | Strafe reversals every 0.8-1.6 s / every 0.45-1.15 s (measured negative elsewhere). |
| idlePull | **off** / on | on: in SQUAD, after 20 s with no line, at 90%+ hp, walk to the last enemy sighting. |
| env | **auto** / squad | auto: SQUAD with the FFA latch on 3 deaths we did not cause before 200 s. squad: never latch (latch-leak probe). |
| aimDwell | **off** / on | Aim counts as hostility after 3 decisions in FFA only / also in SQUAD (K2). |
| beamClue | **off** / on | on: a second latch clue (two beams by others ending near a third mech that loses hp). |
| gunlessClue | **off** / on | on: latch when 2 gunless mechs are seen, or 1 plus a foreign death (house bots always carry a gun). |
| R1 | **on** / off | Loot stealing a-e: crates others break, kill drops, death cubes kept 90 s, pickup races, supply drops. |
| crateGate | **ffa** / all / off | Smart crate and drone shooting gate in FFA only / in SQUAD too / never. |
| R2 | **on** / off | Late-game torso sweep (t 240 s+ or 8 or fewer alive), and facing a mech that hits our rear. |
| R3 | **on** / gun / off | Laser at the highest clear body point (gun centre-first) / gun also on the head ladder from 0.65 / centre aim. |
| aimCal | **off** / on | Online laser calibration. Off because our own beams are not reported to us (it would learn nothing). |
| openFarm | **on** / d0 / off | Until 10 cubes or 75 s, start no fight (see below). |
| hidePlanCap | **on** / off | Cap on the hide-cell A* (decision time; both postures). |
| pass2b | **on** / off | off = every pass 2b switch off at once (= the pass 2a bot; byte-identical, below). |

`openFarm` values:
- **on:** answer only a mech that hit us from within 100 m, or in a hostile spell that began there. Break the line from
  any other hostile.
- **d0:** the same opening, but any D0-hostile mech is answered at once.
- **off:** pass 2a play (D0's 40 s guard only).

FFA-only (they act after the latch; in a real final, also the whole free-for-all after 3 foreign deaths):

| Preset | Values | One-line description |
|---|---|---|
| ffaPair | **on** / off | After the latch carry laser + lightning (the gun goes) / keep the gun. |
| ffaCounters | **on** / off | Per-archetype counter advice (counters.js). |
| ffaRules | **on** / off | Dossier section 5 rules 1-10 and the D11 left-overs. |
| cxFinish | **on** / off | C1: finish rail on a 40-50% laser kiter that turned away. |
| cxKiterRamp | **on** / off | C2: kiter band ramp 70 / 100 m (module default 80 / 110). |
| cxBrawler | **off** / on | C3: LASER_BRAWLER archetype and the LB/dash sub-case. |
| ffaThirdFix | **on** / off | Rule 3: first shot at a busy wounded mech not held by stance. |
| ffaBreakFix | **on** / off | Rule 4: settle hidden, 20 m hidden relocation, 9 s unseen. |

## Results

**Suites** (taskset -c 0; tools/rc/out/):
- test_brain **85/85**: the 77 old checks with openFarm off, as before; 6 pass2b checks; 2 rc checks.
- test_world **39/39**.
- test_counters **15/15**.
- test_requests (the prototype's request tests adapted to the live bot) **12/12**.

**SQUAD identity with every pass 2b switch off** (tools/rc/identity_rc.sh, core 1; snapshot bot_pass2a against
bot/lib with pass2b=off): **14/14 byte-identical**.
- Streams: kit, long4800, long11, long23p, each in squad and auto, incl. the post-latch part.
- Simulator matches: squad seeds 1-6, scores 10/8/3/4/2/1.
- Fuse 0, errors 0.

**check2b scenarios rerun** (tools/check2b/scen.js on the new code):
- R1a, R1b x2, R2 x3, R3, C1, farm-first x4 and rule 4: all PASS.
- Rule 3 printed FAIL only because it found 2 spots where it requires 3:
  - The checker edited the spot filter at 10:39, after its recorded run, so seeds 5001-6600 now give spots 5967 and
    6543. 5316 is no longer found.
  - The output is byte-identical on the pre-fix code (tools/rc/out/scen_rule3_prefix.txt).
  - Every spot found passes all five sub-checks (3239 in 3001-3600; 5967; 6543). Group pass2b's own rule 3 check passes.

**Simulator sanity** (taskset -c 0,1, information only, no gating; tools/rc/out/sanity_rc.txt):
- 6 squad matches: 6/5/2/4/1/2 (mean 3.33, same as pass 2b); 0 latches.
- 4 FFA matches, seeds 11-14: 15/14/14/7 (mean 12.5); latched 4/4 at 24-28 s.
- Errors 0, stuck 0, fuse 0, zone deaths 0; slowest decision 5.7 ms.

**package.sh:**
- Hygiene clean.
- Conformance with the map: PASS, 300/300 in time, max 3.1 ms, init 2284 ms.
- Conformance without the map: PASS, max 5.8 ms.

**Release gate** (`GATE_WAIVE=H9-method-exposure tools/release_gate.sh dist`; runs/gate_20261121T105343Z and
runs/gate_20261121T105444Z): **GO, 35 PASS, 1 waived**, in both runs.

| Check | Run 1 | Run 2 |
|---|---|---|
| R3 answer time under the 1-CPU quota | p99 3.4 ms, max 7.2 ms | p99 3.3 ms, max 4.0 ms |
| R10b long run (late of 3939, p99, max) | 0, 5.12 ms, 24.92 ms | 0, 5.11 ms, 26.83 ms |

Other checks in both runs:
- R2 ready in 2447 ms (run 1).
- R11 determinism and R11b bundle = source: PASS.
- P6: all 9 engine settings present.
- P11: bot.js is byte-identical to a fresh bundle of bot/.
- H1-H8: PASS (files, team names, scores, no comments, README, MIT).

## Known limitations

1. **R1b: some deaths are never detected.** A death beyond 42 m that happens while our torso looks elsewhere gets no
   death record. In the prototype geometry (67 m) nothing is taken. If we later look there, the drops are still
   collected as ordinary loot (cubes 60-70 m, laser 60 m mid-fight, pickups 120 m when quiet), without the rush bonus.
   Not fixed: the change would have to infer deaths from sounds, with a false-death risk.
2. **R1b rush rules.** A healthy survivor that already faces us when the death happens still blocks the rush. Once we
   are committed, its fire does not stop the rush; only path time, our hp below 50% or LOSING do.
3. **Farm-first default (`on`).** A mech that only aims at us inside 100 m is not answered: we break the line and answer
   its first hit. The dossier prefers `d0`; the addendum treats both as unmeasured one-change candidates.
4. **Uncalibrated simulator.** It rates the defaults below "switches off" in SQUAD: 3.3 against 4.0-4.7 (pass 2b), 3.1
   against 4.4 (check2b). This is information only; the owner set no simulator gating.
5. **Timing.** Long runs under the quota show single spikes of 25-35 ms (0 late answers, p99 about 5 ms).
6. **Other open items.**
   - aimCal is off.
   - The R2 late sweep keeps a calm mech in view on fewer decisions: 46/120, against 68/120 with R2 off.
   - Rule 4 dev-simulator spots 401, 402 and 404 end through the finish exemption before cover is reached.
   - test_brain with TB_SELECT='{}' fails 19 old fight-before-75 s scenarios, by design.
7. **Not automatable here.** The docker build on linux/amd64, the scorer's check under Docker, the public-repository
   and entry-choice steps (notes/compliance_check.md).

## Reproduce

```
cd P && for s in test_brain test_world test_counters test_requests; do taskset -c 0 ./bun tools/$s.js; done
taskset -c 0 ./bun tools/test_brain.js --only=rc
cd tools/check2b && taskset -c 0 ../../bun scen.js --only=r1b && taskset -c 0 ../../bun scen.js --only=openfarm
CORE=1 bash tools/rc/identity_rc.sh
bash tools/package.sh && GATE_WAIVE=H9-method-exposure bash tools/release_gate.sh dist
```

Submission (owner's "go" only, HANDOFF step 5):
1. Copy dist/* into /home/user/kranti-hackathon.
2. Run the hygiene grep and the release gate.
3. Commit with a neutral message, then push.
4. Log the submission in notes/submissions.md.
