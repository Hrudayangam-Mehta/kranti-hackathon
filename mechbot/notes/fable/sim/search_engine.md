# Brute-force tactics search engine (Fable panel, target 9) — search engineer, Sun 22 Nov about 02:20 UTC

One author, no sub-agents, no independent review. No git, no server access, nothing pushed. Tags: [S] simulator,
[M] official score from notes/submissions.md, [C] read in code, [A] analysis.
Files: `scratchpad/fable_work/simcal/search/` (driver `search.py`, space `space.json` built by `make_space.py`,
calibration `calib_cands.json` / `calib_report.py` / `calib24_report.txt`, run logs `runs/<name>/log.jsonl`,
work folder `wb/` = symlinks bot -> variants6/FNV_s1/bot, kit, notes, replay, tools + a copy of sim).

## 0. Headlines
1. The engine works: 10 candidates through successive halving 12 / +24 / +48 seeds in 873 s (408 matches), base twice
   on 12 seeds identical. Throughput was 0.47-0.50 matches/s with 3 jobs because the machine ran at load 23-34 on
   4 cores (other panels). On a quieter machine one job did 12 seeds in 12.2 s, so about 3 matches/s with 3 jobs.
2. Calibration is bad, and this is the main finding [S vs M]. 20 official builds replayed as overrides on the 5.38
   base, 24 paired seeds: of 19 with an official delta, the simulator's sign is right for 1, wrong for 6, and exactly
   zero for 12. Correlation of official delta with simulator delta: Pearson -0.61, Spearman -0.53. The two largest
   simulator "gains" (LG wide +0.46, KS aggr off +0.29) are official losses (-0.34, -0.25).
   Caveat [A]: the base is the official maximum, so every official delta is <= 0 by selection; that biases the sign
   count against the simulator, but not the negative rank correlation among the builds.
3. Consequence for the goal of 9: a simulator ranking of +-0.1 to +-0.5 must not choose a submission. The engine is
   usable only as (a) a detector of very large effects (a change worth +1 or more per match is 2.5 se at 12 seeds and
   6 se at 84) and (b) a filter for inert and crashing candidates. No such large effect appeared in the smoke run.
   Simulator base level is 4.23 +- 0.25 (84 seeds; best single match 12) against 5.38 official: the level is off too.
4. Earliest sign of failure, stated as asked: the one-change parameter space gives |delta| below 0.15 on 84 seeds
   for the two finalists. Parameters of this brain do not hold +3.6 per match; 9 needs a structural change, and the
   simulator cannot currently confirm one below about +1.

## 1. Usage
```sh
cd /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/simcal/search
python3 -I make_space.py                 # rewrite space.json
python3 -I search.py check-space         # every base value against the variant's resolved params (must print mismatches 0)
python3 -I search.py run --name oat1 --gen oat                      # all 103 one-change candidates
python3 -I search.py run --name rnd1 --gen random --n 60 --kmax 3 --rng 7   # random 1-3 parameter combinations
python3 -I search.py run --name my --gen file --file cands.json     # [{"desc": "...", "ov": {"key": value}}]
python3 -I search.py run --name confirm --gen file --file top.json --stages 96 --keep 1 --seed0 1001 --no-stop   # holdout
python3 -I search.py report --name oat1  # final table again
python3 -I calib_report.py calib24       # simulator delta against official delta
```
Options: `--stages 12,24,48` (seeds added per stage, total 84), `--keep 0.3334` (fraction of the stage's entrants
that go on), `--chunk 12` (seeds per simulator process; the early-stop test runs after each chunk), `--seed0 101`
(search seeds 101-184; seeds 1-48 are left for calibration, 1001+ for holdout), `--jobs` (capped at 3),
`--fuse off|keep`, `--no-stop`.
Each batch is `nice -n 19 bun sim/run.js --bot ours --mode squad --seeds ... --jobs 1 --overrides <file> --json <file>`
in `wb/`, with the single-thread JSC flags of fable_work/out/simrun.sh. To search on another base, repoint `wb/bot`
and rerun make_space / check-space (the base cache is keyed by the variant path).

Rules the driver applies:
- Paired seeds: delta = candidate score - base score on the same seed (score = 16 - place = house bots dead before
  us). The base is run once per seed and cached (`base_cache_fuse*.json`).
- Early stop after each chunk, from 12 seeds: `inert` when every match equals the base (place, kills, time alive,
  damage dealt / taken, cause), `stopped` when the mean delta is below -2 se.
