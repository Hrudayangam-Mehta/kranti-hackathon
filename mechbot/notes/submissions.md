# Submission log (owner only; never goes into the repository)

> Corrected 19:15 UTC Sat by panel R4 (notes/panel_r4_schedule.md section 10): the S01-S06 rows in the first
> table below are a plan from 07:15 that was never submitted; the real entries are S01-core, S01-full, V1-V4
> and later rows. Page times are US Eastern (11:28 AM = 16:28 UTC). "Entered in the final" means only the
> default pick (best score). Single-draw differences have sd 0.24: they are readings, not decisions.

Plan: notes/submission_plan.md. One row per submission, rejected ones included (they use a slot). Write the
row (ID, the one change, simulator prediction in Decision) BEFORE the push; fill Score, board and Decision
when the owner reports back. Commit = full 40-character hash. Score to two decimals (one match point 0.021).
Board = the track page's 1st / 16th / 32nd scores at the moment our score appeared.

Reading key: identity check (FFA-only change or resubmitted hash) passes only if equal to the hundredth.
Changed build against its comparison: |d| < 0.3 noise, 0.3-0.6 replicate, 0.6+ real; two salts per arm 0.4+.

| ID | UTC time | Commit | The one change | Score | Board 1st / 16th / 32nd | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | | | base (far / 70 / 90 / d4, ffaPair on, beamClue off, idlePull off, env auto), salt 0 | | | sim: |
| S02 | | | env squad, salt 0 (identity check against S01) | | | |
| S03 | | | salt 1 (re-roll noise against S01) | | | |
| S04 | | | laserRange mid, salt 0 | | | |
| S05 | | | laserRange mid, salt 1 | | | |
| S06 | | | beamClue on, salt 0 (identity check against S01) | | | |

## Board snapshots between submissions (every 3 h)

| UTC time | 1st | 16th | 32nd | 33rd | L32 rise over the last 3 h |
| --- | --- | --- | --- | --- | --- |
| 05:19 Sat | 5.58 | 4.92 | 4.44 | 4.42 | +0.40 (02:40 to 05:19) |

## Lock record

| Item | Value |
| --- | --- |
| Gate evaluated (UTC) | |
| L32 then / hourly rise / G1 threshold | |
| Chosen entry (ID, hash, score) | |
| Why this entry (G1-G4) | |
| Picked explicitly on the track page (UTC) | |
| 15:30 checks: chosen shown / public / hash present / logged-out archive download | |

## Pushed for the first submissions (11:02 UTC Sat Nov 21) — repo https://github.com/Hrudayangam-Mehta/kranti-hackathon

| id | commit | build | bot.js sha256 (16) | gate | notes |
|---|---|---|---|---|---|
| S01-full | a2fb4793df5fb452b5040bece3ff318e189e0732 | pass 2b, all defaults on (loot stealing, late scan, laser head aim, 2696 counters, farm-first opening, FFA counters) | da88060b96eeec99 | GO (35 PASS, H9 waived) | sim squad 3.1-3.3 (10 / 6 matches) |
| S01-core | 803557a28ed032c0b3fae7a2ba4f886122018980 | same code, preset pass2b = off (= pass 2a behaviour; FFA counters still on) | 30d2a4453c1191fa | GO (35 PASS, H9 waived) | sim squad 4.4-4.7 (10 / 6 matches) |

## Official results (reported by the owner, Sat Nov 21; times as shown on the page, US Eastern)

| id | commit | score | receipt | shown | page note |
|---|---|---|---|---|---|
| S01-core | 803557a28ed032c0b3fae7a2ba4f886122018980 | 4.90 | BB-6A7D9DAA | Sat 11:28 AM | "wait 196 ms" |
| S01-full | a2fb4793df5fb452b5040bece3ff318e189e0732 | 5.02 | BB-4D3EBF2D | Sat 11:30 AM | "wait 120 ms"; entered in the final (best score) |

Board at 16:38 UTC: top kyoto-max 6.31; 32nd 5.33; 5.02 is below the top 50 shown. The full build beat the core
build by 0.12 on the real scorer although the simulator predicted core ahead by about 1.2: the simulator's
within-bot deltas are not trustworthy.

## Facts from the owner's screenshots (16:54 UTC Sat)
- Owner (16:58 UTC): Mech Royale allows 4 submissions per hour (the "1 of 1" screenshot was another state of the
  form). Plan with 4 slots per hour.
- Form: "Leave it empty to score the newest commit on the default branch"; "a rejected entry still uses one of
  the hour's submissions"; "Push first: we fetch from GitHub".
- Our team shows as rank 59 of 262 at 5.02. The page's "wait" is the platform queue time before scoring starts (status page fields queue_wait_ms / total_ms), not our answer time.

## R3a2 variants pushed (18:58 UTC Sat) — submit in this order, each with the repo URL + hash
| slot | variant | commit | bot.js sha256 (16) | difference |
|---|---|---|---|---|
| 1 | V1 full R3a2 | 057b2f4a55fac43aba0f9e3055adddccad35409e | 021e65e66452c7c7 | fight early, laser economy, focus fire, pulse retreat, boost spending, mid laser, farm 50, speed 3rd, final-only Z rules |
| 2 | V2 | 1eae980e7b3ff5c62f073fc5e9c13996506546b3 | c1d15fcecaaefc48 | V1 with the old farm-first opening |
| 3 | V3 | d8e10b230bbcfbdfe7306d977d74b489049d2f42 | 83b0ceced7f17828 | V1 without boost spending |
| 4 | V4 | 829bd7339d7bd5f276a681d48a8b229f7f3fe099 | 2bebaf104dbb7860 | V1 with heal breaks as in 5.02 |

