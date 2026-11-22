# Panel R7, round 1: game designer and mechanics analyst (lens `game`)

Written Sat 21 Nov, about 21:30-22:10 UTC. I read `variants/V4/bot` and `bot/` only (no edits). Inputs: the brief, kit
protocol and README, `rules_audit.md`, `hello_example.json` (the config), `panel_r5_design.md`, `panel_r6_rewards.md`
(RW), `build_spec_r5.md`, `build_spec_r6.md`, `owner_requests_r6.md`, `measured_deltas.md`, `submissions.md`, and the
V4 ledger dump `tools/panel_r6/d_v4.json`.

New scratch, all under `tools/panel_r7/game/`:
- `arc.js`: a behaviour-only arc logger for the simulator. For each match it records the tier and time of every house
  death before ours, our death (time, zone phase, killer, hunters assigned), and per-decision state by our kill count.
- `zone_arith.py` and `zone_arith_out.txt`: zone anchors as fractions of the config's schedule, plus the geometry of
  the first rotation.
- outputs `arc_2_13.txt`, `z_v4.txt`, `z_late.txt`, `arc_*.json`.

All runs used `taskset -c 2`. The simulator is used for behaviour only and never for ranking.

Tags: [M] official result, [T] a 6+ bot's choice, [S] our simulator (behaviour only), [A] arithmetic/model,
[N] no evidence. τ = t / (sum of `hold_s + shrink_s` over `config.zone.phases`), which is 415 s by default.

---

## 0. Verdict in brief

1. **For us a practice match is a phase-1 match.**
   - We die at τ 0.175 [S, 13/13 deaths in phase 1; mean 72.6 s] and about τ 0.19-0.24 officially [M+A: 4.97 at
     about 80-100 s].
   - Drop 1 lands at τ 0.229, right at our death. Drops 2-3, phases 2-6 and "few remain" never happen.
   - Every house death before ours is our kill [S 49/49; zone deaths need phase 3 or later].
   - So the practice score is the number of hunters we convert before the pile-up converts us: four easy, then
     mediums. 4.97 is about 4 easy + 1 medium. The 5.8-5.9 cut needs about 2 mediums.
2. **Points are lost in the escalation fight we die in** (k = 3-5, 2-7 hunters assigned, median 4 [S]).
   - We enter it with 44-64% hp [S per-k hp].
   - We are gun-only in 82-85% of decisions until k = 3 [S]. Lasers come late, from kill drops.
   - Not losses: the opening (nothing can hurt us), the phase-1 rotation (section 1.3: it moves intake, it does not
     add any), drops, and the late game.
