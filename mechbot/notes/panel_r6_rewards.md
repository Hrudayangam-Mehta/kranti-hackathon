# Panel R6: reward economist. Action-to-reward table, full-heal and zone-escape presets, utility tie-breaker

Written Sat 21 Nov, about 20:50 UTC, for the R5/R6 builds. Read-only on `bot/`, `sim/`, `variants/`; `intel/` not opened.
Inputs: HANDOFF.md, kit/protocol.md, notes/hello_example.json (balance), mechanics_deep.md, measured_deltas.md,
top5_synthesis.md, panel_r4_gameplay.md, panel_r5_design.md (and its `design_arith_out.txt`), panel_r3_scenarios.md,
build_spec_r4.md, build_spec_r5.md, submissions.md, variants/V4/bot/lib/{params,tactics}.js.
New tools (this panel): `tools/panel_r6/ledger.js` (fight / lull ledger of a brain in the simulator, V4 seeds 1-40 per arm),
`tools/panel_r6/rewards.py` (computes every number of section 2 from the stated rates; output `rewards_out.txt`),
ledger outputs `out_{v4,h90,h100,h100e,full85,full99,pulse}.txt` and dumps `d_*.json`.

Tags: **[M]** official 48-seed score (ours or another team's one-change A/B), **[S]** our simulator (behaviour only: its
within-bot score deltas had the wrong sign six times), **[T]** a 6+ bot's choice, **[A]** arithmetic or model,
**[N]** no evidence. A model number is an estimate, not a reading.

## 0. Headlines

1. **Points come from fights with two or more hunters, and that is where we die.** In the V4 ledger [S] an episode
   with one attacker costs 221 hp for 0.75 kills and kills us 6% of the time; with two attackers 893 hp for 1.04 kills
   and P(death) 0.70; with three or more 1,214 hp for 2.78 kills and P(death) 0.59. The chance that the next fight has
   2+ attackers rises with our kills: 0.34, 0.55, 0.64, 0.88 after 0, 1, 2, 3 kills.
2. **The laser is the biggest single entry of the table.** With gun + laser every lone hunter is a won fight at
   40-150 m (U +0.7 to +0.9 per fight). Gun-only against a laser hunter is negative at every range (U -0.6 to -1.3).
   Laser-held episodes: 343 hp per kill against 540 gun-only, 0.149 kills/s against 0.075 [S].
3. **Healing is worth a lot per second but happens rarely.** Each heal second after the 5 s delay is worth about
   0.09 pt (45 hp at 0.002 pt/hp). But lulls are short: median 6.3 s, P(>= 13 s) = 0.14, P(>= 20 s) = 0.04 [S]. A heal
   from 45% to 100% needs 22.1 s and completes in 2% of lulls.
   - Raising the heal exit (70 -> 90 -> 100%) changed 1 of 40 simulator matches (+0.03 +- 0.02).
   - Raising the heal entry to 99% changed 15 of 40 (+0.07 +- 0.19).
   - Officially, heal breaks are worth 0.00 +- 0.28: V4 pooled 4.97 over three draws against V1 4.98. The "+0.17" was
     one draw.
   - So a full-heal rule is cheap and close to neutral in practice. It is only right as a between-fights rule: leaving
     fights early (A25, -1.10) is the trap.
4. **Zone escape is nearly unreachable in practice.**
   - We die before 110 s in 40 of 40 simulator matches, so only phase 1 (20 dps) applies.
   - Stepping outside pays only if it removes more than dps / 0.6 of line damage (33 / 58 / 100 dps at 20 / 35 /
     60 dps), and only if hunters do not follow us out [N].
   - Expected value in practice: about 0 (+-0.03). It may matter in the final, where lives are longer.
5. **What to buy with the remaining slots, by U per match:**
   - serialise lines (ISO, LC, AVO);
   - the laser (LG);
   - near kills (FIN);
   - fight on instead of walking to far cover (LC);
   - kill-drop cubes (V4 already does this);
   - then heal and supply drops (small in practice);
   - zone escape last.

## 1. Currency and exchange rates