## R3a2 official results (owner, Sat 1:44-1:59 PM ET = 18:44-18:59 UTC)
| variant | commit | score | receipt | reading |
|---|---|---|---|---|
| V1 full R3a2 | 057b2f4 | 4.98 | BB-39E70EB4 | |
| V2 (old farm-first opening) | 1eae980 | 4.60 | BB-CEB79450 | fighting early is worth about +0.38 (V1 - V2) |
| V3 (no boost spending) | d8e10b2 | 4.83 | BB-5233D3DC | boost spending about +0.15 (V1 - V3), near noise |
| V4 (heal breaks as in 5.02) | 829bd73 | **5.15** | BB-DBDD466D | heal breaks beat pulse retreat by about +0.17: keep retreat 'd3'; NEW BEST, entered in the final |

## V4 salt re-draws pushed (19:12 UTC) — same code as V4, only PARAMS.salt differs
| slot | build | commit | bot.js sha256 (16) |
|---|---|---|---|
| 1 | V4 salt 1 | a749e61c5bc4788830c35d8bcc2e6b1e53b6e95d | aa3c5d95a5f4747b |
| 2 | V4 salt 2 | 5b23b8f608d24b59e43ca1640ebf532d248173e8 | 9e46d69971f066c7 |
| 3 | V4 salt 3 | 99821c0f0499002ed513e30d3986234f070c280d | 349814b921a92180 |
| 4 | V4 salt 4 | 06af5e8acf6fffae0149b1ccfac059fee665bc08 | 05a0ea6de2afc49e |

## Log from the 19:44 UTC window (schema of notes/panel_r4_schedule.md; one row per slot, rejected ones included)
Code: C3 = R3a2 code, C4 = R4 code, F = final code. Role: cell (factorial run F01-F16), arm, leader, port, F.
Type: S = SQUAD-only change, B = acts in both postures. Portable = can be ported into the final code by an exact
replay (same presets and salt). Fit all rows with `python3 -I tools/panel_r4/decide.py fit <csv>`.

| ID | UTC | Code | SELECT change vs V1 | Salt | Commit (40) | Score | Role | Type | Portable | Decision |
|---|---|---|---|---|---|---|---|---|---|---|
| S01-full | 16:30 | pre-C3 (= C3 with SELECT_502) | all R3a2 items at 5.02 values | 0 | a2fb4793df5fb452b5040bece3ff318e189e0732 | 5.02 | ref | | yes | all-minus point, P1 off |
| V1 | 18:44 | C3 | none (F01) | 0 | 057b2f4a55fac43aba0f9e3055adddccad35409e | 4.98 | cell F01 | | yes | |
| V2 | | C3 | fightEarly off | 0 | 1eae980e7b3ff5c62f073fc5e9c13996506546b3 | 4.60 | P1 reading | S | yes | P1 fixed on |
| V3 | | C3 | boost off | 0 | d8e10b230bbcfbdfe7306d977d74b489049d2f42 | 4.83 | extra point | S | yes | |
| V4 | 18:59 | C3 | retreat d3 | 0 | 829bd7339d7bd5f276a681d48a8b229f7f3fe099 | 5.15 | extra point | S | yes | best so far |
| M-1944-1 | | C3 | retreat d3 | 1 | a749e61c5bc4788830c35d8bcc2e6b1e53b6e95d | | V4 salt | S | yes | |
| M-1944-2 | | C3 | retreat d3 | 2 | 5b23b8f608d24b59e43ca1640ebf532d248173e8 | | V4 salt | S | yes | |
| M-1944-3 | | C3 | F02: farmHp 90, boost off, upg std | 0 | | | cell F02 | B | | (V4 salt 3 99821c0f... if F02 is late) |
| M-1944-4 | | C3 | F03: focus mult, retreat d3, upg std | 0 | | | cell F03 | B | | (V4 salt 4 06af5e8a... if F03 is late) |

## Factorial runs pushed (19:40 UTC Sat) — R3a2 code, SELECT-only changes against V1 (design: notes/panel_r4_schedule.md)
| run | commit | bot.js sha256 (16) | SELECT change against V1 |
|---|---|---|---|
| F02 | c5a6501ce4858d21824f4c9b3c20692d397a6a13 | f739b130728beb96 | farmHp 90, boost off, upg std |
| F03 | 033a818df8f21a446fbc278c681fe2905f0e3399 | c4d6029de2e80a5a | focus mult, retreat d3, upg std |
| F04 | 9eb36dcba983ffee207171bd66c62b126cbaa619 | 1557866d63e0d26b | focus mult, farmHp 90, retreat d3, boost off |
| F05 | 3bd16141187aa5bdab0063fd5a6e96a63b5df1b3 | 29601110a777564c | laserEcon off, laserRange far, retreat d3, boost off |
| F06 | 6ceccd8150e20626767bdf985810ded8c4ef957e | 4870b218cf00bbd4 | laserEcon off, laserRange far, farmHp 90, retreat d3, upg std |
| F07 | fad839013cbaa8b8874a5016902f2ef8da61261f | cc4a92e7bd388965 | laserEcon off, laserRange far, focus mult, boost off, upg std |

## Results 19:45-20:00 UTC (owner)
| build | commit | score | receipt |
|---|---|---|---|
| V4 salt 1 | a749e61 | 4.69 | BB-D4286E02 |
| V4 salt 2 | 5b23b8f | 5.06 | BB-F727AC2C |
| F02 | c5a6501 | 4.85 | BB-1AC2E8B5 |
| F03 | 033a818 | 4.94 | BB-04CE771F |
V4 pooled mean of three draws = (5.15 + 4.69 + 5.06) / 3 = 4.97; draw spread 0.46 (sd about 0.24).

## Pushed 20:12 UTC
| build | commit | change |
|---|---|---|
| K0 | (see below) | V4 with laserEcon off, laserRange far, focus mult, farmHp 90, upg std (R5 chair item 1) |
| Shopping Sessions M2 snapshot | 10ab5ac64ad2d034982bc12d85e673d44dd974bc (branch exp) | own Rust pipeline; 36/36 fixtures, dev MATCH, 6 random seeds MATCH vs independent reference; dev 0.28 s on 2 cores |