- Stage end: survivors ranked by mean delta, the best ceil(keep x entrants) continue, the rest are `cut`.
- A batch with a fuse trip, a brain error, a fallback answer or a missing seed is discarded and rerun (2 retries),
  then marked `failed`. Start of every run: base twice on the first chunk (`determinism` record).
- Log records (JSONL): start (all candidates with overrides), batch (per-match rows), discard, cand (running paired
  statistics), stage_end, determinism, fuse_equivalence, final (ranking + throughput).

Fuse handling [C][S]. The brain's fuse (`fuseMs` 30, brain.js 271) is its only wall-clock branch (the deadline only
feeds a counter; `lates` of an in-process bot is a counter). At nice 19 on this loaded machine it tripped in nearly
every batch: the first smoke attempt with the plain discard rule finished 1 candidate of 10 in 9 minutes (28 discards,
kept in runs/smoke10_fusekeep_loaded). Default is therefore `--fuse off`: every batch runs with override
`fuseMs 1e9`, which is the trajectory of a run in which the fuse never trips. Checked: base on seeds 101-112 with the
real fuse and 0 trips (quiet machine) = base with the fuse off at load 25, all 12 fingerprints; and again inside the
calibration run (seeds 1-12: identical). `--fuse keep` restores the literal discard-and-rerun rule (also discards on
late answers); use it only on an idle machine. The copied sim/run.js has one added line: fuse, overruns and brain
errors in the match record. mechbot/sim is untouched.

## 2. Smoke run (runs/smoke10, 10 random one-change candidates, rng 1) [S]
```
determinism check (base twice on 12 seeds): identical
fuse-off equals a trip-free run with the real fuse (12 seeds): not testable now (the real fuse tripped under load)
stage 1: seeds 101-112, entered 10, kept 4, 349 s
stage 2: seeds 113-136, entered 4, kept 2, 258 s
stage 3: seeds 137-184, entered 2, kept 2, 265 s
id     status   st    n  dScore     se      t  dif  up  dn  dKills  change
c0001  final     3   84  -0.024  0.157  -0.15   47  17  12  -0.024  gunFlightMax={"gunFlightMax":0.9}
c0004  final     3   84  -0.059  0.199  -0.30   57  16  21  -0.071  grab={"grabCubeHi":110,"grabCubeLo":70}
c0007  cut       2   36  -0.083  0.256  -0.33   26   5   9  -0.083  gunFlightMax={"gunFlightMax":0.4}
c0006  cut       2   36  -0.139  0.334  -0.42   35  11  11  -0.167  strafe={"strafeLo":0.6,"strafeHi":1.3}
c0003  cut       1   12  +0.250  0.179  +1.39    4   2   0  +0.250  upgradeOrder=order4
c0002  cut       1   12  +0.000  0.389  +0.00    8   4   2  +0.000  seek={"seekOn":false}
c0005  cut       1   12  +0.000  0.408  +0.00    7   3   1  +0.000  gunBackStick={"gunBackStick":0.4}
c0008  inert     1   12  +0.000  0.000  +0.00    0   0   0  +0.000  aggr={"aggrHpf":0.6,"h50SeekHpf":0.6}
c0009  inert     1   12  +0.000  0.000  +0.00    0   0   0  +0.000  killSecureHits={"killSecureHits":5}
c0010  inert     1   12  +0.000  0.000  +0.00    0   0   0  +0.000  chase={"chaseHpf":0.7,"chaseS":10}
throughput: {"wall_s": 873.0, "matches": 408, "batches": 35, "discarded_batches": 1, "matches_per_s": 0.467, "batch_wall_sum_s": 2230.8, "jobs": 3, "load": [23.35888671875, 23.814453125, 20.64208984375]}
```
Readings: 3 of 10 inert in 12 matches (aggr 0.6, killSecureHits 5, chase 0.7 / 10). The four that led after 12 seeds
all fell back to about zero with more seeds: stage-1 leaders are mostly noise, which is what halving is for.
Per-match sd of a paired delta is about 1.4-1.8 for a candidate that changes half the matches; se 0.16-0.20 at 84
seeds. Cost per candidate: 12 matches to reject, 84 for a finalist; a 103-candidate sweep is about 103 x 12 +
35 x 24 + 12 x 48 + 84 = 2,736 matches = about 95 minutes at 0.47 matches/s, about 15 minutes at 3 matches/s.