| Rate | Value | Source |
|---|---|---|
| Point | one house death before ours (zone and drone deaths count too) | rules [R] |
| Our level | 4.97 (V4 pooled, 3 draws); simulator 4.28 on seeds 1-40 | [M], [S] |
| Points per second alive (reference) | 0.062 (4.97 / ~80 s) | [M]+[S] |
| lambda_t, time with something to fight (contested) | 0.014 pt/s | [M]: V1 - V2 = +0.38 for first damage ~27 s earlier (one draw each, sd of the difference 0.34) |
| lambda_t, free time (nothing in view or heard) | 0.003 pt/s | [A]: only the clock (zone, drops, escalation) is spent |
| Points per hp of intake over a life (reference) | 0.0024 (4.97 / 2,100 hp); AL uses 1/500 | [M]+[S] HP ledger |
| lambda_hp, shadow price of hp: abundant / scarce | 0.0005 / 0.0036 pt/hp | [S]: in 2+-attacker episodes, entry at 80-100% gives 2.43 kills and P(death) 0.55; entry at 60-80% gives 1.78 and 0.78 (n 42 / 9) |
| lambda_hp(h), expected over the next fight | P_m(k) x 0.0036 + (1 - P_m(k)) x (0.0036 if h < 30%, else 0.0002) | [S]: with one attacker, entry hp above 40% changes nothing (P(death) 0) |
| V_fut, further points if we survive a crisis | 2.5 (SQUAD, mid-match); max(1, 5 - k) in the utility | [A] |
| Output per point | 1,450 damage into mechs (waste included) | [S] |
| Cube | 0.10 (cubes 1-5), 0.06 (6-9), 0.01 (10+) | [A], calibrated to E01 +0.27, E04 +0.37, E12 -0.65; the raw model gives 0.25 (an upper bound) |
| Kill drop | 0.14 (2 cubes x 70% collected x 0.10) | [T]: kyoto took 56 of its 84 cubes within 8 s of its kills |
| Laser in hand, gun-only, t < 60 s | 0.5 (0.2-1.0) | [A, T x3] |
| House hunter dps on us (one line) | gun 51 / 51 / 27 / 11 at 40 / 75 / 110 / 150 m; laser +35 | [M S05] hit rates; [M S07] house laser 15-27% accurate (AL's prior +78 is the pessimistic case) |

Utility of an action, per event:
U = pts - lambda_t x T - lambda_hp(state) x HP - P(death) x V_fut.

- `pts` counts kills (with their drops), cubes, a laser, and output dealt meanwhile (1/1450 per damage).
- `HP` is intake; a negative HP is a refund or a saving.
- In-contact rows are scored against standing in the stand-off band for the same time (175 dmg/s out, 42 hp/s in [S]).
- Out-of-contact rows are scored against idling.
- Crisis rows (retreat, zone escape) price HP at the abundant rate, because P(death) already carries the scarcity.
- `freq` = events per match in the V4 ledger, so U x freq is the per-match stake.

## 2. The table (all numbers from `tools/panel_r6/rewards_out.txt`)

### 2.1 Engage one fresh hunter at full hp (1 line; toy sustained rates; [A], cross-checked against the ledger)

| Our loadout vs hunter | 40 m | 75 m | 110 m | 150 m |
|---|---|---|---|---|
| gun vs gun: pts / hp / U | 1.13 / 776 / +0.51 | 1.07 / 915 / +0.28 | 1.14 / 532 / **+0.60** | 0 (gun silent past the 0.55 s gate) / -0.20 |
| gun vs gun + laser | 0.66 / 1,309 / -0.73 | 0.45 / 1,400 / -1.26 | 0.75 / 1,223 / -0.56 | 0 / -0.37 |
| gun + laser vs gun | 1.14 / 350 / +0.87 | 1.14 / 376 / +0.85 | 1.14 / 207 / **+0.93** | 1.14 / 138 / +0.90 |
| gun + laser vs gun + laser | 1.14 / 590 / +0.75 | 1.14 / 634 / +0.72 | 1.14 / 474 / **+0.80** | 1.14 / 575 / +0.68 |

Notes on the table:
- Time to kill is 15-20 s gun-only and 7-8 s with a laser (12.5 s at 150 m).
- Points per second: 0.06-0.07 gun-only, 0.15-0.17 with a laser.
- Points per 1,000 hp: 1.2-2.1 gun-only vs a gun hunter, 0.3-0.6 vs a laser hunter, 1.8-8.3 with a laser.
- Against a lightning holder inside 45 m (prior 190 dps) the fight costs 1,400 hp at U -1.26. Never stand inside 45 m
  of one unless finishing. In the simulator lightning is 20-25% of all damage we take.

Ledger rows [S] (V4, seeds 1-40):

| Episode | n | Kills | HP | P(death) | Duration | Per match |
|---|---|---|---|---|---|---|
| 1 attacker | 36 | 0.75 | 221 | 0.06 | 6.9 s | 0.9 |
| 2 attackers | 23 | 1.04 | 893 | 0.70 | 11.6 s | 0.6 |
| 3+ attackers | 37 | 2.78 | 1,214 | 0.59 | 27.3 s | 0.9 |

### 2.2 Every action family (per event; ranked within a family by U)

| Action | pts | T s | HP | P(death) | pt/s | U / event | events / match | U / match | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| **Finish** a target under 25% with 1 line | 1.08 | 1.5 | 40 | 0 | 0.72 | +1.04 | ~1.0 | +1.0 | [A] |
| **Finish** a near kill under 2 lines instead of leaving (V4 later kills 39% anyway) | 0.52 | 1.8 | +140 net | 0.03 | 0.29 | +0.09 (up to +0.5 when the exit has no cover) | 1.15 | +0.1..+0.5 | [S] abandon2; [M] G01 +0.39, A32 +0.34 |
| **Retreat** LOSING to cover within 7 m (0.6 s), then heal | 0.05 | 4 | 106 | 0.20 | - | +0.20 vs fighting on | ~0.65 | +0.13 | [A]; [M] A05 -0.41 when low-hp hiding was removed |
| **Retreat** LOSING to cover 30 m away (2.6 s walk at 72 hp/s) | 0 | 4 | 247 | 0.30 | - | -0.17 | ~1.5 | -0.25 | [S] legs (walking to cover takes more fire than standing, 72 vs 42 hp/s) |
| **Retreat** while NOT losing (1 line, 72% hp) | -0.60 | 7.6 | 187 | 0 | <0 | -1.45 | (V4: 0) | - | [M] A25 -1.10 |
| **Heal** 45 -> 70% (12.8 s), lull completes | 0.72 | 12.8 | -350 | 0 | 0.06 | +0.86 | - | - | [A] |
| **Heal** 45 -> 70%, real lulls (completes 14%) | 0.24 | 7.9 | -116 | 0 | 0.03 | +0.27 | 0.55 | +0.15 | [S] lulls |
| **Heal** 45 -> 90% (19.0 s): completes / real lulls (5%) | 1.30 / 0.29 | 19.0 / 7.9 | -630 / -140 | 0 | - | +1.56 / +0.34 | 0.55 | +0.18 | [A] / [S] |
| **Heal** 45 -> 100% (22.1 s): completes / real lulls (2%) | 1.59 / 0.30 | 22.1 / 7.9 | -770 / -145 | 0 | - | +1.91 / +0.35 | 0.55 | +0.19 | [A] / [S] |
| **Heal**, each extra second after the 5 s delay (no line on us) | 0.09 | 1 | -45 | 0 | 0.09 | +0.10 | - | - | [A] |
| **Heal**, the 5 s regen delay itself | 0 | 5 | 0 | 0 | 0 | -0.07 | - | - | [A] regen rule |
| **Grab** kill-drop cubes (2+ within 5 m, 3 s) | 0.40 | 3 | 42 | 0 | 0.13 | +0.23 | 1.5 | +0.35 | [T] kyoto 56 of 84 |
| **Grab** a cube 40-70 m away in contact (4 s, keeps shooting) | 0.39 | 4 | 56 | 0 | 0.10 | +0.17 | 1.0 | +0.17 | [S] grab leg 14 hp/s in, 105 out; [T] 5.58 bot |
| **Grab** a laser 60-130 m away, gun-only, t < 60 s (7 s) | 1.01 | 7 | 294 | 0.02 | 0.14 | +0.11 | 0.3 | +0.03 (more if LG raises the count) | [A, T x3]; [M] L01 -0.11 for long detours |
| **Farm** a crate 40 m away, gun-only (cube + 50% weapon, 1/3 of those a laser) | 0.18 | 7.9 | 0 | 0 | 0.02 | +0.16 | 0.4 | +0.06 | [A]; [M] E01 +0.27, E04 +0.37, E12 -0.65 |
| **Farm** a crate with a laser (one beam breaks it) / at 10+ cubes | 0.11 / 0.02 | 7.0 / 7.9 | 0 | 0 | - | +0.09 / 0.00 | 0.4 / 0.1 | +0.04 / 0 | [A] |
| **Farm** a drone (2 cubes; about 60 hp; resets regen) | 0.20 | 8.5 | 60 | 0 | 0.02 | +0.03 | 0.4 | +0.01 | [S] drone damage 68 hp per match |
| **Farm** a crate 150 m away | 0.18 | 17.6 | 0 | 0 | 0.01 | -0.06 | (V4: 0) | - | [M] E05 -0.12, E09 -0.09, E15 -0.17 |
| **Supply drop**, 50% hp, nobody near, 12 s trip, P(capture) 0.5 | 0.87 | 16 | 0 | 0.05 | 0.05 | +0.53 | 0.12 | +0.06 | [A]; [M] E10 +0.02, E11 -0.08, E03 -0.21; first landing at 95 s, alive then in 5 of 40 matches [S] |
| **Supply drop**, 90% hp / 50% hp with 1 line | 0.29 / 0.87 | 16 | 0 / 240 | 0.05 / 0.20 | - | -0.05 / -0.42 | 0.12 | ~0 | [A] |
| **Outside the zone**, 20 dps, 6 s, escaping a losing fight | -0.30 | 6 | 120 | 0.52 | - | +0.08 (+0.34 if hunters stop at the edge, -0.18 if they follow) | <= 0.05 | ~0 | [A, N] |
| **Outside the zone**, 35 dps, 6 s / 60 dps, 6 s / 100 dps, 6 s | -0.30 | 6 | 210 / 360 / 600 | - | - | +0.03 / -0.04 / -0.16 | 0 in practice | 0 | [A, N] |
| **Outside the zone** out of a fight, 3 s at 20 dps | - | 3 | 420 (60 zone + 360 regen lost) | 0 | - | always < 0 | - | - | [A] regen rules |
| **Rotate** early on the empty side vs late through the squad | 0.06 | - | - | - | - | +0.06 | 1 | +0.06 (V4 does it: 0 zone deaths) | [M] Z01 +0.06; Z02 +0.29 bundle |
| **Idle** at full hp with nothing in view (per 10 s) | 0.06 | 10 | 0 | 0 | 0.006 | -0.08 | 0.85 | -0.07 | [S] 8.5 s per match; the seek preset S targets it |
| **Idle** hurt (60%) with nothing in view (= free heal, per 10 s) | 0.47 | 10 | -225 | 0 | 0.05 | +0.55 | 0.3 | +0.16 | [A] |

Zone break-even, from `rewards.py` H rows and panel_r3 section 4:

| Phase dps | Cost per s outside (in a fight) | Cost out of a fight | Pays if being outside removes more line dps than | Budget cap s |
|---|---|---|---|---|
| 20 | 20 | (20 + 45) x s + 225 | 33 | 12 |
| 35 | 35 | (35 + 45) x s + 225 | 58 | 7 |
| 60 | 60 | (60 + 45) x s + 225 | 100 | 4 |
| 100 | 100 | (100 + 45) x s + 225 | 167 | 0 (never) |

### 2.3 What the table says, ranked by stake per match

1. **2+-attacker fights**, 1.5 per match, P(death) 0.6-0.7 each. Every rule that keeps the second line off us acts
   here: ISO, LC, AVO.
2. **The laser.** It turns every lone fight positive and halves hp per kill: LG `wide`, and KD weapons at night.
3. **Near kills**, 1.15 per match, +0.1 to +0.5 each: FIN.
4. **LOSING exits to far cover**, 1.5 per match at -0.17 each. LC (`loseCover: 'near'`, keeping its < 25% clause)
   turns them into fight-on. This is a stronger case for LC than its R5 rank 9 suggests.
5. **Cubes in contact and kill drops**, +0.17 to +0.35 per match. V4 already does both.
6. **Heal**, +0.15 to +0.19 per match from regen at all. Going from 70% to 100% adds at most +0.04 per match.
7. Farm (+0.06), supply drops (+0.06), rotation (+0.06; V4 already does it).
8. Zone escape: about 0 in practice.

## 3. Spec A: full-heal disengage, preset `heal` (SQUAD posture; firewall as R5)

Owner's rule, made economic: **do not start the next voluntary fight until healed**. It is a rule *between* fights,
never a rule for *leaving* one. LOSING (d3) stays the only way out of a fight. The sim shows why the exit threshold
alone is inert: a heal from 45% reaches 70% in only 14% of lulls, so the exit is rarely reached.

Options (the old value reproduces V4 byte for byte):

```
heal: { d3:   { healMode: 'd3' },                                        // V4: enter < 55% or < 90% within 6 s of LOSING, exit 70%
        need: { healMode: 'need', healNeedM: 0.25, healMinExit: 0.70 },  // recommended draw
        full: { healMode: 'full', healFullEnter: 0.95 } }                // the owner's literal rule
params: healIdleS 20, healCoverR 15, healHys 0.10, healPm [0.34, 0.55, 0.64, 0.88]   // P(next fight has 2+ lines) after 0/1/2/3+ kills [S]
```

**Heal target H\*** (computed every decision, from hello.config and this match's observations; nothing hard-coded):
- `full`: H\* = maxHp. Enter when hp < 0.95 x maxHp after a fight.
- `need`: H\* = clamp((1 + 0.25) x A_next x TTK_next, 0.70 x maxHp, maxHp), where:
  - A_next = n_hat x a_line, with n_hat = 1 + healPm[min(k, 3)];
  - a_line = per-line dps measured this match (EMA of B.A / B.nLos in fights). Prior: the gun line at 110 m (the house
    gun's sustained 93 dps x hit 0.31 = 29) plus 35 x the share of seen hunters that list a laser in `obs.mechs[].weapons`;
  - TTK_next = hunt.js TTK on a dummy at 110 m with hp = cfg.mech.hp x (1 + hp_per_cube x 2).
- Enter when hp < H\* - 0.10 x maxHp; under d3 the after-LOSING entry uses H\*.
- Worked values (maxHp 1400):
  - gun-only after one kill: 1.55 x 47 x 20.5 s x 1.25 = 1,860, so H\* = **100%**;
  - with a laser: 1.55 x 47 x 8 s x 1.25 = 730, so H\* = **70%**, the same as V4;
  - with a laser after 3+ kills, at a measured 60 dps per line: 1.88 x 60 x 8 x 1.25 = 1,130, so H\* = **81%**.
- In words: heal to full when gun-only or when the pressure is high; otherwise 70% is enough, and the fight is worth
  more than the wait.

**It applies only when all of these hold:**
1. No line on us for 1.5 s (healQuietS) and no hit dealt on a mech for 1.5 s. It never ends a fight: A25 measured
   -1.10 for leaving fights at 72%.
2. No near kill armed (FIN: target <= one magazine plus a ready beam, seen within 3 s). Finishing is the best row of
   the table.
3. Next radius > zoneLateR (70 m) and alive > 3.
4. The heal cell keeps zone slack >= t_heal + healZoneS (20 s), where t_heal = regen_delay + (H\* - hp) / regen_per_s.
   If not, H\* is cut to what fits.
5. t >= earlyOpenS (20 s).

**While it runs:**
- Hold the best hide cell within healCoverR (15 m). Never walk farther under fire (72 hp/s legs).
- Keep the torso on the last hostile bearing (pre-aim; laser pre-charge when a line is about to open).
- No voluntary damage. No crate or drone shots (drone hits reset regen; crate hits are unverified on this build). No
  opening shot on a non-hostile mech.
- Cubes within healCubeR (40 m) are taken: each heals 4%.
- A hostile line (it hit us, or aim dwell >= 3 decisions within 160 m) means FIGHT at once with return fire.
  Hold-fire under fire measured -0.34 (A08 against A09).
- A supply drop that lands before t_heal with no mech within 60 m of the ring takes precedence: full hp in 4 s.

**Exit:** hp >= H\*, or contact, or FIN arms, or the wait cap. The wait cap is healIdleS = 20 s with no mech listed
within 200 m and no gun, laser or lightning sound at mid or near range; then seek, walking (regen keeps running while
walking). The cap stops the passivity trap: avoid-everyone -1.75 (A22), patient hold -0.50 (A01).

**FFA:** unchanged (ffaHealExit 0.9 already). `ffaHealExit: 1.0` is a separate practice-inert item. S08 supports it:
quiet variants win private FFA rooms 10.75 vs 9.33.

**Expected effect:**
- `need`: +0.03 (-0.10..+0.15) [A].
- `full`: 0 (-0.15..+0.15). Sim analogues: exit-only 90/100%, +0.03 +- 0.02 (39/40 matches identical); entry 99% +
  exit 100%, +0.07 +- 0.19 (25/40 identical; HEAL 5.3 s per match against 1.9).
- An exit-only `full` is close to a V4 salt draw.
- The real lever is the entry: "no voluntary opening while hp < H\*". V4 opens 64 of its 83 next fights itself
  (13 of 22 when under 70%).

**Tests:**
- T1: gun-only, k = 1, hp 60%, no line for 2 s -> HEAL, target 100%. A non-hostile mech at 180 m is not engaged; the
  same mech hitting us -> FIGHT in one decision.
- T2: laser held, k = 0, hp 65% -> no HEAL (H\* = 70%, enter below 60%).
- T3: near kill armed at 40% hp -> FIGHT, no HEAL.
- T4: next radius 70 m, or 3 alive -> V4 behaviour.
- T5: no mech for 20 s while healing -> seek leg; hp keeps rising.
- T6: the d3 option byte-identical on the 14 R3a2 streams and K0; FFA-inert.
- T7: sim smoke on seeds 1-10 per the R5 gate. Item metric: HEAL share up, deaths in the first 3 s after a heal exit
  not above V4's.

## 4. Spec B: zone escape, preset `zoneEsc` (SQUAD first; FFA as its own draw)

Owner's rule: when a stronger threat pursues us, use the zone edge. Accept 20-60 dps of zone damage in early phases
instead of a losing fight, within a budget.

```
zoneEsc: { off: { zeOn: false }, edge: { zeOn: true } }
params: zeDpsMax 60, zeEdgeR 30, zeCapK 240 (s_cap = min(12, zeCapK / dps)), zeHpFrac 0.25, zeHpMax 300, zeFloor 0.30,
        zeInMult 1.5, zeOutside [5, 20], zeQuietS 1.5
```

**Trigger (all must hold):**
1. **Losing to a stronger threat.** d3 LOSING, or projected: hp / IN < 0.8 x TTK(target), with IN >= zeInMult x zone
   dps (the lines out-damage the zone by half again).
2. **No near cover.** B.tCover > 1.5 s. Cover within 7 m beats the zone (+0.20 against fighting on).
3. **Phase.** obs.zone.dps <= zeDpsMax (60), next radius > zoneLateR (70 m), alive > 3. In practice that means
   phase 1 (20 dps, 60-110 s).
4. **Edge reachable.** The current circle's boundary at arrival is within zeEdgeR (30 m) of path, at a bearing >= 90
   deg from the threat centroid. We step away from them, never past them.
5. **Budget.**
   - s_out <= min(12, 240 / dps): 12 / 6.9 / 4 s at 20 / 35 / 60 dps.
   - HP_out = dps x s_out <= min(0.25 x hp, 300).
   - hp - HP_out - IN x t_transit >= 0.30 x maxHp.
   - Otherwise fight on (lastStand / lastGasp rules).
6. **Return path.** A re-entry cell with zoneSlack >= zoneArriveSlack (10 s) at arrival, path <= 1.3 x straight,
   planned before leaving.

**Outside:**
- Move along the edge, 5-20 m outside, away from the pursuer.
- Break lines with terrain and buildings, and open the range past 130 m from gun hunters (house gun hits 12% there).
- Shoot only a finishable target, or a pursuer that follows us out. It takes the same zone damage and has no regen,
  and a house bot's zone death is a point.

**Exit:**
- No line for zeQuietS (1.5 s): re-enter, then heal. Regen restarts regen_delay after re-entry.
- Budget spent, or hp <= 30%: re-enter and fight.

**Never:**
- out of a fight (3 s at 20 dps costs 420 hp with the lost regen);
- in HEAL, to loot, or to farm;
- at dps >= 100;
- while finishing;
- in FFA until its own draw.

**Expected effect:**
- Per event: +0.08 (20 dps, 6 s, P(escape) 0.25). It is +0.34 if hunters stop at the edge (0.40) and -0.18 if they
  follow (0.10). Whether real hunters follow is unknown: the sim stand-in turns back 10-28 m from the edge.
- Frequency: at most about 0.05 per match. We are alive in the first shrink in 72% of simulator matches, but
  "losing and the edge within 30 m" is rare, and nobody lives past 110 s.
- Practice value: 0 (+-0.03). Draw it only after the R5 list. Its real use is the final (phases 2-3, longer lives).

**Tests:**
- T1: phase 1, LOSING at 50%, 2 lines totalling 120 dps, edge 20 m away from the threats, no cover within 1.5 s ->
  ESCAPE. It leaves within one decision, stays out <= 12 s, and comes back in when no line has been on us for 1.5 s.
- T2: the same with cover within 7 m -> DISENGAGE to cover, not the zone.
- T3: dps 100, or next radius 70 m -> never.
- T4: hp 35% -> the floor blocks it.
- T5: out of a fight -> never.
- T6: sim smoke on seeds 1-10: zone deaths 0; time outside <= budget; identity with `off`; FFA-inert.

## 5. The utility function (tie-breaker), preset `util: { off, tie }`

```
U(a | s) = G(a) - lambda_t(s) * T(a) - lambda_hp(s) * H(a) - P_d(a | s) * V_fut(s)
G   = P_kill(a) * (1 + KD) + V_cube(c) * E[cubes] + V_laser * [laser gained] + Out(a) / 1450
      P_kill = Phi((hp - IN*TTK) / (0.35 * IN*TTK)) with hunt.js TTK / IN; KD = 0.7 * (victim cubes + death_drop_extra) * V_cube(c)
      V_cube(c) = 0.10 below the third upgrade threshold (6), 0.06 below stat_cap (10), 0.01 above (thresholds from cubes.*)
      V_laser = 0.5 * max(0, 1 - t / 150) when no laser is held
T   = nav path time + action time (TTK, shots = target hp / gun damage, capture_s, t_heal)
H   = IN * exposure + zone dps * s_out - refunds; refunds = regen_per_s * max(0, T - regen_delay) (no damage dealt or
      taken), cubes * hp_per_cube * maxHp, a drop (1 - hpf) * maxHp
lambda_t  = 0.014 if a non-NPC track is within 240 m or a near / mid gun, laser or lightning sound in 3 s, else 0.003
lambda_hp = P_m(k) * 0.0036 + (1 - P_m(k)) * (hpf < 0.3 ? 0.0036 : 0.0002), P_m = healPm[min(k, 3)];
            in a crisis (LOSING, or IN >= 150) H is priced at 0.0005 and the risk sits in P_d
P_d = Phi((IN_a * T_a - hp) / (0.35 * IN_a * T_a)) for exposure actions, else 0
V_fut = SQUAD: max(1, 5 - k); FFA: 0.5 * (alive - 1)
```

**Where it acts.** Only among options that V4's priority order already allows:
1. Loot choice: max U / T, with U > 0.
2. The `heal: need` entry and exit: H\* is the lambda_hp crossover.
3. The `zoneEsc` permit: U(escape) > max(U(fight on), U(cover)).
4. The after-kill lull: seek, heal, loot or drop.
5. Target ties: V4 costs within 10% -> the higher P_kill x (1 + KD) / TTK.

**Never overrides:** ZONE urgency, lastStand / doomed, LOSING with cover within 1.5 s, the FFA counters and rules, the
late zone, the opening guard.

**Engineering:**
- Pure function of B. No clock. At most 8 candidates per decision, closed forms. Under 0.05 ms.
- Ties are broken by the existing order, so determinism holds.
- The `off` option is byte-identical to V4.

**Risk:**
1. **The constants are estimates.** lambda_hp, V_cube and V_laser come from the simulator (wrong sign six times) and
   from single official draws (sd 0.24).
   - Over-valued lambda_hp drifts toward passivity: every measured hide or patience posture lost 0.3 to 1.75.
   - Over-valued V_cube drifts toward farming: farther or longer farming lost 0.09 to 0.17.
   - The guards are the 20 s wait cap, "hostile lines are always answered", and tie-breaker scope only.
2. **Double counting.** HP and death risk both price the same danger. The crisis convention above is the fix; keep it.
3. **Big per-event values act rarely.** Supply drops are 0.12 per match, zone escape <= 0.05, full heals 0.02 per lull.
   A tuned utility cannot buy much there.
4. **Expected value:** +0.0 to +0.10, downside -0.2. Build it after FIN, ISO, LC and LG. Test it with the R5 gate
   (identity streams, FFA-inert, sim smoke). Draw it once, never as a stack base.

## 6. Map-agnostic by construction (owner: "planning for the future map change ... random spawn ... don't hard code")

Every number above is a formula on `hello.config` or on this match's observations. On a new map, seed or spawn only
nav path lengths, hide cells and zone geometry change, and they are computed live.

| Quantity | Source |
|---|---|
| Heal times | `mech.regen_delay`, `mech.regen_per_s`, `obs.self.max_hp` |
| Zone costs and caps | `zone.phases[].dps` and the live `obs.zone` (dps, radius, next_center, shrink_end) |
| Cube values | `cubes.hp_per_cube`, `damage_per_cube`, `stat_cap`, `upgrade_thresholds` |
| Kill drops | `cubes.death_drop_extra` |
| Supply drops | `drops.times`, `fall_s`, `capture_s`, `cubes` |
| Farm costs | `crates.hp`, `npc.hp`, `npc.damage` / `cooldown` / `aggro_range` |
| TTK and IN | weapon stats in `obs.self.weapons[i].stats`, and each seen mech's `weapons` |

The few learned rates (lambda_t, lambda_hp, P_m(k), V_cube, 1,450 damage per point) are calibrations of the squad's
behaviour, not of the map. P_m(k) and the per-line dps should be re-estimated online from this match's B.A and line
counts, with the [S] values as priors.

## 7. Reproduction and limits

```
cd $P/tools/panel_r6
TAG=V4 DUMP=d_v4.json taskset -c 0 $P/bun ledger.js 1 40 > out_v4.txt              # about 3.5 min on one core
TAG=FULL99 OVR='{"healEnterHp":0.99,"healExit":1.0,"healAfterLoseHp":1.0}' taskset -c 1 $P/bun ledger.js 1 40
python3 -I rewards.py > rewards_out.txt
```

Limits:
- Episode = mech contact separated by 3 s or more. The entry-hp bins under 80% hold 6-14 episodes each, and are
  confounded with match phase (later episodes come with more hunters).
- Official evidence on heal thresholds is single draws, plus other teams' bots at 1.5-5.6.
- The zone escape rests on an unknown: do house hunters follow us outside the circle?
- Nothing here was submitted. The submission schedule stays with build_spec_r5 section 5.