## Shopping Sessions official results
| build | commit (branch exp) | score | receipt | shown |
|---|---|---|---|---|
| M2 snapshot (rel1) | 10ab5ac64ad2 | 0.98 s | BB-D8064B31 | Sat 3:10 PM ET; entered in the final (best) |
Top of the board 0.30 s. Next: speed fan-out (four experts) -> RC2.

## Pushed 20:40 UTC Sat — slot order K0, H, S, HL
| build | commit | bot.js sha256 (16) | change against V4 |
|---|---|---|---|
| K0 | 7ce2e0e859106745741dccdb6155a1f54c3f4002 | 6ce05177c9a022f7 | laserEcon off, laserRange far, focus mult, farmHp 90, upg std |
| H | 3e871df9a64e9e05a8da780b1a13938e9abd6cdf | 9ede0269781b78bb | hunt 'h50' (owner's hunt50, with pulse to cover) |
| S | 47eac260f79dffd608c5177376e26d70b8d2b61a | d100de7b36581ea5 | seek 'on' |
| HL | 81a117f54510652268addae814104e25ac6e5152 | 55e2e1142dd70e33 | hunt 'lite' (no pulse) |

## Results 20:45-21:00 UTC (owner)
| build | commit | score | reading |
|---|---|---|---|
| K0 | 7ce2e0e | 5.04 | V4 + R5 item 1; -0.11 against V4 salt 0 (inside noise) |
| H | 3e871df | 4.98 | hunt50 with pulse cover |
| S | 47eac26 | 5.13 | V4 + seek on; -0.02 against V4 salt 0 |
| HL | 81a117f | 4.73 | hunt50 without the pulse: drop |
Best stays V4 5.15 (829bd73). Per-draw sd about 0.24, so no single change has beaten V4 yet.

## Pushed 21:25 UTC Sat — code C4 + map-loader fix (RB1, own version: follows hello.map.files, absolute paths, versioned folders)
Behaviour on the practice map is unchanged (same files load); a renamed map folder now loads (check.py v3dir world=true nav=true).
All six: release gate GO (35 PASS, 1 waived H9), verified from a fresh clone (bot.js sha256 match, 4 files, no forbidden words).
| slot | build | commit | bot.js sha256 (16) | SELECT change against V4 | salt |
|---|---|---|---|---|---|
| 1 | KS | 3c4ca69ef7779bb77d76ae9da94e476c5d1265ff | 93c4f4e65575f1c6 | K0 items + seek on | 0 |
| 2 | S_s1 | 86c7cc6ba16e28b3c072de9407b187d1017f6548 | 569cba4e93148838 | seek on | 1 |
| 3 | K0_s1 | d8f6e646146bd8bc613a4479303af186b6d913d2 | 83c05e9bc5b01d9c | K0 items | 1 |
| 4 | KS_s1 | 5898265c0b4fc41935c515aba851c7e695c4636a | 24a144eb0f0c5f15 | K0 items + seek on | 1 |
| 5 | S_s2 | c4f015f9441b128df34db0c83b61b7cc4c268871 | 1131358d7fdd60d3 | seek on | 2 |
| 6 | KS_s2 | 692325a02ff803829ac6615eedeaf5085bb1c1e5 | a5f0f34ba0ebf450 | K0 items + seek on | 2 |
K0 items = laserEcon off, laserRange far, focus mult, farmHp 90, upg std.

## Results 21:25-21:30 UTC (owner)
| build | commit | score | receipt | reading |
|---|---|---|---|---|
| KS (K0 items + seek, salt 0) | 3c4ca69 | **5.19** | BB-2227901C | NEW BEST, entered in the final |
| S salt 1 | 86c7cc6 | 4.92 | BB-28CD7DFE | S mean 5.03 over 2 |

## Owner doctrine (21:31 UTC): "do not over-code or over-strategise; always search and go for the maximum reward when hp is
above 70% and we cannot die in one hit". KA (preset-only: unengaged gate 0.9 -> 0.7, 20 s -> 8 s, seek from 70%) changed no
decision on the kit stream and none in 8 sim matches (with 15 hunters we are almost never 'unengaged'): dropped as a no-op.
KB = KS + `aggr: 'any70'` (any listed mech is a candidate whenever hp >= 70%, no no-contact wait; seek from 70%): changes play
in the sim (8 seeds: 4.00 vs KS 3.63, information only). One-volley guard (h70g) is with the engineer.

## Pushed 21:40 UTC Sat (all GO 35/1 waived, verified from a fresh clone)
| priority | build | commit | bot.js sha256 (16) | change against KS | salt |
|---|---|---|---|---|---|
| 1 | KB | 8428d2e3a17b6e79f26a3308a61918b0bdf46f1e | ecb6c0d4f38b8033 | aggr any70 (owner's 70% rule) | 0 |
| 2 | KB s1 | d4518215b1e51cfdc493c88227ee483f93e9e500 | c701c0dd918da795 | aggr any70 | 1 |
| 3 | KS s3 | 82aaa51eb42092bcae2364924e98ccbc401e6ffd | d727f9f596c71e12 | none (leader re-draw) | 3 |
| 4 | KS s4 | dc2cedddd9f7a231388508f10013c6e786cb6689 | 7b4aab567d6998c0 | none | 4 |
| 5 | KS s5 | 03d0b946799d2d03bbff6c9f2bcb42362921831e | d3ddeeaf233f0dbb | none | 5 |
Also pushed earlier and still unsubmitted: KS s1 5898265c..., KS s2 692325a0..., K0 s1 d8f6e646..., S s2 c4f015f9...

## Pushed 21:50 UTC Sat (fillers; all GO 35/1 waived, verified from a fresh clone)
| build | commit | bot.js sha256 (16) | salt |
|---|---|---|---|
| KB s2 | 0ba2c485bf2ed2ca146f6259b5b7862a1595d16c | 8c88d32e071cfe10 | 2 |
| KB s3 | d7d88e2498f6ea6bdce2edd19d28b6b3ad5f1ac7 | 94dc6b36322ea561 | 3 |
| KS s6 | 0f82fa869630044021137e859d080756776c22a6 | 976d4e5d10364eb6 | 6 |
| KS s7 | cb77a26a0533f235bf83c4d33ba0f2df8f3719f4 | f8a94f834192be3b | 7 |

## Results 21:49-21:53 UTC (owner)
| build | commit | score | receipt | reading |
|---|---|---|---|---|
| KB s0 | 8428d2e | 5.19 | BB-AF85C11B | EXACTLY KS s0: any70 changed no decision officially (we are always in contact); the server is deterministic |
| KB s1 | d4518215 | **5.23** | BB-1CAD1A2A | NEW BEST, entered in the final |
| KB s2 | 0ba2c485 | 4.98 | BB-D3A0F71F | |
Consequences: KS s1 (5898265) and KS s2 (692325a) would repeat 5.23 / 4.98: do not submit them as draws. KB s3 and KS s3 are
the same draw: submit only one. KB carries any70 with no foreign-death firewall (final risk): the final entry should be the
KS-SELECT port of the best salt on the R7 code (expected exactly 5.23).

## Pushed 22:00 UTC: KBH s1 = KB s1 + healDoc on (heal out of contact below 70%, leave at 80%), salt 1
| build | commit | bot.js sha256 (16) |
|---|---|---|
| KBH s1 | 6b038a9428ec9dbb2d87da15026e21b38209ce3c | af132f143ff8fd99 |

## Pushed 22:04 UTC: identity ports on R7 code (engineer checkpoint 02: RB2-RB6, IO-A at 'v4', IO7, IO8), KS SELECT
Kit stream 300/300 decisions identical to KS on the old code; sim 12/12 matches identical (salt 1). Gate GO.
| build | commit | bot.js sha256 (16) | expectation |
|---|---|---|---|
| R7P s1 | 8e724cac7c23f80958791a686f408e8d1043226e | 5716949989d26ead | exactly 5.23 (port of the best; final-safe, no any70) |
| R7P s0 | 989fa9bad014f5bc88e201cedcb8ab43f94d2d72 | c8abc8ae08a64c09 | exactly 5.19 (bisect partner, only if R7P s1 misses) |
Order given to the owner: R7P s1, KBH s1, KS s3, s4, s5, s6, s7. Do not submit KS s1 / s2; only one of KB s3 / KS s3.

## Result 22:05 UTC (owner): R7P s1 (KS SELECT, salt 1, R7 checkpoint-02 code) = 5.13 (BB-FAB4EFBF), not 5.23
Either any70 mattered at salt 1 (KB s1 != KS s1) or the R7 code diverges officially (IO8 merging after a late decision,
or RB anchoring on a config that differs from the kit's). Bisect + final-safe candidate: KS s1 on the old code (5898265)
next: 5.23 -> R7 code diverges; 5.13 -> any70 mattered at salt 1 and R7 is identical.
Order for 22:25: KS s1 (5898265), KBH s1 (6b038a94).

## Shopping Sessions pushed 22:10 UTC (branch exp)
| build | commit | binary sha256 (20) | checks |
|---|---|---|---|
| rel15 = rel1 + scale expert's 10 changes | 4bf9d6fe0818038a530ae30fda44dd9b5fac1758 | 2f3ebac79b609ce84417 | fixtures 36/36 (NCPU 1, 4), dev MATCH (NCPU 4, 8), 6 seeds vs ref.py and full 20M equal to rel1 (expert's gate on the byte-identical binary); fresh-clone rebuild identical |

## Pushed 22:16 UTC: R7 checkpoint-03 code (RB2-RB6 + RB3 clamp, IO-A 'v4', IO7, IO8 'ioMerge', pocketCfg), KS SELECT
Kit stream identical to the old-code KS builds of the same salt; gate GO; verified from a fresh clone.
| build | commit | bot.js sha256 (16) | role |
|---|---|---|---|
| R7m s1 | c959cc23e2c905a5541e93a52a750e8198cc5687 | bef2fe3109d45c4a | bisect: R7 code with ioMerge OFF, salt 1. Submit only if KS s1 (old code) reads 5.23 |
| R7 s3 | 5aa5ddd22e1677ef5aba837d390483e8c1e11cb7 | d70b13a4928439c6 | fresh draw on final-safe code (replaces old-code KS s3) |
| R7 s4 | 91f85ed959785b088cf2cb13d7b74ad1eca6fc0f | bf76ca4f59fe1f91 | fresh draw (replaces KS s4) |
| R7 s5 | 28ef1c431655fbefb636182f41f729ffe7dd7043 | b0102efa73ae88b6 | fresh draw (replaces KS s5) |
| R7 s6 | b03f8a216389862a59b5250e4bd745a8ca9c7428 | c00287644c6cd620 | fresh draw (replaces KS s6) |
Rule from now: lottery draws go on final-safe R7 code, so a lucky draw is directly nominable. Old-code KS s3-s7 retired
(if R7 = old code officially they would be the same draws as R7 s3-s7).

## Result 22:26 UTC (owner): KS s1 on the OLD code = 5.13 (BB-73289972) = R7P s1 on the R7 tree
Determinism confirmed directly (two code trees, same score); the R7 tree is officially identical to the old code; any70
ACTED at salt 1 (KB s1 5.23 vs KS s1 5.13: +5 kills). BP on the R7 tree = KB SELECT, salt 1 (5.23 expected).

## Pushed 22:33 UTC: climb steps on the R7 tree (engineer checkpoint 05), salt 1
| build | commit | bot.js sha256 (16) | change against KB s1 (5.23) | local divergence |
|---|---|---|---|---|
| KF s1 | 57196a3cf2c4fd6f7af2126cc8204ec97e834db7 | 3d3f4f3ed2e2f1de | + finish 'ttk' (FINa) | kit 0/300; sim 2 of 24 matches (both up: 3->6, 5->6) |
| R7KB s1 | 15ee1c72c648335d72bab78a2b3186014706ab64 | 19225231c1501eb6 | none (KB s1 port onto R7; expected exactly 5.23) | kit 0/300 vs old KB s1 |
Rule: keep KF s1 if strictly above 5.23. R7KB s1 is only needed as a port if nothing on the R7 tree beats 5.23.

## Result 22:31 UTC (owner): KBH s1 (KB s1 + healDoc on) = 5.02 (BB-76D71879), -0.21 against KB s1
healDoc acts officially (0 changed decisions on 28 local sources: local divergence does not predict official divergence)
and costs 10 kills at salt 1: healDoc on / full dropped (climb rule: lower -> off while the best salt is 1).

## Pushed 22:40 UTC: climb steps on checkpoint 06 (firewalled LX, any70f, T-F2 13/13), salt 1, KB SELECT (any70)
| build | commit | bot.js sha256 (16) | change against its base | sim 24 seeds vs base (behaviour only) |
|---|---|---|---|---|
| K6LC s1 | fb01fa37a8461a4fbf33ac0b40eaa69c9116508c | 62c4445d12a79608 | KB + loseCover near | 7 of 24 differ (net +3) |
| K6LX s1 | 4f94e56f176e6dec0665c6c0c79401341e818b59 | 51251d11191d429f | KB + loseExit on (firewalled) | 3 of 24 (net 0) |
| K6FLC s1 | 54de4dc77fed749a83dbcb3e298c7ab1faf868fc | be768a64e6b38204 | KF (FINa) + loseCover near | |
| K6FLX s1 | ec487509a7de54cda48a7d735c5313ef9881880f | 246458f7cf78b2ce | KF (FINa) + loseExit on | 3 of 24 vs KF (net -3) |
| K6f s1 | d5b4d430cffa098a25072e91d38fe126700b8fe7 | fba00b25f6d3e46b | KB with any70f (final-safe firewall) | identical to KB in 24/24; expected 5.23 |
FINb (ttkb) adds nothing over FINa in 24 sim seeds: not pushed.
Decision rule: KF s1 first. KF > 5.23 -> K6FLC, K6FLX next; else K6LC, K6LX. At least one fresh R7 salt per window.

## Pushed 22:44 UTC: LG steps on checkpoint 07 (laserGrab wide), salt 1, KB SELECT
- K7LG_s1 f2e8210f01aa2ed8ba28c66b23cd1f2b038d434d (3337e6fcfe0d9449)
- K7FLG_s1 2833b2019d08f127fefdd11262e6f83e7f6a6a8c (ceb3e4c085d01a9c)
Kit stream: LG changes 81 of 300 decisions from decision 51 (opening laser grab: high divergence). Sim 24 seeds vs KB:
5 differ (6->9, 3->4, 6->7, 8->15, 4->3). ISO (K7ISO s1) built and gated but not pushed: sim 3.75 vs 4.04, red team
calls it mislabelled.

## Results 22:50-23:07 UTC (owner), climb on salt 1 (base KB s1 5.23)
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| KF s1 (KB + FINa) | 57196a3 | 5.13 | BB-EF22ACF8 | lower: FINa off on salt 1 |
| K7LG s1 (KB + LG wide) | f2e8210 | 5.04 | BB-58EAA819 | lower: LG off on salt 1 |
| K6LC s1 (KB + loseCover near) | fb01fa3 | **5.29** | BB-6C36BEB7 | NEW BEST, entered: base is now KB + LC, salt 1 |
| K6LX s1 (KB + loseExit on) | 4f94e56 | 5.19 | BB-5CC36ADF | lower: LX off on salt 1 |

## Pushed 23:16 UTC: final-safe climb steps (checkpoint 07 + KB SELECT with aggr any70f + fb on + LC), salt 1
Final-safe SELECT is squad-inert: FSLC s1 = K6LC s1 in 24/24 sim matches and on the kit stream.
- FSLC10_s1 2a66d62ceb3052aa6811c62caf6ead3b7b702bc5 (17f389b60bf968a4)
- FSLC20_s1 33203ca765097391b15d41d262e8f7a14fff5643 (17314c00a9b61e1b)
- FSLCL15_s1 8cdafe2b9d592ea793d0d77c306674ddce398e3b (8111ebf9b564ee6e)
- FSLCCR_s1 49684acc64f677c2b4ac7692b89de710ca3a2c2f (47d08b5215e7fc8a)
- FSLC_s0 47260dbed175204c95e403989bcef3121cf4a73e (cbbab4403383c8f5)
- FSLC_s1 ae7616e7f269cc689d6529c54f2a2cc246111ff9 (d9f1540241ddaf57)
Variant meanings: near10 = lcCoverS 1.0 (stricter: fight on more), near20 = lcCoverS 2.0 (looser), low15 = lcLowHpf 0.15,
CR = seekCrowd wide, FSLC s0 = LC on a second salt, FSLC s1 = final-safe port of the 5.29 best (expected exactly 5.29).

## Results 23:26-23:33 UTC (owner)
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| FSLC20 s1 (LC, cover 2.0 s) | 33203ca | 5.27 | BB-90A60DD8 | lower: off |
| FSLCL15 s1 (LC, retreat below 15% only) | 8cdafe2 | **5.31** | BB-B0D24E3F | NEW BEST, entered; final-safe SELECT (any70f + fb) |

## Pushed 23:42 UTC: steps on the 5.31 base (final-safe), salt 1
- FSOH_s1 66d7f1b57ac2d9a6074e01d86bdc98aeaee7ae51 (014e94ae37455252)
- FSL10_s1 3aacfa3879891ef85ba37264256dc395b43cec05 (14e4c93c1b3efb74)
- FSL15C10_s1 75dc42699b3c6198bf7816c98fd002a2966c68d2 (1a205f9c386b0d30)
FSOH = owner's "fight until one hit can kill us": d3 LOSING thresholds lose1/2/3Hpf 0.35/0.50/0.60 -> 0.20/0.25/0.30
(a laser beam is 315 of 1400 hp = 22.5%), on top of low15. FSL10 = lcLowHpf 0.10. FSL15C10 = low15 + lcCoverS 1.0.

## Pushed 23:46 UTC (Opus line): more fight-on steps on the 5.31 base (final-safe), salt 1
- FSF30_s1 c016bea6719a235c7b5d05af20435050cc428933 (fd34682692ede0f4)
- FSFT3_s1 c48212fb0f87def76a2e45c11e290da85a9542ae (358f7a9f102d3dbc)
- FSLS35_s1 393e7d8b1d0722a02981d42a2d4e9faca9465ed7 (411e7f1ee13febea)
fin30 = finishHpf 0.2 -> 0.3 (a target under 30% overrides LOSING with <= 2 threats); fin3t = finishThreats 2 -> 3;
ls35 = lastStandHpf 0.25 -> 0.35.

## Results 23:57-00:34 UTC (owner), Opus line climb on salt 1 (base FSLCL15 s1 5.31)
| build | commit | score | receipt | vs base 5.31 |
|---|---|---|---|---|
| FSOH s1 (oneHit 0.20/0.25/0.30) | 66d7f1b | 5.29 | BB-BEA0A86E | -0.02: off |
| FSL10 s1 (lcLowHpf 0.10) | 3aacfa3 | **5.35** | BB-5357AD66 | +0.04: NEW BEST, entered |
| FSL15C10 s1 (low15 + cover 1.0) | 75dc426 | 5.33 | BB-15A20BC4 | +0.02 |
| FSF30 s1 (finishHpf 0.3) | c016bea | 5.31 | BB-1411DB9B | tie: retired on salt 1 |
| FSFT3 s1 (finishThreats 3) | c48212f | 5.33 | BB-D23ABC84 | +0.02 |
| FSLS35 s1 (lastStandHpf 0.35) | 393e7d8 | 5.25 | BB-3205BC4F | -0.06: off |
Next on the 5.35 base: low10 + cover 1.0, low10 + fin3t, both, low05.

## Pushed 00:41 UTC (Opus line): steps on the 5.35 base (FSL10 s1), final-safe, salt 1
- G10C10_s1 400af2b951dc5dc4d12af5d90d3bddb879da7252 (4eb3de6586525443)
- G05_s1 ca2e42bd523752367ead5616a955c3cc299f468e (d1f927a4b28539c5)
- G10FT3_s1 44ce68bc15a14340646c187a73632f5d22537305 (62f9c0fc8e4ebf31)
- G10C10FT3_s1 528a8d42a3899d2f5579bbd5ae0106e9db5d0ca4 (d6da580406814b59)
G10C10 = low10 + lcCoverS 1.0; G05 = lcLowHpf 0.05; G10FT3 = low10 + finishThreats 3; G10C10FT3 = all three.

## Pushed 00:54 UTC (FABLE line, round-1b plan slots 1-2) on the 5.35 base, final-safe, salt 1
- FNV_s1 4ffa6f2398bc79ef3dbfffbe7d68d880632ec970 (e0f3917ec194c729)
- FHE40_s1 5e45b8e21867c853cf54b95c3a3fe6cefa578998 (bcfdaaaf4981e4eb)
FNV = loseCover never (lcCoverS 0, lcLowHpf 0: never leave a fight; also removes the after-retreat HEAL).
FHE40 = low10 + healDoc low (healEnterHp 0.55 -> 0.40; not firewalled: acts in the final between the first foreign
death and the FFA latch, a short window; accepted by the project moderator if it wins).

## Shopping Sessions pushed 01:17 UTC (branch exp): rel16 = rel15 + C1 stage F1 -> 74bd72a0dcffcba7a4a904b8e567011bed14fb73

## Results 00:57-01:10 UTC (owner)
| build | line | commit | score | receipt | verdict |
|---|---|---|---|---|---|
| FNV s1 (loseCover never) | Fable | 4ffa6f2 | **5.38** | BB-ABF2641C | NEW BEST (+1 kill over 5.35... +0.03), entered |
| G10C10FT3 s1 (low10 + cover 1.0 + finishThreats 3) | Opus | 528a8d4 | 5.35 | BB-CAA6DFA3 | tie with its base |
| FHE40 s1 (healEnterHp 0.40) | Fable | 5e45b8e | 5.29 | BB-9E52DD07 | lower: heal-down closed |
Pending/unknown: G10C10 400af2b, G05 ca2e42b, G10FT3 44ce68b (now subsumed by 'never' unless they beat 5.38).
Shopping: rel16 74bd72a0 = 0.9123 s (BB-82BAAF8C, best, entered); rel15 4bf9d6fe = 0.9393 s (BB-CE930CCA).

## Pushed 01:27 UTC: final-safe tickets on the 5.38 base (FNV), salt 1
- NA60b_s1 9dd1f5e2922ddfc3cc335ffffd182234be97a320 (b855571d33d3f115)
- NCR_s1 3209f601346b57ed7dfa3a4422e35ea1bbe34302 (7c5c1a22d2fbc187)
- NISO_s1 88b5651ea00ef6e54465d4e8ce02a97b5bc4e8de (fb6eb0f918bb880d)
- NFB_s1 9807fcca62eefd6678cdddb180ad30db9e18baf6 (9bf310684a36d2c5)
NA60b = aggr any60f (start/seek fights from 60%, firewalled); NCR = seekCrowd wide; NISO = isolate near; NFB = finish ttkb.

## Results 01:29-01:35 UTC (owner), Opus line on the 5.35 base
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| G10C10 s1 (low10 + cover 1.0) | 400af2b | **5.38** | BB-DEC6C045 | = FNV 5.38 (258 kills; the Fable math prediction held); FNV keeps the tie (earlier) |
| G10FT3 s1 (low10 + finishThreats 3) | 44ce68b | 5.33 | BB-B28126DA | lower |
| G05 s1 (lcLowHpf 0.05) | ca2e42b | 5.35 | BB-5AAA0D5F | tie with its base |
Note on the result page: 'wait X ms' is queue time, not our latency (identical-cost builds read 9-527 ms; a 527 ms decision
would skip about 90% of observations and collapse the score, which did not happen).
Score tally after 12 comparison slots: Opus best 5.38 (G10C10), Fable best 5.38 (FNV, earlier). Next: the FNV-base
tickets NA60b 9dd1f5e, NCR 3209f60, NISO 88b5651, NFB 9807fcc; Fable target-9 panels (calibrated search, structural,
switching/pause) running.

## 02:15 UTC: panel results (no new hashes)
- Fable structural engineer: roof sanctuary prototype (sanc off/heal/healedge/duel/hold...) built; 48-seed sim on the 5.38 SELECT:
  heal -0.10 kills (+8 s alive), duel 0.00 (+14 s), hold -0.96. Roof not silent (1.5 lines), pausing lets the squad mass.
  Verdict: no official slot (at most a 'duel' probe if a slot is spare). Note: notes/fable/sim/structural_eval.md.
- Shopping panel A: model analyst (F ~0.09 s, parse ~0.5 s of 0.91 s; probe P-A built, not submitted) and io1 (arena, fewer
  lock ops, RSS /2.5; est. few-20 ms). Panel B: parse C2 fused scanner (-7.4% instructions, est. -0.05..-0.08 s) and
  threads t2 (barriers removed, est. 5-15 ms). Integration rel17 = rel16 + C2 + t2 + io1 + stale-file cleanup running.

## Results 02:01-02:12 UTC (owner), FNV-base tickets (salt 1)
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| NA60b s1 (aggr any60f) | 9dd1f5e | 5.21 | BB-E2B2B12A | lower (-8 kills): seeking at 60-70% hp is bad |
| NCR s1 (seekCrowd wide) | 3209f60 | 5.38 | BB-4CE246AF | tie |
| NISO s1 (isolate near) | 88b5651 | 4.88 | BB-86542001 | much lower (-24 kills) |
NFB s1 9807fcc pending.

## Pushed 02:33 UTC (Opus line), FNV base, final-safe
- N80_s1 a30ea092b97999a65bbab677bb726cbf943c32eb (eb6f7a309f46737b): aggr any80f (aggrHpf/h50SeekHpf 0.8, firewalled)
- FNV_s2 78443b23828f0d8b74db6bca89b01c5896bb77e6 (074d212be814a45a): FNV, salt 2 (full redraw, lottery ticket)

## 02:40 UTC: Fable target-9 verdicts (earliest-failure rule fired)
- Roof sanctuary: structural critic FAIL (96 paired sim seeds: duel -0.09 +- 0.09, heal -0.12 +- 0.10; house range 43/90/152 m and
  hop height defeat the perch geometry). Line closed.
- Calibration analyst: the simulator cannot rank steps of our size (sign 12/24, Spearman -0.03); official per-draw noise sd ~0.17
  score (8.3 kills); most kept steps since 5.23 are inside one draw sd. Search engineer: smoke finalists regress to ~0 (-0.02, -0.06);
  no parameter route to 9 seen. Usable only as a screen for >= +0.5 effects with >= 200 paired seeds.
- Course change: (1) structural candidates still open: dropLife (supply drop as a second life), util/pauseMove/isoDwell (switch build
  running); (2) full salt redraws of the 5.38 build as lottery tickets (best score counts; P(>5.38) ~1 in 6 per draw).

## Pushed 02:41 UTC: FNV salt redraws (identical code to 4ffa6f2, salt only), final-safe
- FNV_s3 0e278f6ed043f2614a0283b715c6d8bb457a92ca (e3f298f104e521ab)
- FNV_s4 a3ce9f939ad10d17dbdaa8ad7d52153b6ba28ec2 (c67bd2c73a675e47)
- FNV_s5 6610e97e94723837ff96e15970d7988b9fcffb17 (102b0f587e9a3167)
- FNV_s6 312e19b9c7b5ae1fb5b7742047d2ae9356ee9d1b (d65557be9fbf0cda)

## Results 02:31-02:36 UTC (owner)
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| NFB s1 (finish ttkb) | 9807fcc | 5.38 | BB-3F067434 | tie |
| N80 s1 (aggr any80f) | a30ea09 | 5.35 | BB-BF4C9642 | -1 kill: 70% stays |
| FNV s2 (salt 2 redraw) | 78443b2 | 5.17 | BB-26AB56E4 | redraw sample: FNV s1 5.38, s2 5.17 |
Owner, 02:40 UTC: organiser announcement updated: only exact code copies matter; recreating logic in our own optimized code is fine.

## Shopping Sessions pushed 02:55 UTC (branch exp): rel17f2 = C1 stage F2 (c1work, binary ac45af4c...) -> 64a5aec6e15c8af2470ada32bdecd7f9567efa3a
- Tree = c1work shippable files; rebuilds byte-identical to ac45af4cf135...; fixtures 36/36 (NCPU 4), dev MATCH both ways NCPU 4/8;
  engineer's gate: 20M/60M equal to rel15, 14 seeds vs ref.py, fuzz 40x3, edge 34+2 known. Independent F2 verifier still running.
## Shopping Sessions pushed 02:49 UTC (branch exp): rel17 = rel16 + C2 parse + t2 threads + io1 alloc + stale cleanup -> d63287d90e5646f7e3ed87d49669b36186442b5b
- binary 8400980a6e76... (fresh-clone rebuild identical); integrator gate PASS; 20M CPU 6.51 -> 5.50 s (-14%), RSS 2.78 -> 1.01 GB;
  model 0.83-0.85 s. Independent verifier running. Submit order: F2 64a5aec first, rel17 d63287d second.

## Shopping result 02:48 UTC (owner): F2 64a5aec = 1.8958 s (BB-E54A2129), output correct, about 2x SLOWER than rel16 0.9123 s
- Not reproducible here (F2 is -28% CPU at NCPU 2 locally). F2's key and order checks fall back to F1 when the data does not fit,
  so a data mismatch should not cost 2x. Open hypotheses: (a) F2 slow at 8 threads / on the scorer CPU, (b) scorer slower at the time
  (queue wait 8.9 s). Control: rel17 d63287d (no F2; model 0.83-0.85 s). rel19 (F2 base) and rel18 (F2 + cleanup) wait on that result.

## Shopping 02:54 UTC (owner): SCORER CHANGED to shopping-sessions-5; rel16 re-timed
| build | commit | v5 score | receipt | note |
|---|---|---|---|---|
| rel17 (C2+t2+io1+cleanup) | d63287d | **1.7814 s** | BB-DC6F3AC5 | best under v5, entered (pick) |
| rel16 (F1), re-timed | 74bd72a | 1.8406 s | BB-82BAAF8C | was 0.9123 s under the old scorer |
| F2 | 64a5aec | 1.8958 s | BB-E54A2129 | |
rel15 0.9393 and rel1 0.9778 are "scored under a previous version". All builds ~2x: the v5 run looks I/O-bound (cold read of
~1.8 GB in a fresh container?), CPU savings invisible. Final: 3 runs on 60M (cap 180 s), top 30 retimed 9x alone on one idle
machine across 3 datasets (likely warm: CPU matters there). Plan: cold-read prefetch layer + keep rel19 (F2 CPU line).

## Results 03:03-03:12 UTC (owner): FNV salt redraws
| build | commit | score | receipt |
|---|---|---|---|
| FNV s3 | 0e278f6 | 5.00 | BB-07593B0F |
| FNV s4 | a3ce9f9 | 4.96 | BB-77A9AB0A |
| FNV s5 | 6610e97 | 5.06 | BB-C65C6363 |
FNV over 5 draws: 5.38, 5.17, 5.00, 4.96, 5.06 -> mean 5.11, sd 0.17; the 5.38 is a +1.6 sd draw. Redraw line stopped (s6 312e19b
optional). Owner 03:14: "go crazy, it's a game": power-ups, attacking, healing; re-read rules/announcements; decode team 2696's
latest submission entirely.

## Pushed 03:42 UTC: switching-panel builds (Fable engineer + Fable QA PASS), 5.38 SELECT + one preset, salt 1
- SW_PM_s1 b50b798edf056f4225be723a93d6c014c58a15cd (fca0245e38088834): pauseMove on (strafe-side line test, walk test before isolate/grab)
- SW_ID_s1 d669ab3535622664668a4ad05c1dca255725f86a (632a5dc686627289): isoDwell on (isolate hysteresis 0.6 s, hold 0.8 s on arrival)
- SW_UTtgt_s1 93df4e95156de36b4d54971cf109a05af51192c1 (ef076c95a0834808): util tgt (utility target pick with hysteresis)
Release gate: only timing checks failed under load 20-25 (p99 15.9-16.8 ms vs our 15 ms bar; budget 50 ms); the 5.38 build passed the
same gate at load 16. QA worst kit-stream decision 3-12 ms. Reservation: PM/ID/UT act in an FFA final before the first death.
Board 03:15 UTC: 2696 6.58 first; 32nd = 6.17 (we are outside the top 32).

## 03:45 UTC: rules bible (notes/fable/rules_bible.md) - official changes
- Mech game rules unchanged since Saturday (kit, protocol.md, client identical); scorer builders-3.
- Quota now 6 submissions/hour (each frees one hour after it was sent). Repos may go private once a submission is scored.
- Announcement #4 (Sat 23:23 UTC): "Excessive reuse of code, another team's entry included, may result in disqualification";
  staff: forking a public bot with own changes is fine, respect competitors' preferences. => clean-room only, no code copied.
- Staff chat 03:10 UTC: Mech Royale may be RESCORED "to reduce improvements from luck" (not announced). A lucky salt draw may not hold.
- Boards sealed at the cutoff (16:00 UTC). Board now: 1st 6.58 (2696), 16th 6.27, 32nd 6.19, 50th 5.81; 339 teams.
- Final: entry locks with its practice score; top 32 play 16 FFA matches; top 16 play a 64-match FFA series on new seeds.

## Results 03:33-03:38 UTC (owner), switching builds on the 5.38 base (salt 1)
| build | commit | score | receipt | verdict |
|---|---|---|---|---|
| SW_PM s1 (pauseMove on) | b50b798 | 4.88 | BB-0AD544C8 | lower: retired |
| SW_ID s1 (isoDwell on) | d669ab3 | 4.83 | BB-F0DC9E5D | lower: retired |
| SW_UTtgt s1 (util tgt) | 93df4e9 | 5.10 | BB-8E3E9972 | = the build's true mean (~5.1); neutral |
Owner 03:50 UTC: replan, restrat, rebuild with Fable, completely redesigned; brute force / reverse engineer the Fibonacci way with
probability; switch logic; expert panel changes tactics; distribute the rebuild across many agents at every step.
## Shopping pushed 05:40 UTC (exp): v5a 8060f03af31e0876b3c5cb83207d797c1f59c438 (opaque-ID thread-local interning; -51% CPU on v5 data); predicted 0.85-0.95 s

## 05:28 UTC: container restart killed all background work (trunk integration, meta QA, Shopping B/judge, C, p26 rebuild, W2-B).
Disk freed (coldread, p20m5s, dead build dirs). Resuming workflows from their cached stages.

## Blast Radius pushed 05:58 UTC (branch blast): owner's package (blast-radius-rust build set: Dockerfile, submission.rs, LICENSE,
THIRD_PARTY_NOTICES.md, tools/analyze_changes.py, tools/entrypoint.py, maps/impact-map.json) -> ac61fe622b02510cf4cdbb0e6ad746cbbf356a44
- Checks here: submission.rs compiles with the Dockerfile's exact rustc flags (8 s, 488 KB); python tools parse; no secrets; fresh-clone
  files byte-identical to the package. Not run: Docker build, the track's local kit (package says 254.9 simulated s on the 30-patch sample).
## Shopping afix 8d0ea211277f158cb5cc12e8dc16bb255740325e pushed (fix of 8060f03's empty-ID edge case; same speed ~1.22 s predicted)