## 3. Calibration (runs/calib24: 20 official builds as overrides on the 5.38 base, seeds 1-24, no early stop) [S vs M]
"exact" = the build's folder has the same code as the base and only parameters differ; "port" = an older code tree
whose parameters are replayed on the base code (the trees were officially identical for KS / KB).
```
base: n 24, sim mean score 4.042 (official 5.38)
build          exact   n    sim d     se      t  dif  official  sign
FSL10_s1         yes  24   +0.000  0.000  +0.00    2     -0.03  sim 0
G10C10FT3_s1     yes  24   +0.000  0.000  +0.00    1     -0.03  sim 0
G10C10_s1        yes  24   +0.000  0.000  +0.00    1     +0.00  tie
G05_s1           yes  24   +0.000  0.000  +0.00    2     -0.03  sim 0
G10FT3_s1        yes  24   +0.000  0.000  +0.00    2     -0.05  sim 0
FSL15C10_s1      yes  24   +0.000  0.000  +0.00    2     -0.05  sim 0
FSFT3_s1         yes  24   +0.000  0.000  +0.00    3     -0.05  sim 0
FSLCL15_s1       yes  24   +0.000  0.000  +0.00    3     -0.07  sim 0
FSF30_s1         yes  24   +0.000  0.000  +0.00    3     -0.07  sim 0
FSOH_s1          yes  24   +0.000  0.000  +0.00    3     -0.09  sim 0
FHE40_s1         yes  24   -0.208  0.170  -1.23    5     -0.09  ok
FSLC_s1          yes  24   +0.083  0.083  +1.00    6     -0.09  WRONG
FSLC20_s1        yes  24   +0.125  0.092  +1.37    6     -0.11  WRONG
FSLS35_s1        yes  24   +0.042  0.095  +0.44    6     -0.13  WRONG
K7_s1            yes  24   +0.000  0.135  +0.00   18     -0.15  sim 0
K7LG_s1          yes  24   +0.458  0.330  +1.39   19     -0.34  WRONG
KF_s1           port  24   +0.167  0.155  +1.07   18     -0.25  WRONG
K6LX_s1         port  24   +0.000  0.135  +0.00   18     -0.19  sim 0
KBH_s1          port  24   +0.000  0.135  +0.00   18     -0.36  sim 0
KS_s1           port  24   +0.292  0.153  +1.90   19     -0.25  WRONG
builds with an official delta != 0: 19; sim sign right 1, wrong 6, sim exactly 0: 12
Pearson r -0.61, Spearman rho -0.53 over 20 builds (official delta against sim paired delta)
sim |delta| mean 0.069, typical se 0.074; official |delta| mean 0.121
```
What it means: nine official changes of 1-4 kills leave all 24 simulated scores unchanged (they change 1-3
simulated matches without moving a place); three larger official losses (7-17 kills: K7, K6LX, KBH) change 18
simulated matches and net exactly zero; and where the simulator does move, it moves the wrong way in 6 of 7. The simulator's
squad dies in the same fight whatever we tune near the retreat gate. Until a calibration set shows a positive rank
correlation, simulator deltas are counts, not rankings. What would raise trust: per-match official results (not
available: the server reports one mean), or house-bot table changes (`--params`) that make this calibration set come
out positively correlated; that is the calibration engineer's lane, and this driver's `calib_cands.json` +
`calib_report.py` are the test to rerun after each house-table change (about 18 minutes at today's load).

## 4. Parameter space (space.json: 39 parameters, 65 brain keys, 103 one-change candidates)
All keys are read at decision time in the SQUAD posture of the 5.38 SELECT [C]. Excluded on purpose: init-only and
timing keys (warmup, rehearseN, rngSalt, salt, fuseMs, anchorCfg, warmPocket, pocketCfg, pathExpand), the timing
model (latency, tickS, io*: tuning them fits the simulator's clock, not the server's), FFA-only keys (ffa*, cx*,
final-point / Z rules, fb), keys dead under this SELECT (pulse pl*, hunt50 h50* other than the seek's, fc* focus-add
costs, laserBackOff which no code reads), and loseCoverNear false / loseExit / healDoc on (official losses of 7-17
kills, kept only in the calibration set).
Tied keys move together (a value is a partial object merged over the entry's base).

| # | param | group | base (5.38 build) | values tried (each merged over the base) | note |
|---|---|---|---|---|---|
| 1 | laserBand | range | rPrefLaser 150, laserLo 125, laserHi 185, laserBoostAway 90 | rPrefLaser 115, laserLo 100, laserHi 130, laserBoostAway 70 / rPrefLaser 130, laserLo 110, laserHi 160, laserBoostAway 80 / rPrefLaser 170, laserLo 145, laserHi 195 / rPrefLaser 190, laserLo 160, laserHi 215, laserBoostAway 100 | stand-off band with a laser (m); mid = official preset |
| 2 | gunBand | range | rPrefGun 75, bandLo 55, bandHi 95 | rPrefGun 55, bandLo 40, bandHi 75 / rPrefGun 65, bandLo 48, bandHi 85 / rPrefGun 90, bandLo 65, bandHi 110 / rPrefGun 105, bandLo 80, bandHi 125 | stand-off band gun / lightning only (m) |
| 3 | gunBackStick | range | gunBackStick 0.7 | gunBackStick 0.4 / gunBackStick 1.0 | back-pedal strength inside the band |
| 4 | rush | range | rushR 28, rushHpf 0.5 | rushHpf 2 / rushR 40 / rushHpf 0.3 | lightning rush without a laser; rushHpf 2 = never |
| 5 | isoNear | range | isoNear 0 | isoNear 12 / isoNear 25 | isolate branch only near the goal cell (ISO) |
| 6 | gunFlightMax | fire | gunFlightMax 0.55 | gunFlightMax 0.4 / gunFlightMax 0.7 / gunFlightMax 0.9 | longest bullet flight we shoot at (s) |
| 7 | gateK | fire | gateK 1.0 | gateK 0.8 / gateK 1.25 / gateK 1.5 | gun aim gate width |
| 8 | laserGateK | fire | laserGateK 0.6 | laserGateK 0.4 / laserGateK 0.8 / laserGateK 1.0 | laser release gate width |
| 9 | laserForceS | fire | laserForceS 1.5 | laserForceS 0.5 / laserForceS 1.0 / laserForceS 2.5 | hold of a full charge before a forced release (s) |
| 10 | reload | fire | reloadAmmo 4, noReloadHp 300 | reloadAmmo 2 / reloadAmmo 6 / noReloadHp 500 | early reload rule |
| 11 | headAimGun | fire | headAimGun false | headAimGun true | gun at the highest clear body point |
| 12 | strafe | evade | strafeLo 0.8, strafeHi 1.6 | strafeLo 0.45, strafeHi 1.15 / strafeLo 0.6, strafeHi 1.3 / strafeLo 1.1, strafeHi 2.2 | jink period range (s); fast = official preset |
| 13 | dodgeHorizon | evade | dodgeHorizon 0.9 | dodgeHorizon 0.6 / dodgeHorizon 1.2 | bullet dodge look-ahead (s) |
| 14 | dodgeWeight | evade | dodgeWeight 0.9 | dodgeWeight 0.6 / dodgeWeight 1.0 | bullet dodge weight |
| 15 | laserReactRad | evade | laserReactRad 0.25 | laserReactRad 0.15 / laserReactRad 0.4 | aim cone that counts as a laser charging at us |
| 16 | laserHide | evade | laserHideWalk 6, laserHideBoost 9 | laserHideWalk 0, laserHideBoost 0 / laserHideWalk 10, laserHideBoost 15 / laserHideWalk 14, laserHideBoost 22 | reach of the beam-hide step (m); 0 = never hide from a charge |
| 17 | boostSpend | evade | boostSpend true, bsEnergy 30, bsDodgeEnergy 25, bsHurtS 1.0 | boostSpend false / bsEnergy 15, bsDodgeEnergy 10 / bsEnergy 50, bsDodgeEnergy 40 / bsHurtS 2.5 | boost in FIGHT while charging / dodging / under fire |
| 18 | wFinish | target | wFinish 2.0 | wFinish 1.3 / wFinish 3.0 / wFinish 4.0 | weight of a finishable target |
| 19 | wAttacker | target | wAttacker 1.6 | wAttacker 1.0 / wAttacker 2.4 | weight of the mech hitting us |
| 20 | wNoLos | target | wNoLos 0.5 | wNoLos 0.25 / wNoLos 0.8 | weight of a target without a line |
| 21 | keepTargetHpf | target | keepTargetHpf 0.25 | keepTargetHpf 0.15 / keepTargetHpf 0.4 | stay on a target under this hp fraction |
| 22 | killSecureHits | target | killSecureHits 3 | killSecureHits 2 / killSecureHits 5 | finishable = hp within this many gun hits |
| 23 | focusAdd | target | focusAdd false | focusAdd true | additive focus cost (official preset focus add) |
| 24 | chase | target | chaseHpf 0.5, chaseS 6 | chaseHpf 0.3, chaseS 3 / chaseHpf 0.7, chaseS 10 | chase a target that broke the line |
| 25 | finTtk | target | finTtk false | finTtk true | FINa: finish by time-to-kill (official preset finish ttk) |
| 26 | aggr | engage | aggrHpf 0.7, h50SeekHpf 0.7 | aggrHpf 0.5, h50SeekHpf 0.5 / aggrHpf 0.6, h50SeekHpf 0.6 / aggrHpf 0.85, h50SeekHpf 0.85 | start / seek fights from this hp fraction (any70f) |
| 27 | earlyOpenS | engage | earlyOpenS 20 | earlyOpenS 0 / earlyOpenS 10 / earlyOpenS 35 | opening guard (s) |
| 28 | eng | engage | engNearR 60, engAimR 190 | engNearR 40 / engNearR 90 / engAimR 120 / engAimR 240 | engaged-candidate clause radii (m) |
| 29 | seek | engage | seekOn true, h50CrowdR 60, h50SeekFromS 20, h50ArriveLaser 125, h50ArriveGun 90 | seekOn false / h50CrowdR 120 / h50SeekFromS 40 / h50ArriveLaser 150, h50ArriveGun 110 | prey seek |
| 30 | farmHp | engage | farmHp 0.9 | farmHp 0.5 / farmHp 0.7 | farm crates / drones above this hp fraction |
| 31 | lcGate | survive | lcCoverS 0, lcLowHpf 0 | lcLowHpf 0.1 / lcCoverS 1.0, lcLowHpf 0.05 / lcCoverS 1.5, lcLowHpf 0.1 / lcCoverS 1.5, lcLowHpf 0.25 | LOSING retreat gate; base = never. Values 3, 4 = official FSL10 (5.35) and FSLC (5.29) |
| 32 | loseThr | survive | lose1Hpf 0.35, lose2Hpf 0.5, lose3Hpf 0.6 | lose1Hpf 0.2, lose2Hpf 0.25, lose3Hpf 0.3 / lose1Hpf 0.45, lose2Hpf 0.65, lose3Hpf 0.8 | LOSING thresholds; INERT at the base (lcGate never): live only together with an lcGate value |
| 33 | finish | survive | finishHpf 0.2, finishThreats 2 | finishHpf 0.3 / finishThreats 3 / finishHpf 0.35, finishThreats 4 | finish override of LOSING; mostly inert at the base |
| 34 | lastStand | survive | lastStandHpf 0.25, lastStandAttackers 2 | lastStandHpf 0.35 / lastStandHpf 0.15 / lastStandAttackers 1 | doomed -> FIGHT rule |
| 35 | healEnterHp | survive | healEnterHp 0.55 | healEnterHp 0.3 / healEnterHp 0.4 / healEnterHp 0.7 | HEAL out of contact below this; 0.40 = official FHE40 (5.29) |
| 36 | healExit | survive | healExit 0.7 | healExit 0.55 / healExit 0.85 / healExit 1.0 | leave HEAL at this hp fraction |
| 37 | grab | econ | grabCubeHi 70, grabCubeLo 40, grabHpf 0.5 | grabCubeHi 40, grabCubeLo 20 / grabCubeHi 110, grabCubeLo 70 | cube grab radius in a fight (m) |
| 38 | grabLaserWide | econ | grabLaserWide false | grabLaserWide true | LG wide (official K7LG: -9 kills) |
| 39 | upgradeOrder | econ | first: plating, armor, nanites, laser_damage, ... | first: plating, armor, servos, nanites, ... / first: laser_damage, laser_charge, gun_damage, gun_rate, ... / first: nanites, plating, armor, laser_damage, ... / first: gun_damage, gun_rate, plating, armor, ... | upgrade pick order: speed (official preset), damage first, regen first, gun first |

## 5. Limits and what I did not do
- No full sweep was run (the smoke and the calibration used the hour at this load). The 103-candidate sweep and a
  random-combination run are one command each.
- With many candidates the winner is biased upward; every finalist needs the holdout command (fresh seeds 1001+)
  before anyone quotes its delta. Even then section 3 applies: a confirmed simulator gain is not an official gain.
- upgradeOrder values are four orders I wrote, not a search over orders.
- The search metric is the simulator's score against its own house-bot stand-ins (base 4.23 against 5.38 official).