3. **Risk factor: r is the cheapness of hp now** (section 3).
   - Formula: r = (1 - q) x g(hp) x w(power), plus a short after-kill bonus and an early bonus.
   - q is the chance that the next fight has 2+ lines, from house deaths and live lines (RW's lambda_hp(k)).
   - Measured, r falls from about 0.75 at spawn to about 0.1-0.3 by k = 3.
   - Nine monotone, bounded maps onto V4 keys. Each in-contact map is one-sided, so a low r never ends a fight
     earlier than V4 does. The evidence says leaving fights loses: A25 -1.10, A06 -0.60, RW far-cover exits -0.17 x 1.5.
   - `risk: 'off'` returns the raw `P[key]` (byte-identical).
4. **Expected deltas.**
   - Practice: +0.05 (-0.15..+0.20) [A], with all of it out of contact and in escalation.
   - The final is where the owner's schedule really lives: lives span all six phases and 16 -> 1 alive. There r
     replaces the fixed clocks with alive count and crowding [N on value; matches the recorded winners' profile, R5 1.8].
5. **The owner's schedule, piece by piece.**

   | Piece | Practice | Final |
   |---|---|---|
   | Early: farm and grab power | small (V4 already does it) | yes |
   | Mid: push isolated hunters | small. The gain is finishing, not opening; extra opening was punished: A12 -0.37, R11 -0.29, A23 -0.18 | only as vulturing |
   | Late: survive to the collapse | never reached | yes |
   | FFA: conservative until the latch, then by alive count | inert | yes |

---

## 1. The match arc as V4 lives it (practice, default config)

### 1.1 Timeline

| Stage | τ (t) | What the config does | What V4 does [S unless tagged] | Points |
|---|---|---|---|---|
| Spawn | 0 | 16 mechs at least 130 m apart within 0.8 x 560 m of the start centre; first circle 560 m holds until 60 s; 36 crates (about 27 ground), 40 floor weapons (1:1:1 mortar / laser / lightning), 12 drones | first 20 s under the opening guard (`earlyOpenS`, while no foreign death); farm at hp >= 50% (`farmHp` '50'); laser seek out to 240 m (`laserEcon`) | none at stake: first hurt at a median 32 s; we hit first at a median 18 s |
| Opening idle | 0-0.06 | vision is a 120° wedge to 200 m plus 45 m all round; loot is listed only while seen | at k = 0: **HOLD 44%**, LOOT 13%, FIGHT 42% of decisions (about 11 s idle per match); a laser in only 4 of 13 matches, at 2-28 s | power not bought: the cause is missing information, not a threshold |
| First hunter (easy) | 0.05-0.11 | weakest first, one hunter early [R] | one-line episodes: 221 hp per 0.75 kills, P(death) 0.06 [S RW] | won |
| Escalation | 0.09-0.22 | hunters about 1 + k (A2 model; the real rule is unknown) | P(2+ lines in the next fight) 0.34 / 0.55 / 0.64 / 0.88 after k = 0 / 1 / 2 / 3 [S RW]; entry hp 0.64 (k=2), 0.63 (k=3), 0.44 (k=4), 0.27 (k>=6); laser held 15-18% of decisions at k = 0-3, 96-100% at k >= 5 (kill drops) | **lost here** |
| First rotation | 0.115-0.265 (48-110 s) | shrink 560 -> 380 m at 3.6 m/s; 54% of spawns lie beyond 0.8 x 380 m of the next centre [A toy geometry] | D9 (`zoneNextFrac` 0.8, `zoneShrinkLead` 12) takes ZONE priority over FIGHT until we are inside 0.6 x the next radius (hard-coded): a walk of at least 76 m (6.5-8.4 s); ZONE is 9.8% of decisions before 115 s; 12% of mech intake (218 hp per match) is taken in ZONE mode; zone hp 0, never outside | about 0 (section 1.3) |
| Death | 0.175 [S] (official about 0.19-0.24) | | killed by a hunter in 13 of 13; hunters assigned 2-7 (median 4); death fights have 3.1 attackers, last 18.6 s and carry 1.7 kills [S RW] | the end of scoring |
| Drop 1 | lands 0.229 (95 s) | inside 0.7 of the next circle, where the squad parks | alive at landing in 5 of 40 matches [S RW]; measured chases -0.21 / -0.08 / +0.02 [M other teams] | about 0 |
| Phases 2-6, drops 2-3 | 0.265-1 | dps 35 / 60 / 100 / 160 / 260 | reached in 0 of 53 matches [S] | n/a |

### 1.2 Which house bots die before us, and why

- In the real squad the first hunters are the 4 easy bots [R]. The board reads that way:
  - 21 of the top 50 sat at 4.00-4.25 [M board, 04:25];
  - kyoto's 6.31 is about 2.3 mediums [A, R5].
- In the simulator, 23 of our 49 kills were not of the easy tier (7 of the 13 first kills) [S]. The cause is V4's
  `engaged()` clause (tactics.js:143-151: near <= 60 m, closing within 180 m, or aiming within 190 m), which opens
  fights with non-hunters walking by. The sim's non-hunters fight back only within 15 m.
- How real non-hunters react is unknown [N].
  - In favour of the clause: V1 - V2 +0.38 (fight early) [M].
  - Against it: G02 +0.23 for leaving idle house bots alone [M, another team's bot].
  - This is why the low-r end of map 1 trims the non-hostile clauses first.

### 1.3 The phase-1 rotation is not a practice lever (behaviour check)

Seeds 1-10, V4 against an arm with `zoneShrinkLead` 0, `zoneNextFrac` 0.95 and `zoneOuterFrac` 0.97 (a later
rotation) [S]:

| Measure | V4 | Late rotation |
|---|---:|---:|
| Mech intake taken in ZONE mode | 12.0% | 2.6% |
| Total mech intake per match (hp) | 1,813 | 1,752 |
| Zone damage | 0 | 0 |
| Time outside the zone | 0 | 0 |

- So the damage moves to other modes. The squad sets the intake rate, as R5 1.1 found.
- Scores were 3.60 / 3.30, which is noise and not a ranking.
- Verdict: no practice preset. Keep `zoneEsc` (R6) for the final only, and leave zone keys out of the practice maps.

### 1.4 Phases that lose the most points today, ranked

1. **The death fight in escalation** (k >= 3, 2+ lines, entry hp 44-64%). It costs the next 1-2 medium kills.
   - Already queued: ISO, LC, AVO (serialise lines) and FIN (convert near kills).
   - Section 3 adds the out-of-contact half: bring more hp into that fight. Heal higher only when the next fight will
     be multi-line, and do no drone farming at low hp: a drone hit resets regen, a crate hit does not
     [housebot_model].
2. **Gun-only through escalation.** Gun-only takes 540 hp per kill against 343 with a laser [S RW]; we hold a laser in
   15-18% of decisions at k <= 3.
   - LG `wide` and KD are queued.
   - r turns LG's fixed "t < 90 s" clock into a state rule (map 6).
3. **Opening idle** (HOLD 44% at k = 0).
   - The fix is information: R5's spawn sweep (`laserGrab: 'arm'`).
   - A zero-code variant is a 360° sweep inside the opening guard. Do not draw it alone: it changes the opening.
4. **Not worth slots in practice:** zone rotation (1.3), drops, late-game rules.

---

## 2. Side finding: the `upg: 'speed'` order buys jets for gun-only bots [S]

- Across 13 matches, 4 of 28 picks were `jets`. In 'speed' order it sits 7th, above `gun_damage` (9th) and `gun_rate`
  (10th).
- Laser upgrades cannot be drawn without a laser, so a gun-only offer of {jets, gun_damage, x} takes jets.
- Jets are worth about 0 in practice (boost drain -25%). gun_damage is +6-15% output [A, R5 1.5].
- Preset `upg: 'speedg'` = 'speed' with `jets` moved after `gun_mag`.
- Size: params only, 2 min. Gain +0.01..+0.03 [A]. Ride-along only; it never draws alone.
- **Moot on the leader KS**, which uses `upg: 'std'` (jets 16th). It applies only to a SELECT that keeps 'speed'.

---

## 3. The dynamic risk factor r (owner request 6)

### 3.1 Definition: r = how cheap hp is right now

RW prices hp at lambda_hp = P_m(k) x 0.0036 + (1 - P_m(k)) x (0.0036 if hp < 30%, else 0.0002) pt/hp. Here P_m(k) is
the chance that the next fight has 2+ attackers. One minus the normalised shadow price is a natural risk appetite.
It needs no wall clock: every input comes from the observation or the config.

| Input | Read from | Term |
|---|---|---|
| House deaths k | `config.match.mechs - obs.alive` | q_k = 1 - 0.66 x 0.72^k. This fits the RW ledger: 0.34 / 0.53 / 0.66 / 0.75 / 0.82 at k = 0-4. Refit if the official escalation differs (A2) |
| Live lines | `B.nLos` (mechs with a line of fire on us, last 1 s) | q = 1 if nLos >= 2, else q_k |
| Hunters active | estimate min(alive - 1, 1 + k) and the live hostile count (`tr.hostile`) | enter through q (lines); used for logging only |
| hp | `me.hpf` | g = clamp((hpf - 0.30) / 0.40, 0, 1). RW: entry above 40% changes nothing with one line; below 30% hp is scarce |
| Loadout, cubes, upgrades | `me.laser`; `min(cubes, stat_cap) / stat_cap`; plating / armor counts from `self.upgrades` | w = min(1.5, 1 + 0.25 laser + 0.15 cubes/cap + 0.10 (EH - 1)), with EH = 1.15^plating / (1 - 0.08 armor) |
| Recent outcomes | our `kill` event within 8 s with nLos <= 1; hp lost in the last 3 s | kb = +0.15 (corpse run and lull: kill-drop grab U +0.23 [T kyoto 56/84 cubes]); taking more than 25% of max hp in 3 s zeroes kb |
| Match clock and zone phase | τ (config); phase index from cumulative `hold_s + shrink_s` (or `obs.zone.next_radius` against the config radii) | e = 0.10 x clamp(1 - τ / 0.05, 0, 1) while k = 0 and nLos = 0 (grab power before the first hunter). The phase enters only the FFA branch |

The formulas:

```
SQUAD posture (practice, and the final before any FFA clue):
  r = clamp((1 - q) * g * w + kb + e, 0, 1)
  r_entry = r latched at the first decision of a contact episode
            (episode = nLos >= 1 or hurt, after >= 3 s without either; RW ledger definition)
  In-contact maps read r_entry, so falling hp cannot feed back into a retreat. Out-of-contact maps read the live r.

FFA clue before the latch (B.foreignDeaths >= 1, env still SQUAD):
  r = min(r, 0.15)
  Practice-inert: 49 of 49 house deaths before ours are our kills [S].

FFA posture (latched, D12):
  r = clamp(base(alive) * g * crowd + fin, 0, 1)
  base = 0.20 at 16-12 alive, 0.45 at 11-6, 0.25 at 5-3, 0.50 at 2 (ffaTwo's E rule still decides at 2)
  crowd = 1 / 0.55 / 0.30 for 0 / 1 / 2+ non-hostile mechs within 60 m
          (R5 1.8: deaths per minute 0.36 / 2.02 / 4.58)
  fin = +0.25 while a finishable target has our line (winners aim 47% of hits at targets under half hp)
```

Measured trajectory of r on V4's own states (SQUAD posture) [S per-k hp and laser shares, A]:

| Moment | r |
|---|---:|
| Spawn | 0.76 |
| k = 1, 84% hp, gun only | 0.47 |
| k = 2, 64% hp | 0.29 |
| k = 3, 63% hp | 0.21 |
| k = 4, 44% hp | 0.06 |
| Any moment with 2+ lines | 0 (in-contact keys hold r_entry) |

### 3.2 The maps

hinge+(r) = max(0, r - 0.6) / 0.4 and hinge-(r) = max(0, 0.4 - r) / 0.4. Every map is monotone and bounded.
"One-sided" means the map moves only toward fighting on.

Each map is anchored at the base value of the SELECT it is stacked on:
- under V4, the values in the table are V4's;
- under the 21:44 leader KS (V4 + K0 items + seek, 5.19 [M]), only `farmHp` (0.9) differs among the scaled keys;
- every map returns the base for r in [0.4, 0.6].

| # | Threshold | Code site (V4) | Keys (V4 value) | Map | Range | Direction and bound reason |
|---|---|---|---|---|---|---|
| 1 | Engage gate (non-hostile mechs; D0 hostiles are always answered) | tactics.js:143-151 `engaged()` | `engNearR` 60, `engLowR` 160, `engCloseR` 180, `engAimR` 190 (`engR` 240 stays the cap) | x (1 + 0.15 hinge+ - 0.25 hinge-), live r | x0.75..x1.15 | up is capped by A12 -0.37, R11 -0.29, A23 -0.18 [M]; down follows G02 +0.23 [M] |
| 2 | Retreat (LOSING) | tactics.js:336-343 `losing()` | `lose1Hpf` 0.35, `lose2Hpf` 0.5, `lose3Hpf` 0.6 (`lose6` 6 unchanged) | minus 0.08 hinge+(r_entry); **one-sided** | -0.08..0 | never raised: A25 -1.10, A06 -0.60 [M], RW far-cover exits; the floor (lose1Hpf >= 0.27) respects A05 -0.41 (low-hp hiding has value) |
| 3 | Heal break (between fights only; contact still ends HEAL as in V4) | tactics.js:383-391 `decideMode()` | `healExit` 0.7, `healEnterHp` 0.55 (`healAfterLoseHp` 0.9 unchanged) | exit 0.7 + 0.2 hinge-; entry 0.55 + 0.10 hinge-, live r | exit 0.7-0.9; entry 0.55-0.65 | small either way [S RW: exit 70 -> 90 changed 1 of 40 matches; M A03 -0.04, A21 -0.08]. **Dropped if R6 `heal: 'need'/'full'` is adopted** (no double scaling) |
| 4 | Farm hp gate, plus drones | economy.js:103 `chooseLoot` | `farmHp` (0.5 under V4, 0.9 under KS); new `riskDroneMin` 0.4 (drones only at r >= it) | base + (0.9 - base) hinge- - (base - 0.5) hinge+, live r | 0.5-0.9; equals the base on the dead band | RW: idling hurt +0.55 per 10 s beats a crate +0.16 and a drone +0.03; drone hits reset regen [housebot_model]. Under V4 it moves only at low r; under KS only at high r |
| 5 | Farm radius | economy.js:138 / 145 | `lootCratePath` 150, `lootDronePath` 170 | x (1 + 0.15 hinge+ - 0.40 hinge-), live r | x0.6..x1.15 | longer trips are negative: E05 -0.12, E09 -0.09, E15 -0.17 [M]; farming at all is positive: E01 +0.27, E04 +0.37, E12 -0.65 for none [M] |
| 6 | Laser and cube detours in contact | economy.js:183 / 201 / 207 `chooseGrab` | `grabLaserR` 60 (no laser held), `grabCubeHi` 70 (`killCubeR` 200 unchanged) | grabLaserR 60 + 70 clamp((r - 0.4) / 0.3, 0, 1); grabCubeHi x (1 + 0.15 hinge+ - 0.15 hinge-), live r | laser 60-130 m; cube x0.85..x1.15 | this is LG `wide` (130 m) as a state rule instead of a 90 s clock; [T x3] laser by 24-50 s; [M] L01 -0.11 for long walks |
| 7 | Supply-drop contest | economy.js:220 `chooseDrop` | `dropContestR` 60 (`dropMaxD`, `dropHpBase` unchanged) | x (1 + 0.5 hinge-), live r; **one-sided** | x1..x1.5 | a drop is a refill at low hp but a trap with company [A RW: +0.53 alone / -0.42 with one line]; about 0 in practice (drop 1 lands at our death) |
| 8 | Chase a target without a line | brain.js:451 `fightLegs` regain | `chaseS` 6, `chaseHpf` 0.5 | chaseS x (1 + 0.33 hinge+ - 0.5 hinge-); chaseHpf 0.5 + 0.1 hinge+ - 0.15 hinge-, read r_entry | 3-8 s; 0.35-0.6 | under shared vision a chase walks into the next hunter; G03 -0.09 [M] caps the upside; FIN (R5) owns near kills |
| 9 | Boost spending | brain.js:516-521 (P5) | `bsEnergy` 30, `bsDodgeEnergy` 25 | plus 15 hinge-(r_entry); **one-sided** | 30-45 / 25-40 | keeps energy for hide boosts (`boostReserve` 25) at low r; never below V4 (V1 - V3 +0.15 [M]) |
| x | Zone rotation | mover.js `zoneCheck` | `zoneShrinkLead`, `zoneNextFrac` | **excluded** | | section 1.3: intake does not change [S]; final only via R6 `zoneEsc` |

FFA-branch maps (latched FFA only; practice-inert by construction):

| # | Key | Map | Range |
|---|---|---|---|
| F1 | `ffaFarmClear` 150 | x (1 + 0.6 hinge-) | 150-240 m |
| F2 | `ffaHideHpf` 0.55 | + 0.15 hinge- | 0.55-0.70 (in the final, leaving is right: place, not kills; no shared vision) |
| F3 | `ffaQuietS` 90 (RB2-anchored) | x (1 + 0.5 hinge-) | 1-1.5 x the anchored value |
| F4 | `fdgR` 150, `dropContestR` | x (1 + 0.5 hinge-) | |
| F5 | `ffaThirdR` 120 | x (1 + 0.25 hinge+ - 0.25 hinge-) | 90-150 m |

How r is applied:
- `B.rk(key)` returns `P[key]` itself when `risk` is 'off', so there is no arithmetic on the V4 path.
- r never writes `P`. Amendment A1 (anchorToConfig) is untouched. An RB2-anchored key (F3) is scaled after anchoring,
  at its use site.

### 3.3 The owner's schedule, as r produces it (no fixed seconds anywhere)

| Stage | Detected by | Typical r (practice / FFA) | What moves | Helps |
|---|---|---|---|---|
| **Early: farm and grab power** | k = 0, no line, τ < 0.05 bonus | 0.70-0.80 / at most 0.15 once a foreign death is seen | farm radius x1.06-1.1; laser reach 130 m with no laser; engage gate x1.05-1.1 | both. Practice: small (V4 already farms at 50%; the real early gap is the sweep, 1.4 item 3). Final: farming while the nearest mech is beyond 150-240 m |
| **Mid: push isolated hunters** | 1 line, k 1-2, hp >= 70%, laser or cubes | 0.5-0.8 / 0.45 + 0.25 while finishable | engage x1.15 max; LOSING up to -0.08; chase up to 8 s | practice: small and positive only in the finishing form (FIN); opening more fights was punished (A12, R11, A23). Final: vulture finishes only |
| **Escalation (practice's real late game)** | k >= 3, or 2+ lines | 0-0.3 / n/a | out of contact: heal exit 0.8-0.9, farm gate 0.75-0.9, no drones, radius x0.6-0.75, drop contest x1.4; in contact: V4 (r_entry) | practice: this is where the stake is (entry hp into the death fight) |
| **Late: survive to the collapse when few remain** | 5 or fewer alive, or phase >= L-2 (radii from the config, as RB3) | never reached / 0.25 (5-3 alive), 0.5 at 2 with the E rule | no voluntary fights, farm clear x1.6, hide at 70%, drops only uncontested | final only |
| **FFA: conservative until the latch** | `foreignDeaths >= 1`, not latched | inert / at most 0.15 | engage x0.8, farm gate 0.8, heal exit 0.85 (plus V4's own 40 s opening) | final only |
| **FFA: then by alive count** | latched | n/a / 0.20 (16-12), 0.45 (11-6), 0.25 (5-3), 0.5 (2); x crowding | F1-F5 | final only |

### 3.3a Fit with the owner's 21:31 doctrine (KB = KS + `aggr: 'any70'`)

The owner's rule ("maximum reward when hp is above 70% and we cannot die in one hit") is a step map of hp alone. r
contains it: g(hp) = 1 from 70%, and the one-volley guard (h70g) belongs where r reads "cannot die in one hit".

What r adds is q, the line count of the next fight. At k >= 3 (q >= 0.75), "any listed mech is a candidate" opens a
new fight exactly when the next fight will be multi-line. The death fights already average 3.1 attackers [S].

Proposal, by KB's result against KS:
- d >= +0.15: map 1's high end becomes KB's clause (any listed mech) gated on r >= 0.6, instead of x1.15.
- d <= -0.15: map 1's up side is dropped.
- in between: map 1 stays as specified.

KB changed play in the simulator (8 seeds) [S, owner's note]. The draw is what decides.

### 3.4 Build, test, cost

- **Preset:** `risk: { off: { riskOn: false }, sched: { riskOn: true } }`. 'off' reproduces whatever SELECT it rides on
  byte for byte (V4, KS or KB), because `rk` returns the raw key.
- **Code:**
  - new `lib/risk.js`, about 60 lines: pure functions of B, P and cfg. It holds `computeR` (after `assess`, before
    `selectTarget`), the `r_entry` latch, `hinge`, and `rk`.
  - about 20 read sites change from `P.k` to `B.rk('k')`, at the lines listed in 3.2.
  - Inside the R5 firewall for the SQUAD maps: SQUAD, next radius > `zoneLateR`, alive > 3. The FFA maps apply only
    while `B.env === 'FFA'`.
- **Time:** 60-90 min of engineering plus 30 min of tests.
- **Tests:**
  - T1 identity at 'off': the 14 R3a2 streams and the FFA-inert set are byte-identical.
  - T2 every map, sampled at 101 values of r: monotone in its declared direction, inside its range, equal to V4 on
    [0.4, 0.6], and the one-sided maps equal to V4 for r <= 0.6.
  - T3 synthetic observations:
    - k = 0, hp 100%, gun only: r 0.76, and `lootCratePath` comes out at 150 x 1.06;
    - k = 4, hp 45%: r about 0.07; under V4, farmHp 0.84 and healExit 0.87, and no drone loot;
    - nLos 2: r_entry latched; the LOSING thresholds stay at V4;
    - latched FFA at 14 alive, no one within 60 m: r 0.2, and `ffaFarmClear` is 195 m.
  - T4: no wall clock (the D10 grep); work O(tracks).
- **Risk:** medium, because about 20 sites are touched. The mitigation is T1 plus the rule that `rk` returns the raw
  key.
- **Slot:** one draw on the leader after the R5/R6 items (owner's item, R6 rule 1). One draw cannot resolve +0.05 at
  sd 0.24. Keep it in the final build unless the draw reads d <= -0.25 and the local FFA league is below V4.

---

## 4. Rank, refine, veto (queued items, from the arc)

- **Rank for practice** (all act in escalation, where points are lost):
  1. FIN ([M] G01 +0.39, A32 +0.34 on other teams' bots).
  2. LC (RW: far-cover exits -0.25 per match). Refine: keep its `hpf < 0.25` clause (A05).
  3. LG `wide`. The arc says gun-only is the largest gap (82-85% of decisions to k = 3) [S]. But the 5.19 leader runs
     `laserEcon` off, and the official laser-seek readings are mixed (K0 -0.11, KS +0.04 [M]). Refine: drive its 90 s
     clock from state (map 6), or at least anchor `lgUntilT` per R6 A2.
  4. AVO and ISO.
  5. `risk: 'sched'`.
- **Refine HN/HF:** heal targets should rise with q_k (the next fight's line count), not only with loadout. With
  `heal: 'need'` adopted, map 3 is dropped.
- **Veto for practice:** any zone-rotation change (1.3). Any r map that raises a LOSING threshold or ends a fight. A
  drop-reach increase. Extra opening of fights with idle bots at high r beyond x1.15.
- **Add (ride-along, no solo draw):** `upg: 'speedg'` (section 2).

## Summary for the moderator

1. **Arc:** practice is a phase-1 match [S, A].
   - We die at τ 0.175 (sim; about 0.19-0.24 officially), to hunters (2-7 assigned, median 4); drops 2-3, phases 2-6 and "few remain" are never reached.
   - All 49 house deaths before ours were our kills. Score = easy tier (4) plus mediums; the cut needs about 2 mediums.
2. **Points lost:** the escalation death fight (k >= 3, 3.1 attackers, entered at 44-64% hp), and gun-only play (82-85% of decisions to k = 3) [S].
   - Opening idle (HOLD 44% at k = 0) is an information gap (sweep), not a threshold. Phase-1 rotation is not a lever: ZONE-mode intake 12% -> 2.6%, total unchanged [S].
3. **Proposal `risk: off/sched`** (owner request 6): r = (1 - q) g(hp) w(laser, cubes, plating/armor), plus after-kill and early bonuses.
   - q = P(2+ lines in the next fight), from house deaths (RW lambda_hp) and live lines.
   - FFA: by alive count x crowding; an FFA clue before the latch caps r at 0.15. On V4's states r runs from 0.76 at spawn to about 0.2 at k = 3.
4. **Nine monotone, bounded maps** (3.2), equal to the base SELECT for r in [0.4, 0.6]:
   - `engNearR/engLowR/engCloseR/engAimR` x0.75-1.15; `lose1/2/3Hpf` -0.08 max (one-sided);
   - `healExit` 0.7-0.9, `healEnterHp` 0.55-0.65; `farmHp` 0.5-0.9 plus `riskDroneMin`; `lootCratePath/lootDronePath` x0.6-1.15;
   - `grabLaserR` 60-130 m (LG as a state rule), `grabCubeHi` x0.85-1.15; `dropContestR` x1-1.5 (one-sided);
   - `chaseS` 3-8 s, `chaseHpf` 0.35-0.6; `bsEnergy/bsDodgeEnergy` +15 max (one-sided); FFA maps F1-F5.
   - In-contact keys read r latched at the episode start. 'off' returns the raw `P[key]` (V4, KS or KB byte for byte).
5. **Gain:** practice +0.05 (-0.15..+0.20) [A]; the final is where the schedule lives [N]. Cost: 60-90 min plus tests; one leader draw after the R5/R6 items.
6. **Schedule verdict:** early power helps both; pushing isolated hunters helps practice only as finishing; late survival and FFA by alive count help the final only (practice-inert).
7. **KB** (the owner's 70% rule) is r's g(hp) step without q. If KB reads >= +0.15 over KS, map 1's high end takes KB's clause at r >= 0.6; if it reads <= -0.15, map 1 drops its up side.
8. **Rank for practice:** FIN > LC (keep the < 25% clause) > LG > AVO/ISO > risk. Ride-along: `upg: 'speedg'` ('speed' buys jets for gun-only bots, 4 of 28 picks [S]); moot on KS, which uses 'std'.
9. **Vetoes:** zone-rotation tweaks in practice; any r map that leaves fights earlier (A25, A06); a longer drop reach; opening fights beyond x1.15 at high r (A12, R11).
10. **Questions:** (a) Rewards: refit q_k on official data; is escalation by kills or by clock (A2)? (b) IO/robustness: confirm `rk` composes with RB2 anchoring and A1.
    (c) Anyone: do real non-hunters fire on sight? It sets the low-r engage gate (sim: 23 of 49 of our kills non-easy).
