# Measured effects on the official practice scorer, and audit of Amendment V3

Built 21 Nov from other teams' published logs (`tools/evidence/build_measured_deltas.py`; machine-readable copy in `notes/measured_deltas.json`, 155 records). All source paths are relative to `intel/`.

## 1. Records

Scorer column: `official` = 48-seed practice score (both numbers official when both are present); `sim` = a team's local simulator; `rec` = statistics from recorded public matches; `live` = private rooms on the real server. `n` = number of behaviour changes in the submission.

### Engagement range

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| R01 | V.exe (jackbalseca) | Hold 130 m with gun / 160 m with laser and backpedal while firing (on the v3 bot) | 3.81 | 3.04 | -0.77 | official | 1 | BB-C8CC3711 | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` | simulator had predicted +0.3 to +1.0 |
| R02 | V.exe (jackbalseca) | Closer engagement: gun 40 m, laser 60 m (on v3) | 3.81 | 3.79 | -0.02 | official | 1 | BB-927E23D7 | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` | no effect |
| R03 | nullat0m7 | Seven changes at once: gun 170 m, laser 210 m, loadout re-weighted toward gun, stand still to regen when unseen, keep >60 m from lightning carriers, earlier retreat per extra shooter, outnumbered at 2 | 4.44 | 3.98 | -0.46 | official | 7 |  | `nullat0m7__mech-royale/PATTERNS.md`; `nullat0m7__mech-royale/CHANGELOG.md` | author: long range confounded; simulator predicted 7.63 |
| R04 | swan28pande | Gun range 85 -> 130 m together with strafe flips every 0.4-0.9 s and heal to 95% before re-engaging | 4.21 | 3.94 | -0.27 | official | 3 |  | `_meta/swan28pande__oval-tools.git@87d5176 (commit message)`; `_meta/swan28pande__oval-tools.git@0566bf3 (commit message)` |  |
| R05 | swan28pande | Same bundle with range back at 85 m (keeps fast flips, heal to 95%) plus >=75 m from lightning carriers | 4.21 | 3.62 | -0.59 | official | 3 |  | `_meta/swan28pande__oval-tools.git@10597f8 (commit message)` | worse than the 130 m version, so range is not the main loser here; which of the two later commits scored 3.62 is inferred from commit order |
| R06 | alexwilldev | Laser range 230 -> 255 m (batch 18 vs 17) | 3.79 | 3.42 | -0.37 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` | simulator said 5.10 |
| R07 | alexwilldev | Laser range 255 -> 150 m (batch 19 vs 18) | 3.42 | 3.60 | +0.18 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| R08 | alexwilldev | Laser range 150 -> 110 m and gun 130 -> 90 m (batch 20 vs 19) | 3.60 | 4.13 | +0.53 | official | 2 |  | `alexwilldev__mechroyale-bot/STATUS.md` | team best; 'shorter ranges help for real' |
| R09 | dmclaughlin-bit | Remove the rule that holds gun fire beyond 100 m (shoot at any range) | 2.38 | 2.04 | -0.34 | official | 1 | BB-07153949 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| R10 | BingBU (niranjankumarnk) | Fight at about 145 m instead of 85-125 m (experiment A) and cover-step positions (B) |  |  |  | official | 1 |  | `_meta/niranjankumarnk__mech-royale.git@6bf8f4c (commit message)`; `niranjankumarnk__mech-royale/README.md` | both 'scored lower' than v1; no numbers published |
| R11 | MauroMiranda28 | More aggressive: engage any visible mech to 160 m (was 95), gun fight range 75 -> 55 m, close on fights sooner | 4.00 | 3.71 | -0.29 | official | 3 |  | `_meta/MauroMiranda28__mech-royale-bot.git@2ec6d2f (commit message)`; `_meta/MauroMiranda28__mech-royale-bot.git@1c04e84 (commit message)` |  |
| R12 | KennethLei1492 | Absolute: sniper play, laser engages to 280 m and kites to 130 m, gun+laser priority |  | 4.52 |  | official | 1 |  | `_meta/KennethLei1492__Builder-Mech-Royale.git@d33a9d8 (commit message)` | first score; simulator had said 7.32 |
| R13 | A-bot LLC (Kgc3105, inferred from timestamps) | Absolute: the 5.58 bot holds 125-185 m when it has a laser and backs away firmly (boost if a mech gets well inside) |  | 5.58 |  | official | 1 |  | `_meta/Kgc3105__MAGIC-Royale.git@f0a85ee (commit message)`; `_meta/Kgc3105__MAGIC-Royale.git@e39579f (commit message)` | not an A/B; identity inferred: 5.58 commit 03:30 UTC, board entry 03:37:53 UTC |
| R14 | Wolverines (TTUN v8-econ) | Absolute: the 5.19 bot prefers 70 m gun-only, 110 m with laser, 28 m with lightning, +-15 m dead band, retreat stick 0.7 |  | 5.19 |  | official | 1 |  | `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts`; `_meta/varchaskukreja__TTUN.git@11350d3 (commit message)`; `moonriver0922__wgsrobot/experiments/README.md` | read from code, not an A/B; the restored 5.19 commit is byte-identical to this snapshot |
| R15 | nullat0m7 | Absolute: the 4.44/4.46 bot fights at 75 m gun, 120 m laser |  | 4.46 |  | official | 1 |  | `nullat0m7__mech-royale/CHANGELOG.md` |  |

### Hiding, pacifism, hold-fire

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| A01 | LanceHuang245 | Probe: hide and hold fire at range ('patient') with quiet walking | 4.54 | 4.04 | -0.50 | official | 1 |  | `LanceHuang245__mech-royale/README.md` | simulator predicted ~3.2-3.5: real house bots chase a hider less than modelled |
| A02 | nullat0m7 | Stand still and silent whenever unseen and under 85% hp, plus count trees as cover | 4.44 | 4.00 | -0.44 | official | 2 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |
| A05 | A-bot LLC (Kgc3105, inferred) | Stop hiding on low health or when out-gunned by a laser (leave hiding at 50%); crates only within 100 m (was 150); loose cubes to 130 m (was 90) | 5.58 | 5.17 | -0.41 | official | 3 |  | `_meta/Kgc3105__MAGIC-Royale.git@e39579f (commit message)` | simulator said +0.25; author: sim undervalues falling back to cover and repairing |
| A06 | Achintya-Lakshmanan | 'Combined caution': break off when 2 aim at us, duck on reload, 45 m | 3.29 | 2.69 | -0.60 | official | 3 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |
| A13 | MauroMiranda28 | Break line of sight and heal instead of trading; start fights only inside 60 m; less farming | 3.54 | 2.85 | -0.69 | official | 3 |  | `_meta/MauroMiranda28__mech-royale-bot.git@98b2031 (commit message)` |  |
| A14 | MauroMiranda28 | Fight in the open; hide only under 50% hp, against 2+ threats or a clearly stronger enemy | 3.54 | 3.31 | -0.23 | official | 1 |  | `_meta/MauroMiranda28__mech-royale-bot.git@98b2031 (commit message)` |  |
| A15 | MauroMiranda28 | Pacifist base with constant jinks and living at the zone edge | 3.54 | 2.21 | -1.33 | official | 3 |  | `_meta/MauroMiranda28__mech-royale-bot.git@98b2031 (commit message)` |  |
| A17 | prakash-218 | Fight from cover spots, hide from charging lasers, peek, charge laser behind cover | 3.98 | 3.27 | -0.71 | official | 4 |  | `_meta/prakash-218__buildathon-mech.git@4983df2 (commit message)` |  |
| A18 | Goonies (koillea) | Cover-first combat (never trade in the open: cover, peek, duck) plus 130 m laser detour | 3.52 | 2.58 | -0.94 | official | 2 |  | `_meta/koillea__mech-royale-goonies.git@f83a047 (commit message)` |  |
| A19 | Goonies (koillea) | Fire discipline: shoot a mech only if it hit us in the last 4 s or is inside 40 m; no crate shooting; avoid fights | 3.52 | 3.19 | -0.33 | official | 3 |  | `_meta/koillea__mech-royale-goonies.git@e0aaf30 (commit message)` |  |
| A20 | kyoto-max | Hide profiles vs the fighting v1 (3.6): ghost 2.67, ambush 2.81, precomputed low-exposure hideouts 2.96 | 3.60 | 2.96 | -0.64 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@2e0cc64 (commit message)`; `_meta/kyoto-max__Mech_Royale.git@463b269 (commit message)` | best of the three hide profiles shown; worst -0.93 |
| A22 | ourux | Avoid everyone until t=380 s or <=3 alive, fight back only at close range | 4.33 | 2.58 | -1.75 | official | 1 |  | `_meta/ourux__MechRoyale.git@7858b38 (commit message)` |  |
| A24 | colton-boi | Pure stand-still-and-hide, fire only after being hit (vs 'survive' 2.56) | 2.56 | 1.73 | -0.83 | official | 1 |  | `_meta/colton-boi__Mech-Bot.git@d6dfb7a (commit message)` |  |
| A27 | KennethLei1492 | Scan spin, no drone/crate farming, sniper posts with partial sightlines, time budget | 4.52 | 3.88 | -0.64 | official | 4 |  | `_meta/KennethLei1492__Builder-Mech-Royale.git@d33a9d8 (commit message)` |  |
| A31 | afiapoks | Survival-first variant of the starter bot | 1.15 | 0.79 | -0.36 | official | 1 |  | `afiapoks__mech-royale/RESULTS.md` |  |
| A33 | micah-andelman | Absolute: own passive duel posture (quiet opening, heal to 90% between duels) |  | 2.40 |  | official | 1 |  | `_meta/micah-andelman__mech-royale.git@8b49a31 (commit message)` | their fork of another team's fighting bot scored 3.88 |

### Retreat and healing

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| A03 | nullat0m7 | Leave the regen state at 65% hp instead of 85% | 4.44 | 4.40 | -0.04 | official | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |
| A04 | nullat0m7 | Re-engage at 65% plus farm drones/crates only at >=85% hp (was 60%) | 4.44 | 4.31 | -0.13 | official | 2 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |
| A07 | Achintya-Lakshmanan | Regen behind cover | 3.29 | 3.21 | -0.08 | official | 1 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |
| A08 | dmclaughlin-bit | Break line of sight under 35% hp, heal below 90% standing still, hold fire unless hit in last 2 s, avoid vision cones | 2.23 | 2.04 | -0.19 | official | 3 | BB-AA244730 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| A09 | dmclaughlin-bit | Same as A08 but keeps firing normally while healing | 2.23 | 2.38 | +0.15 | official | 1 | BB-54EDF93F | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` | +0.34 against A08: the hold-fire gate was the cost |
| A16 | prakash-218 | Regen between fights, kill-time retreat, multi-threat cover | 3.98 | 3.85 | -0.13 | official | 3 |  | `_meta/prakash-218__buildathon-mech.git@4983df2 (commit message)` |  |
| A21 | kyoto-max | Below 60% hp with no enemy in sight: stop seeking/farming, go to a walled cell within 24 m, wait to 90% | 3.96 | 3.88 | -0.08 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@41b63e8 (commit message)` |  |
| A25 | Rohanasudani | Break contact below 72% hp to regenerate | 1.56 | 0.46 | -1.10 | official | 1 | BB-E5AF82EF | `Rohanasudani__edgewise-mech-royale/SUBMISSIONS.md` |  |
| A26 | joekritenbrink0-wq | Disengage under 33% and regen to 75%, exposure-scored combat movement, path planning, supply drops | 3.94 | 3.79 | -0.15 | official | 4 |  | `joekritenbrink0-wq__mech-bot/README.md` |  |
| A28 | V.exe (jackbalseca) | Break line of sight to cover when hurt or outnumbered, regen, re-engage; wider weapon search | 3.44 | 3.58 | +0.14 | official | 2 | BB-B64270EC | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` |  |
| A30 | AbhinavDasari-pennstate | After a kill: loot, then rest up to 8 s without firing until 85% hp |  |  |  | official | 1 |  | `_meta/AbhinavDasari-pennstate__fog-of-war-mech.git@c10bf67 (commit message)` | reported delta -0.06 on the board ('noise'); absolute scores not given |

### Aggression

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| A10 | Team-Xero | Solo duel on v3.1: fight a lone attacker head-on, no cover runs, retreat only under 25% | 3.00 | 3.19 | +0.19 | official | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` |  |
| A11 | Team-Xero | Solo duel on v5 | 3.75 | 3.52 | -0.23 | official | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` | v5 itself scored 3.75 and 3.90 on two runs; sign opposite to A10 |
| A12 | Team-Xero | Solo duel + attack a lone visible enemy within 220 m when hp > 70% + farm drones | 3.35 | 2.98 | -0.37 | official | 3 |  | `arnabxero__xero-mech-royale/STATUS.md` |  |
| A23 | ourux | In practice fight every visible hunter; hunt a second weapon when the slot is empty | 4.33 | 4.15 | -0.18 | official | 2 |  | `_meta/ourux__MechRoyale.git@1a96803 (commit message)` | simulator said +1.2 |
| A29 | V.exe (jackbalseca) | Never retreat in the final 1v1; face whoever is hitting us now | 3.81 | 3.50 | -0.31 | official | 2 | BB-150F3F5C | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` |  |
| A32 | dmclaughlin-bit | Fight-or-flee by time-to-kill vs time-to-die: fight on against a single enemy when ttk < ttd; commit to a target within one magazine when no second enemy sees us (only above 35% hp) | 2.54 | 2.88 | +0.34 | official | 2 | BB-2897E011 | `_meta/dmclaughlin-bit__mech-bot.git@dc5ce9b (commit message)`; `_meta/dmclaughlin-bit__mech-bot.git@7c14e83 (commit message)` | baseline is 2.44 instead (delta +0.44) if it was scored before the farm-reach build was merged in |

### Movement

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| M01 | BackwardsDeployeds | Quiet walking (<=4.6 m/s near known enemies) switched off on the Lance v0.5 bot | 4.54 | 4.75 | +0.21 | official | 1 | BB-E8B2D8F9 -> BB-6E7BFB8D | `_triage/raw/bd_docs_RESULTS.md` | same 4.75 reproduced by another team with the same configuration: _meta/davidvarvas__mech-royale-bot.git@d4737f6 (commit message) |
| M02 | r1ver (moonriver0922) | Slow walk + destination commitment -> normal walking speed + supply-capture fix | 4.54 | 4.67 | +0.13 | official | 2 | BB-407987E8 -> BB-2DE41BE7 | `moonriver0922__wgsrobot/experiments/official-runs.md` |  |
| M03 | Team-Xero | Faster strafe reversals on v5 | 3.75 | 3.06 | -0.69 | official | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` | v5 scored 3.75 and 3.90; interval values not published |
| M04 | alexwilldev | Range play (laser 150, gun 90) with faster strafe flips 0.5-1.3 s (batch 13 vs 12) | 3.46 | 3.46 | +0.00 | official | 2 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| M05 | MauroMiranda28 | Bundle: no farming with a mech within 100 m, upgrades armor>sensors>gyros>plating, gated laser dodge, wider scan, no boost outside combat | 4.00 | 3.54 | -0.46 | official | 5 |  | `_meta/MauroMiranda28__mech-royale-bot.git@2ec6d2f (commit message)` | simulator said +0.61 |
| M06 | BackwardsDeployeds | Charge-aware movement fix (content inferred from adjacent commit subjects: no false stuck recovery while a laser charges) | 4.75 | 4.79 | +0.04 | official | 1 |  | `_meta/brycehcmcgrath__mechfight-bot.git@2dc3979 (commit message)` |  |

### Target choice

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| G01 | BackwardsDeployeds (GT Goats bot) | Magazine-aware finishing: prefer targets the current burst can kill | 3.71 | 4.10 | +0.39 | official | 1 | BB-141EA830 -> BB-AB2A1A6E | `_triage/raw/bd_docs_RESULTS.md` |  |
| G02 | V.exe (jackbalseca) | Engage only mechs that shot at us or aim at us (leave idle house bots alone) | 3.58 | 3.81 | +0.23 | official | 1 | BB-4D4C943D | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` |  |
| G03 | kyoto-max | Weight low hp heavily, sticky target, never retreat from a target under 30%, close to 30 m and boost after it | 3.69 | 3.60 | -0.09 | official | 2 |  | `_meta/kyoto-max__Mech_Royale.git@5d63434 (commit message)` |  |
| G04 | jmonked | Absolute: target by time-to-kill with a 'kill leash', chase finishable runners |  | 2.50 |  | official | 1 |  | `_meta/jmonked__monked-mech-royale.git@2400750 (commit message)` | later v10 base 2.85 |

### Loadout and pickups

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| L01 | dmclaughlin-bit | Laser first: walk to the nearest safely reachable laser before anything else | 2.38 | 2.27 | -0.11 | official | 1 | BB-DB8A4479 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| L02 | kyoto-max | Allow swapping the gun out (lightning 3.5 > laser 3 > gun 1): ends lightning + laser | 3.65 | 3.69 | +0.04 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@46ac97d (commit message)`; `_meta/kyoto-max__Mech_Royale.git@79fe56c (commit message)` |  |
| L03 | kyoto-max | Never give up the gun; second slot laser > lightning > mortar (gun + laser) | 3.98 | 3.77 | -0.21 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@5a971de (commit message)` | within their own measured re-roll noise (0.27) |
| L04 | MauroMiranda28 | Lightning brawler: prefer lightning, swap gun for it (laser + lightning), fight at 28 m, boost in from >45 m | 3.81 | 3.98 | +0.17 | official | 2 |  | `_meta/MauroMiranda28__mech-royale-bot.git@e603196 (commit message)`; `_meta/MauroMiranda28__mech-royale-bot.git@b75320f (commit message)` |  |
| L05 | BingBU (niranjankumarnk) | Absolute: lightning doctrine (lightning + laser, fights at 28 m, lightning upgrades) |  | 3.90 |  | official | 1 |  | `_meta/niranjankumarnk__mech-royale.git@fbf9a38 (commit message)` | later README keeps lightning + laser; team board score 4.58 |
| L06 | Goonies (koillea) | Take a laser within 70 m when no mech is within 80 m of it | 3.69 | 3.63 | -0.06 | official | 1 |  | `_meta/koillea__mech-royale-goonies.git@06ddf38 (commit message)` |  |
| L07 | BackwardsDeployeds (GT Goats bot) | Loot priority weight 1.0 -> 1.6 | 3.71 | 3.65 | -0.06 | official | 1 | BB-CA56EA1E | `_triage/raw/bd_docs_RESULTS.md` |  |
| L08 | Team-Xero | Laser-first loot priority + persistent cover + bullet/mortar dodging | 2.67 | 3.00 | +0.33 | official | 3 |  | `arnabxero__xero-mech-royale/STATUS.md` |  |
| L09 | MauroMiranda28 | Early weapon rush (first 45 s, up to 170 m for lightning/laser) + drop ambush + endgame caution | 3.98 | 4.00 | +0.02 | official | 3 |  | `_meta/MauroMiranda28__mech-royale-bot.git@b75320f (commit message)`; `_meta/MauroMiranda28__mech-royale-bot.git@63b88d6 (commit message)` |  |
| L10 | alexwilldev | Laser seeking mid-fight, weapon preference laser > mortar > lightning, gun range 130 m (batch 16 vs 15) | 3.52 | 3.85 | +0.33 | official | 3 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| L11 | alexwilldev | Add scan spin, early laser detour up to 400 m, laser range 230, strafe flip 0.6 s (batch 17 vs 16) | 3.85 | 3.79 | -0.06 | official | 4 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| L12 | Wolverines (TTUN v8-econ) | Absolute: the 5.19 bot never swaps the gun out; second slot laser 3.2 > lightning 2.5 > mortar 1; never swaps a charging laser |  | 5.19 |  | official | 1 |  | `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts` | read from code; the same team's other line prefers lightning 3 > laser 2.6 and is the 3.56 line of X02 |
| L13 | Lance lineage (LanceHuang245; forks: BackwardsDeployeds, Kanyaraasi) | Absolute: laser + lightning with gun only as fallback, never mortar |  | 4.75 |  | official | 1 |  | `LanceHuang245__mech-royale/README.md`; `_triage/readme/devakchow_team-kanyaraasi-mech-royale.md` | forks of this bot sit at 5.06 and 5.19 on the board |

### Upgrades

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| U01 | kyoto-max | Lightning-first order: plating, armor, lightning_efficiency, lightning_range, nanites, capacitor, laser_damage, reactor | 3.98 | 3.69 | -0.29 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@8b6a735 (commit message)` | their seed-only reshuffle moved the score by 0.27 |
| U02 | Wolverines (TTUN v8-econ) | Absolute: 5.19 bot order plating, armor, nanites, lightning_efficiency, laser_damage, laser_charge, gun_damage, gun_rate, lightning_range, lightning_chain, gyros, servos, gun_mag, capacitor, reactor, jets, gun_velocity, sensors, mortar_*, laser_pierce |  | 5.19 |  | official | 1 |  | `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts` | read from code |
| U03 | Showdown winners (7 matches) | Picks of the 7 recorded free-for-all winners: laser_damage 6 picks (4 winners), plating 6 (4), armor 6 (4), nanites 3, capacitor 4 (3), servos 3 (2), laser_charge 3 (2), sensors 2 |  |  |  | rec | 1 |  | `dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl` | 5-7 upgrades each; free-for-all, not practice |
| U04 | jmonked | Plating before armor (x1.15 vs x1.087 effective hp per pick; plating also helps against zone damage) |  |  |  | official | 1 |  | `_meta/jmonked__monked-mech-royale.git@c6c97c4 (commit message)` | reasoning only, no score |

### Cubes, crates, drones

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| E01 | kyoto-max | Early farming run until 200 s or 10 cubes while hp >= 50%: walk to 60 m of remembered drones / 25 m of ground crates | 3.69 | 3.96 | +0.27 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@2ef45b8 (commit message)` |  |
| E02 | kyoto-max | Farm longer: until 270 s or 21 cubes | 3.96 | 3.83 | -0.13 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@1921375 (commit message)` |  |
| E04 | MauroMiranda28 | Actively farm crates and drones until 230 s (walk to remembered ones, explore for more) | 3.46 | 3.83 | +0.37 | official | 1 |  | `_meta/MauroMiranda28__mech-royale-bot.git@7d7c9c3 (commit message)` |  |
| E05 | MauroMiranda28 | Push harder: cube memory to 150 m, farm until 300 s, trips up to 260 m, drops from 260 m and contest a lone capturer | 3.83 | 3.71 | -0.12 | official | 4 |  | `_meta/MauroMiranda28__mech-royale-bot.git@d12e24a (commit message)` |  |
| E06 | MauroMiranda28 | Climb roofs (up to 36 m) for crates, cubes and loot | 3.98 | 3.77 | -0.21 | official | 1 |  | `_meta/MauroMiranda28__mech-royale-bot.git@b75320f (commit message)` |  |
| E07 | dmclaughlin-bit | Farm cubes/drones/crates when no enemy within 160 m | 2.38 | 2.44 | +0.06 | official | 1 | BB-35E5C75F | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| E08 | dmclaughlin-bit | Farm reach: walk toward drones and crates within 150 m when safe | 2.44 | 2.54 | +0.10 | official | 1 | BB-5573AA45 | `_meta/dmclaughlin-bit__mech-bot.git@2930b6b (commit message)` |  |
| E09 | nullat0m7 | Crate and cube range 90 -> 140 m | 4.44 | 4.35 | -0.09 | official | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |
| E12 | Goonies (koillea) | No crate shooting | 3.69 | 3.04 | -0.65 | official | 1 |  | `_meta/koillea__mech-royale-goonies.git@e3a20e7 (commit message)` |  |
| E13 | Jiackary | First 110 s: loot search radius 250 m (was 160), near-360 scan; hunt remembered drones when healthy and no mech in sight | 3.96 | 4.06 | +0.10 | official | 2 |  | `_meta/Jiackary__buildathon_26.git@fd8b439 (commit message)` |  |
| E14 | JorgeN0 | v1 -> v5 stack: fight only threats, early weapon, farm remembered drones/crates within 250 m, focus the wounded, free-for-all detector | 3.38 | 4.28 | +0.90 | official | 5 |  | `JorgeN0__Mech-Royal/CLAUDE.md` | their calibrated simulator predicted 4.3-4.4 |
| E15 | alexwilldev | Cube farming until 8 cubes or 230 s (crates 110 m, drones 120 m, cubes 120 m) | 3.73 | 3.56 | -0.17 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` | scorer reported answer waits; batch 12 with farming off scored 3.46 |
| E16 | Wolverines (TTUN v8-econ) | Absolute: 5.19 bot. Cubes remembered 40 s; mid-fight detour to a cube within 70 m (hp>50%), 40 m (lower), 12 m (losing); weapon within 60 m gun-only / 35 m; crates on the ground within 150 m approached to 30 m when hp>45%; drones within 170 m approached to 38 m when hp>50%; drop within 220 m, not held by another, not more than 3 s early |  | 5.19 |  | official | 1 |  | `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts` | read from code |
| E17 | r1ver (moonriver0922) | TTUN v8-econ derivative choosing cube piles by upgrade value |  | 5.08 |  | official | 1 | BB-74CEE7A0 | `moonriver0922__wgsrobot/experiments/official-runs.md` | base changed from their 4.67 bot, so +0.41 is not attributable |
| E18 | micah-andelman | Stepping onto cubes within 25 m mid-fight: 'measured harmful'; a similar bundle measured at -0.66 by another team |  |  |  | official | 1 |  | `_meta/micah-andelman__mech-royale.git@0bdf2b0 (commit message)` | second-hand, no receipts |
| E19 | A-bot LLC (Kgc3105, inferred) | Absolute: 5.58 bot grabs a nearby cube or laser even in contact, farms crates/drones only at full health |  | 5.58 |  | official | 1 |  | `_meta/Kgc3105__MAGIC-Royale.git@347636b (commit message)` | design note, not an A/B |

### Supply drops

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| E03 | kyoto-max | Aggressive supply drops: up to 350 m (was 170), boost when >80 m away, contest a held drop when above 60% hp | 3.96 | 3.75 | -0.21 | official | 3 |  | `_meta/kyoto-max__Mech_Royale.git@e864cbe (commit message)` | 'every change that added travel or time in the open lost points' |
| E10 | nullat0m7 | Chase supply drops out to 300 m (was 220), still must arrive in time | 4.44 | 4.46 | +0.02 | official | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` | +1 place-point of 213 |
| E11 | nullat0m7 | Also chase already-landed, untaken drops anywhere within 300 m | 4.46 | 4.38 | -0.08 | official | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |

### Zone and endgame

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| Z01 | dmclaughlin-bit | Path-aware zone travel with a leave-time rule | 2.17 | 2.23 | +0.06 | official | 1 | BB-955D92D8 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| Z02 | SeanCowen | Successive versions ending with region routing to the next circle, drop look-ahead, opening cube preference | 3.77 | 4.06 | +0.29 | official | 4 |  | `SeanCowen__oval-runner/README.md` | 3.77 -> 3.88 -> 3.98 -> 4.06 |
| Z03 | r1ver (moonriver0922) | Short ground-path check on top of the cube-pile version | 5.08 | 5.10 | +0.02 | official | 1 | BB-EAEAF89A | `moonriver0922__wgsrobot/experiments/official-runs.md` |  |

### Cover

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| C01 | dmclaughlin-bit | While holding, walk silently to the nearby spot the fewest enemy eyes can see | 2.38 | 2.23 | -0.15 | official | 1 | BB-BC5A52AB | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| C08 | Team-Xero | Concealment-scored hold spots, canopy model, engagement policy | 2.63 | 2.67 | +0.04 | official | 3 |  | `arnabxero__xero-mech-royale/STATUS.md` |  |

### Roofs

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| C02 | GT Goats | Rooftop camping | 3.60 | 3.23 | -0.37 | official | 1 |  | `atharvatripathi2026__gtgoats_mech_royale/README.md` |  |
| C03 | Goonies (koillea) | Roof perching off (covered ground spots instead) | 3.69 | 2.96 | -0.73 | official | 1 |  | `_meta/koillea__mech-royale-goonies.git@2d7c25b (commit message)` | author: confounded with a merge; roof versions 3.52/3.69 vs no-roof 3.21/2.96 |
| C04 | colton-boi | Hold a rooftop instead of a ground cover spot | 2.56 | 1.63 | -0.93 | official | 1 |  | `_meta/colton-boi__Mech-Bot.git@d6dfb7a (commit message)` |  |
| C05 | BingBU (niranjankumarnk) | Absolute: fight from a roof against the practice squad |  | 2.40 |  | official | 1 |  | `_meta/niranjankumarnk__mech-royale.git@d308a0c (commit message)` | 'scored worse', switched off |
| C06 | Rohanasudani | Pressure-triggered roof climbs | 1.56 | 1.38 | -0.18 | official | 1 | BB-9AA67944 | `Rohanasudani__edgewise-mech-royale/SUBMISSIONS.md` |  |
| C07 | alexwilldev | Rooftop camping when idle (batch 14/15) | 3.46 | 3.52 | +0.06 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` | author: 'def not the move' |

### Fire control and execution

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| F01 | Team-Xero | Execution fixes only: aim at first visible body point (centre, +2 m, +3.6 m), torso follows gun lead and hands off to laser aim at 80% charge, never dump a charge, no gun at strafing targets beyond 140 m | 3.35 | 3.75 | +0.40 | official | 4 |  | `arnabxero__xero-mech-royale/STATUS.md` | second run of the same code 3.90 |
| F02 | Team-Xero | Hold the trigger when the cooldown ends inside the 0.1 s decision window (gun was firing every ~0.3 s instead of 0.24 s) |  |  |  | sim | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` | official score 'pending'; simulator 1v1 vs gun hunter 46.0% -> 56.3% wins over 1024 matches |
| F03 | dmclaughlin-bit | Aim and track each weapon properly (on the kit example bot) | 1.15 | 1.67 | +0.52 | official | 1 | BB-92A5D3DC | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| F04 | V.exe (jackbalseca) | Fix a crash that stopped the bot firing whenever it steered to a pickup | 2.56 | 3.44 | +0.88 | official | 1 | BB-07B3FDEA -> BB-1F463041 | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` |  |
| F05 | afiapoks | Predictive aiming on the starter bot | 1.15 | 1.38 | +0.23 | official | 1 |  | `afiapoks__mech-royale/RESULTS.md` |  |
| F06 | A-bot LLC (Kgc3105, inferred) | Aim with own-motion compensation and a tighter on-target window |  |  |  | sim | 1 |  | `_meta/Kgc3105__MAGIC-Royale.git@bb460bb (commit message)` | local sparring: laser releases on mechs ~70% -> 97% hits, gun 69% -> 74% |

### Navigation

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| N01 | dmclaughlin-bit | Nearest-reachable fallback for failed paths (offline failures 179 -> 85 of 2000) | 2.38 | 2.35 | -0.03 | official | 1 | BB-9A951653 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| N02 | dmclaughlin-bit | Wall padding 2.0 -> 2.5 m | 2.38 | 2.10 | -0.28 | official | 1 | BB-5BB9D164 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |

### Decision timing

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| N03 | Goonies (koillea) | Decision-time fix only (path search stops at a 2.5 ms deadline), 'no behaviour change' | 3.52 | 3.69 | +0.17 | official | 1 |  | `_meta/koillea__mech-royale-goonies.git@2d7c25b (commit message)` |  |
| N04 | alexwilldev | 12 ms soft per-tick budget, cached cover search, path search cap (fix for late answers seen on the scorer) | 3.35 | 3.73 | +0.38 | official | 3 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| N05 | alexwilldev | Hard 20 ms deadlines inside searches on top of the farming batch | 3.56 | 3.17 | -0.39 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |

### Free-for-all detection

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| X01 | V.exe (jackbalseca) | Switch to free-for-all targeting only on an unexplained death before 90 s, or 3+ overall | 3.81 | 3.81 | +0.00 | official | 1 | BB-D884C5A1 | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` | identical score: the stricter rule never changed behaviour in the 48 practice matches |
| X02 | Wolverines two lines (second one submitted by micah-andelman) | Two lines of one bot. Branch A (5.19): economy package (cube and weapon memory, mid-fight cube detours), laser 3.2 > lightning 2.5, plating first, no free-for-all logic. Line B (3.56 when another team submitted it): free-for-all latch (3 uncaused deaths or two beam clues), silence near mechs, endgame cover hold, laser cover; lightning 3 > laser 2.6, armor first, no cube or weapon memory | 5.19 | 3.56 | -1.63 | official | 6 |  | `_meta/micah-andelman__mech-royale.git@e189b97 (commit message)`; `_meta/micah-andelman__mech-royale.git@587504c (commit message)`; `varchaskukreja__TTUN__branches/b7e9a6d_bot.ts`; `varchaskukreja__TTUN/mech-royale/bot/bot.ts`; `_meta/varchaskukreja__TTUN.git@edf5776 (commit message)` | confounded: the 1.63 gap is the economy package and loadout order and/or a leaking free-for-all latch; public bots otherwise reproduce exactly across teams (D03) |
| X03 | JorgeN0 | Detector (>=2 uncaused deaths before 120 s or >=4 any time): fires for 85% of free-for-all bots (median 17 s), 4% false positives in practice |  |  |  | sim | 1 |  | `JorgeN0__Mech-Royal/CLAUDE.md` |  |
| X04 | Achintya-Lakshmanan | Detector (more deaths than our kills + 1) switched at 22.7 s on one recorded free-for-all |  |  |  | rec | 1 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |

### Determinism and noise

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| D01 | nullat0m7 | Identical behaviour resubmitted | 4.44 | 4.44 | +0.00 | official | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |
| D02 | dmclaughlin-bit | Identical commit resubmitted | 2.17 | 2.17 | +0.00 | official | 1 | BB-91057C0A / BB-89ECDFF6 | `dmclaughlin-bit__mech-bot/EXPERIMENTS.md` |  |
| D03 | cross-team | Same public code gives the same score for different teams: Lance v0.5 quiet-on 4.54 (author and BackwardsDeployeds); quiet-off 4.75 (BackwardsDeployeds and davidvarvas); GT Goats 03a8f93 3.71 (author and BackwardsDeployeds) |  |  |  | official | 1 |  | `_triage/raw/bd_docs_RESULTS.md`; `LanceHuang245__mech-royale/README.md`; `atharvatripathi2026__gtgoats_mech_royale/README.md`; `_meta/davidvarvas__mech-royale-bot.git@f1d0f81 (commit message)` |  |
| D04 | V.exe (jackbalseca) | Same strategy, only the bot's random salt changed | 3.81 | 3.75 | -0.06 | official | 1 | BB-3D1125E1 | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` |  |
| D05 | kyoto-max | Same bot, only the strafe random seed changed | 3.98 | 3.71 | -0.27 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@0ec8628 (commit message)` |  |
| D06 | kyoto-max | Unchanged resubmit of a bot whose path search runs on a wall-clock budget | 3.96 | 3.98 | +0.02 | official | 1 |  | `_meta/kyoto-max__Mech_Royale.git@8b6a735 (commit message)` |  |
| D07 | Team-Xero | Same commit scored twice (wall-clock time-sliced search) | 3.75 | 3.90 | +0.15 | official | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` |  |
| D08 | alexwilldev | Same build scored twice | 2.38 | 2.71 | +0.33 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` |  |
| D09 | nullat0m7 | Own simulator, same parameters and 48 seeds, only worker layout changed: means 3.33-3.77 (sd 0.15); 12 of 48 placements differ |  |  |  | sim | 1 |  | `nullat0m7__mech-royale/PATTERNS.md` |  |

### Simulator prediction against the official score

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| V01 | nullat0m7 | Long-range stack: simulator 4.76 -> 6.76 -> 7.63 predicted, official 4.44 -> 3.98 | 4.44 | 3.98 | -0.46 | official | 1 |  | `nullat0m7__mech-royale/docs/bot.md`; `nullat0m7__mech-royale/PATTERNS.md` | wrong sign |
| V02 | V.exe (jackbalseca) | Long-range duelling: simulator +0.3 to +1.0, official -0.77 | 3.81 | 3.04 | -0.77 | official | 1 |  | `jackbalseca__mech-royale-bot/SUBMISSIONS.md` | wrong sign |
| V03 | A-bot LLC (Kgc3105, inferred) | No-retreat bundle: simulator +0.25 +-0.07 over 600 matches, official -0.41 | 5.58 | 5.17 | -0.41 | official | 1 |  | `_meta/Kgc3105__MAGIC-Royale.git@e39579f (commit message)` | wrong sign |
| V04 | ourux | Fight every visible hunter: simulator +1.2 (~3 SE), official -0.18 | 4.33 | 4.15 | -0.18 | official | 1 |  | `_meta/ourux__MechRoyale.git@1a96803 (commit message)` | wrong sign |
| V05 | MauroMiranda28 | 'Safe tweaks' bundle: simulator +0.61, official -0.46; author: sim anti-correlated with the track | 4.00 | 3.54 | -0.46 | official | 1 |  | `_meta/MauroMiranda28__mech-royale-bot.git@2ec6d2f (commit message)` | wrong sign |
| V06 | alexwilldev | Laser range 255: simulator 5.10 (+0.15), official 3.42 (-0.37) | 3.79 | 3.42 | -0.37 | official | 1 |  | `alexwilldev__mechroyale-bot/STATUS.md` | wrong sign |
| V07 | LanceHuang245 | Hide probe: simulator 3.19 vs 5.40 (-2.2), official 4.04 vs 4.54 (-0.5) | 4.54 | 4.04 | -0.50 | official | 1 |  | `LanceHuang245__mech-royale/README.md` | right sign, size 4x too large |
| V08 | r1ver (moonriver0922) | Four scored builds re-run locally: of six pairwise orderings 3 agree, 1 tie, 2 reversed |  |  |  | sim | 1 |  | `moonriver0922__wgsrobot/experiments/official-runs.md` |  |
| V09 | Conquer The World (Borovail) | Third-party squad simulator: kit example 4.88 locally vs 1.15 official; constant-offset correction leaves mean abs error 1.69 on three external builds |  |  |  | sim | 1 |  | `Borovail__builders-mech-royale/PLAN.md` |  |
| V10 | KennethLei1492 | First real score 4.52 vs simulator 7.32 (simulated house bots never fired beyond ~126 m) |  | 4.52 |  | official | 1 |  | `_meta/KennethLei1492__Builder-Mech-Royale.git@247ccb8 (commit message)` |  |
| V11 | Team-Xero | Solo duel: simulator -0.39, official 3.52 vs 3.75 (agrees) | 3.75 | 3.52 | -0.23 | official | 1 |  | `arnabxero__xero-mech-royale/STATUS.md` | right sign |
| V12 | JorgeN0 | Calibrated simulator predicted 4.3-4.4 for v5, official 4.28 (agrees) |  | 4.28 |  | official | 1 |  | `JorgeN0__Mech-Royal/CLAUDE.md` | right |

### Structural observations

| ID | Team | Change (our words) | Before | After | Delta | Scorer | n | Receipt | Source | Note |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| S01 | Showdown winners vs bottom (7 recorded Top-16 matches) | Winners / bottom half means: laser share of damage 69.7% / 17.7% (winners' range 31.7-85.2%); gun share 15.1% / 80.8%; max cubes 25.9 / 0.66 (winners 15-35); supply drops taken 1.0 / 0 (winners 0,0,0,1,1,2,3); boost time 10.7% / 25.0%; nearest enemy 187 m / 114 m; hits on targets under 50% hp 46.6% / 24.7%; hold time in the open 0.7% / 39.5%; life 223 s / 27 s; 6 of 7 winners ended laser + lightning, 1 gun + laser |  |  |  | rec | 1 |  | `dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl` | free-for-all exhibition, time-at-risk confound |
| S02 | Recorded matches (13 matches, 208 rows) | Laser picked up after 15 s scores better than within 15 s (10.51 vs 7.60 mean points, n=43/57); winners hold in the open 6.2% vs 36.6% for the bottom eight; winner loadout has a laser in 11/13 (8/8 showdowns) |  |  |  | rec | 1 |  | `dmclaughlin-bit__mech-bot/research/intake/diego-match-data-1129.md` |  |
| S03 | Achintya-Lakshmanan recordings | Deaths: 55% involve 2+ attackers; median kill distance 44 m; deaths per minute 0.36 with no mech within 60 m, 2.02 with one, 4.58 with two; zone centre 0.85 vs near edge 0.55; 3-s burst laser 432, lightning 348, mortar 163, gun 121 |  |  |  | rec | 1 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |
| S04 | Achintya-Lakshmanan recordings | Top-16 showdowns: practice ranks 1-4 averaged 8th, 9th, 6th and 12th; a 41%-boost bot lived 36 s (avg 12th); a bot standing 74% of the time lived 3 min (avg 4.8th); an expert house bot averaged 4.2th |  |  |  | rec | 1 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |
| S05 | skandra08 | House-bot gun hit rate on the real server (~1500 shots): 94% inside 40 m, 58% at 40-80 m, 31% at 80-130 m, 12% at 130-230 m; own lead aim ~65% at all ranges |  |  |  | live | 1 |  | `_meta/skandra08__robo-fight.git@79d9eeb (commit message)` |  |
| S06 | swan28pande | Recorded live match: house bots hit 55-75% of gun shots, reverse strafe about every 0.8 s, weakest tiers hunt first |  |  |  | live | 1 |  | `_meta/swan28pande__oval-tools.git@0566bf3 (commit message)` |  |
| S07 | kyoto-max | 3 recorded live matches: gun 52% of damage to mechs, laser 33% at 15-27% laser accuracy; every house bot kept its gun; the best house bot ended gun + laser in 10 of 12 |  |  |  | live | 1 |  | `_meta/kyoto-max__Mech_Royale.git@9913da9 (commit message)` |  |
| S08 | Achintya-Lakshmanan private rooms | Free-for-all vs 15 house bots, 48 games each: quiet variant 10.75 +-0.51 (kills 1.21) vs fighting variant 9.33 +-0.66 (kills 1.90): hiding wins free-for-all and loses practice |  |  |  | live | 1 |  | `Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md` |  |
| S09 | moonriver0922 simulator | Per-match points in a local practice simulator are bimodal: 56-69% of matches score 0-2, 12-28% score 15, 12-31% in between; at mean 5.59 wins were 28% of matches and 75% of points |  |  |  | sim | 1 |  | `moonriver0922__wgsrobot/experiments/results.csv`; `moonriver0922__wgsrobot/experiments/calibration-19551.csv` | no official per-match data exists |
| S10 | several teams | No per-match official data: the site shows only the aggregate score, no replays |  |  |  | official | 1 |  | `dmclaughlin-bit__mech-bot/pipeline/data/experiments.jsonl`; `nullat0m7__mech-royale/CLAUDE2.md`; `alexwilldev__mechroyale-bot/STATUS.md` |  |
| S11 | leaderboard history (ET, Nov 20) | 21:00 top 5.23 of 94 teams; 21:40 top 5.40, 16th 4.33, 32nd 4.04; 22:15 top 5.48, 16th 4.52, 32nd 4.13; 22:39 top 5.58; 23:17 16th 4.73, 32nd 4.23; 23:48 144 teams, top 5.58, 16th 4.77, 32nd 4.29 |  |  |  | official | 1 |  | `dmclaughlin-bit__mech-bot/coord/log.md`; `dmclaughlin-bit__mech-bot/EXPERIMENTS.md`; `nullat0m7__mech-royale/CLAUDE2.md` |  |
| S12 | house squad composition | 15 house bots: 4 easy, 4 medium, 4 hard, 3 expert; shared vision; never fight each other; weakest hunter first, more as they thin, all late. Join schedules in team simulators are guesses (1 at 20 s then 1-2 per kill, all at 240-300 s) |  |  |  | official | 1 |  | `dmclaughlin-bit__mech-bot/research/GAME_CONTEXT.md`; `nullat0m7__mech-royale/docs/bot.md`; `joekritenbrink0-wq__mech-bot/README.md` |  |
| S13 | AlexJawhari | A simulator where only hunters shoot gives 6.4 against a real 2.40: real squad members engage on sight |  |  |  | sim | 1 |  | `AlexJawhari__buildathon-mech/NOTES.md` |  |
| S14 | LanceHuang245 league simulator | Free-for-all ceilings when granted to 4 of 16 bots: damage taken -30% +1.65; max hp +30% +1.36; wide vision +0.90; damage dealt +30% +0.63; 1.5x hit boxes +0.28; starting with 10 cubes +1.67 |  |  |  | sim | 1 |  | `LanceHuang245__mech-royale/README.md` |  |

## 2. Synthesis by topic

| Topic | Records | Direction the records agree on | Conflicts | Size against noise (about 0.3) |
|---|---|---|---|---|
| Engagement range, gun only | R01 R02 R08 R09 R14 R15 | 70-90 m. Long gun duels lose: 130 m with backpedal -0.77 (R01), firing beyond 100 m -0.34 (R09), 90 m beat 130 m (R08). Closing to 40 m changed nothing (R02). | One bundle did better at 130 m than at 85 m (R04 vs R05), so that team's loss came from its other changes. | Large (0.3-0.8), 4 teams. |
| Engagement range, laser held | R06 R07 R08 R13 R14 R15 | Shorter than 150 m helped a mid-table bot: 255 m 3.42, 230 m 3.79, 150 m 3.60-3.85, 110 m 4.13. | The 5.58 bot holds 125-185 m and backs away (R13); the 5.19 bot holds 110 m (R14); the 4.46 bot 120 m (R15). | Sweep spans 0.7; top-bot conflict unresolved. |
| Hiding / pacifism | A01 A13 A15 A17 A18 A19 A20 A22 A24 A31 | Every hide-first or hold-fire posture lost: -0.3 to -1.75 in ten tests by eight teams. | None in practice. Reversed in free-for-all (S04, S08). | Very large. |
| Retreat and healing | A02 A03 A05 A08 A09 A14 A16 A21 A25 A26 A28 | Hold-fire while healing costs (A09 vs A08: 0.34). Early or frequent retreat costs (A25 -1.10 at 72% hp, A14 -0.23, A16 -0.13). But removing low-hp retreat from the 5.58 bot cost 0.41 (A05), and a low bot gained 0.14 from adding it (A28). | Standing still unseen: -0.44 in a two-change bundle (A02) against two top bots that rest in cover when hurt (R14 code, A05). | Both extremes lose 0.4+; the middle (retreat only when losing, heal below ~55%) is what the 5.19 and 5.58 bots do. |
| Aggression | A10 A11 A12 A23 A29 A32 R11 G02 | Starting fights with idle or distant mechs loses (A23 -0.18, A12 -0.37, R11 -0.29); fighting only hostiles gained 0.23 (G02); a kill-time fight-or-flee test gained 0.34 (A32). | Solo-duel flag: +0.19 once, -0.23 once (A10, A11). | 0.2-0.4, 5 teams. |
| Movement | M01 M02 M03 M04 M05 R04 R05 | Quiet walking costs about 0.2 (M01, M02). Faster strafe flips: -0.7 once (M03), neutral once (M04), present in two losing bundles (R04, R05). | Strafe interval of the 5.19 bot is 0.35-1.05 s (R14); nobody isolated the interval on the official scorer except M03, whose values are unpublished. | Quiet: at noise edge but reproduced; strafe: one team. |
| Target choice | G01 G02 G03 A32 | Prefer targets the current burst can finish: +0.39 (G01), +0.34 in a bundle (A32). | Heavier low-hp weighting with chase: -0.09 (G03). | 0.3-0.4, 2 positive, 1 null. |
| Loadout and pickups | L01-L13 S01 S02 | A laser is in every winning loadout (S01, S02). Detouring for one never paid on the scorer: -0.11, -0.06, -0.06 (L01, L06, L11). | Second slot: the 5.19 bot keeps the gun (L12); the Lance lineage at 4.75-5.19 drops it for lightning (L13); keeping the gun -0.21 (L03), lightning brawler +0.17 (L04). | All second-slot A/Bs are inside noise. |
| Upgrades | U01 U02 U03 M05 | Toughness first (plating, armor, nanites) is in every bot above 4.4 that published an order. | Lightning-first -0.29 (U01); plating demoted in a -0.46 bundle (M05). No clean A/B. | Unresolved, likely < 0.3. |
| Cubes, crates, drones | E01 E02 E04 E05 E07 E08 E09 E12 E13 E15 A27 | Farming on: +0.27, +0.37, +0.06, +0.10, +0.10; farming off: -0.65, -0.64 (bundle). Farming farther or longer: -0.13, -0.12, -0.09, -0.17. | E15 lost with farming on, with answer-time problems. | On/off is large; tuning range is noise-level and negative. |
| Supply drops | E03 E10 E11 E05 S01 | Uncontested, timed arrival out to 300 m: +0.02. Contesting or chasing far/landed drops: -0.21, -0.08, bundle -0.12. | Free-for-all winners averaged 1.0 drops, three of seven took none. | Small; aggressive variants consistently negative. |
| Cover and roofs | C01-C08 A17 A18 | Roofs lost in 5 of 6 tests (-0.18 to -0.93); cover-first fighting -0.71 and -0.94. | One team scored higher with roof perches (C03, confounded). | Large. |
| Fire control and execution | F01-F06 | Pure execution fixes +0.40 (F01); a crash fix +0.88 (F04); basic aiming +0.23 to +0.52 on starter-level bots. | Trigger-timing fix has only simulator evidence (F02). | Large when a defect exists. |
| Navigation and timing | N01-N05 Z01-Z03 | Late-answer and budget fixes moved scores by +0.38 and +0.17; wider wall padding -0.28; hard deadlines -0.39. | Path-failure repair did nothing (N01). | 0.2-0.4: same size as tactics. |
| Free-for-all detection | X01-X04 | A 3-death rule never misfired in 48 practice matches (X01). | The only scored bot carrying our exact latch (3 deaths or two beam clues) is the 3.56 line of X02; its sister branch without the latch scored 5.19. Confounded with the economy package. | One clean null, one confounded -1.63. |

## 3. Audit of Amendment V3

| Item | Claim or rule | Verdict | Evidence |
|---|---|---|---|
| E1 | Per-match results are bimodal, 0-2 or 15 | UNSUPPORTED on the official scorer; simulator-only | No per-match official data exists (S10). One team's local simulator shows 56-69% of matches at 0-2, 12-28% wins and 12-31% in between (S09). |
| E1 | Mean = 15 x P(win); 5.58 is a 35% win rate | CORRECTED | In that simulator wins carried 75% of the points (mean 5.59 with 28% wins). 5.58 is nearer 28% wins plus about 1.4 points from partial results. Simulator inference only. |
| E2 | Hide and hold fire -0.5 | CONFIRMED | A01 (4.54 -> 4.04); seven more teams agree (A13-A24, A31). |
| E2 | Standing still to regenerate while unseen -0.44 | CORRECTED: confounded and over-generalised | A02 changed two things. The 5.19 bot stands or creeps silently in cover when under 55% hp with no target and no cube within 40 m (varchaskukreja__TTUN__branches/b7e9a6d_bot.ts); the 5.58 bot lost 0.41 when low-hp hiding was removed (A05). |
| E2 | Quiet walking -0.2 | CONFIRMED | M01 +0.21 when switched off (reproduced by a second team), M02 +0.13. |
| E2 | Long-range duelling 130/160 m with backpedal -0.77 | CONFIRMED for the gun; over-generalised to the laser | R01. For lasers see R06-R08 (shorter better) against R13 (5.58 bot at 125-185 m). |
| E2 | Long-range loadout stack -0.46 | CONFIRMED number; seven changes at once | R03; its author calls long range confounded. |
| E2 | Holding behind cover -0.15 | CONFIRMED, inside noise, one 2.4-level bot | C01. |
| E2 | Rooftop camping -0.37 | CONFIRMED | C02; also C04 -0.93, C05, C06, E06. One conflict C03. |
| E2 | Combined caution -0.6 | CONFIRMED | A06 (3.29 -> 2.69). |
| E2 | Faster strafe reversals -0.7 | CONFIRMED number, single team, interval unpublished | M03; the same code scored 3.75 and 3.90 (D07). M04 neutral at 0.5-1.3 s. |
| E2 | Stand-off 75 m gun (60-95), 110 m laser (95-125), 28 m lightning with boost-in at 45-90 m and energy > 70; full stick in, 0.7 out; strafe flip 0.35-1.05 s | CONFIRMED as the 5.19 bot's code (gun 70 +-15 there); laser value CONTESTED | R14, R15; R13 for the 5.58 bot. No A/B isolates the lightning rule (L04 +0.17 is a bundle). |
| E2 | Stay >= 65 m from a lightning holder | UNSUPPORTED | The rule appears only in two losing bundles (R03 at 60 m, R05 at 75 m) and in an unscored later commit (varchaskukreja__TTUN__branches/5db1c3e_bot.ts). |
| E2 | LOSING thresholds (35% and +0.1; 2 threats 55%; 3 threats 80%; finish under 20% with <= 2 threats; cover within 50 m) | CONFIRMED as the 5.19 bot's code; no A/B | R14. A05 shows retreat matters at the top; A25 shows 72% is far too early. |
| E2 | Out of sight: never stand still, never walk quietly, keep roaming | CORRECTED | Opposite of the 5.19 bot's heal state and of the 5.58 design (A05). Support is A02 (confounded) and A21 (-0.08). Keep 'no quiet walking while travelling'; restore a short silent heal in cover. |
| E2 | No crates or drones under 50% hp; re-engage at 60% | CONFIRMED within noise | 5.19 code uses 40-50%; A03 -0.04 and A04 -0.13 are noise-level. |
| E2 | Peek/hide cycles are free-for-all tools; no rooftops | CONFIRMED | A17 -0.71, A18 -0.94, C01-C06. |
| E3 | Finishable-target bonus +0.39 | CONFIRMED, single A/B on another team's bot | G01; A32 +0.34 supports; G03 -0.09. |
| E3 | Engage only mechs that shot, aim or are within 150 m: +0.23 | +0.23 CONFIRMED; the 150 m clause is UNSUPPORTED | G02 has no distance clause. Broader engagement lost in A23, A12, R11, R09. |
| E3 | Mid-fight economy numbers (40 s memory; 70/40/12 m; weapon 60/35 m) | CONFIRMED as the 5.19 bot's code; package-level support only | E16. The same team's line without the package scored 3.56 (X02), but that line also differs in weapon order, upgrade order and free-for-all logic. |
| E3 | Kill cubes: close to 14 m when target < 38%, we > 42% | UNSUPPORTED by any score | Comes from a later commit with no board improvement (varchaskukreja__TTUN__branches/5db1c3e_bot.ts); one team reports mid-fight cube stepping as harmful (E18, second-hand). |
| E3 | Supply drops within 220-300 m, reachable by landing + 3 s, inside next circle | PARTLY CORRECTED | 220 m is the 5.19 code, 300 m is E10 (+0.02). The code rule is 'do not arrive more than 3 s early' and skips out-of-circle drops only within 15 s of the shrink. Contesting and far chasing lost (E03, E11). |
| E3 | Trigger held through the decision window: 20% more gun dps | CONFIRMED as arithmetic; official effect UNMEASURED | F02 (simulator duel win rate 46% -> 56%; official run pending). |
| E3 | Aim point centre / +2 m / +3.6 m; hand-off at 80% charge | CONFIRMED inside a +0.40 bundle | F01. |
| E4 | Laser 72-85% of winners' damage | CORRECTED: 32-85%, mean 70%, six of seven above 65% | S01. |
| E4 | 3-s burst 430 / 350 / 160 / 120 | CONFIRMED (one observer) | S03. |
| E4 | Values laser 3.2, lightning 2.5 | CONFIRMED as the 5.19 code; gun 1.5 and mortar 0.5 are our own | L12. |
| E4 | Target laser + lightning, drop the gun | CONTESTED | The 5.19 bot never drops the gun (L12); the Lance lineage does (L13); L03 -0.21 and L04 +0.17 are inside noise; six of seven free-for-all winners ended laser + lightning (S01). |
| E4 | Seek pickups up to 240 m when gun-only | UNSUPPORTED | No source for 240 m. Long laser detours scored -0.11, -0.06, -0.06 (L01, L06, L11); recorded bots that got a laser after 15 s did better (S02). |
| E5 | Upgrade order | CONFIRMED as the 5.19 bot's list with laser_damage moved up; no A/B | U02; U01 and M05 show reorderings losing, both noisy. |
| E6 | Winners held 24-34 cubes, 6-7 upgrades, all three drops | CORRECTED: 15-35 cubes (median 24), 5-7 upgrades, 0-3 drops (mean 1.0) | S01. |
| E6 | Farm crates and drones; skip roofs | CONFIRMED, strong | E01, E04, E07, E08, E13 positive; E12 -0.65 without crates; E06 -0.21 for roofs. |
| E6 | Roam with boost when energy > 60 | UNSUPPORTED | Free-for-all winners boost 11% of the time, the bottom half 25% (S01). |
| E6 | Stop shooting crates and drones in the last two phases | PARTLY SUPPORTED | Farming past 200-230 s lost 0.12-0.13 (E02, E05). |
| E7 | Endgame: stand on the moving centre | UNSUPPORTED by any A/B (mechanism only) | The 260 hp/s figure is the final-phase zone damage rate (nullat0m7__mech-royale/PATTERNS.md), not a per-metre cost. |
| E8 | Latch at 3 uncaused deaths | CONFIRMED as code of the Wolverines' other line; one clean null elsewhere, one warning | varchaskukreja__TTUN/mech-royale/bot/bot.ts; X01, X03. That line's only known practice score is 3.56 (X02). |
| E8 | Two-beam rule (beam by another mech ending near a third mech, not within 20 m of us) | CONFIRMED as code of the same line; UNTESTED and risky | Same file. No independent test. A house bot firing a laser or lightning at a drone or crate beside a squad-mate would produce the same clue. |
| E8 | Calm bots last (74% standing, place 4.8); boosters die (41%, 36 s, 12th) | CONFIRMED (one observer, 11 matches) | S04; S01 agrees. |
| E8 | Free-for-all stance items | SIMULATOR-ONLY | Each came from the author's local A/B (_meta/varchaskukreja__TTUN.git@937067d, @f30edf1, @0a9885e); see X02. |
| E9 | Three teams saw simulators mispredict by 0.46-0.77 | CONFIRMED and stronger: six wrong-sign cases, 0.18-0.77 | V01-V06; two simulators agreed with the board (V11, V12). |
| E9 | House bots chase a passive bot less than simulators assume | CONFIRMED, one team | V07; pure hiding still scores only 1.7-2.6 (A22, A24). |
| E10 | Identical code gives an identical score | CONFIRMED for deterministic bots only | D01-D03; bots with wall-clock budgets moved 0.02-0.33 (D06-D08). |
| E10 | Differences under 0.2 are noise | CORRECTED to about 0.3 | Seed-only changes moved -0.06 and -0.27 (D04, D05). |

## 4. Measured findings the amendment does not use, by effect size

| Rank | Effect | Finding | Records |
|---:|---|---|---|
| 1 | 1.63 (confounded) | The Wolverines' economy branch scored 5.19 with no free-for-all logic; their other line, which carries exactly the latch the amendment adopts but lacks the economy package and prefers lightning and armor, scored 3.56. Either the economy package is worth far more than any single A/B, or the latch leaks in practice | X02 |
| 2 | -0.41 at the top | Removing low-health retreat and hiding from the 5.58 bot; the 5.19 bot also rests silently in cover below 55% hp | A05, R14 |
| 3 | +0.71 across a sweep | Laser stand-off 255 -> 110 m on one bot; conflicts with the 5.58 bot's 125-185 m | R06-R08, R13 |
| 4 | -0.65 / +0.3 | Crate and drone farming is worth about 0.3-0.6 when on, but every attempt to farm farther or longer lost 0.1-0.2 | E12, A27, E01, E04, E02, E05, E09 |
| 5 | +-0.2 to 0.4 | Answer-time and navigation hygiene moves scores as much as tactics | N02-N05 |
| 6 | +0.34 | Fight-or-flee from time-to-kill against time-to-die, with a finish rule gated on our own hp | A32 |
| 7 | 0.27-0.33 | Re-roll noise for bots with random strafing or wall-clock budgets; deterministic bots repeat exactly | D05, D07, D08 |
| 8 | -0.46 / -0.59 bundles | Keeping distance from lightning carriers appears only in losing bundles | R03, R05 |
| 9 | inside noise | The 5.19 bot keeps its gun and adds a laser | L12, L03 |
| 10 | -0.21 / -0.08 | Contesting or chasing far and landed supply drops | E03, E11 |
| 11 | accuracy table | House gun hit rate 94% under 40 m, 58% at 40-80 m, 31% at 80-130 m, 12% beyond | S05 |
| 12 | rank inversion | Practice ranks 1-4 placed 6th-12th in recorded free-for-alls | S04 |

## 5. Recommendations

| Decision | Recommended default | Evidence grade | Records |
|---|---|---|---|
| Gun-only range | Hold 70-85 m (dead band about 55-95), approach at full stick, back off at 0.7, do not fire the gun at movers beyond about 100-140 m | strong evidence | R01, R08, R09, R14, R15, F01 |
| Range with a laser | Hold 110-125 m, back off inside 95 m, never sit beyond 150 m | contested | R08, R14, R15 against R13 |
| Range with lightning | Close to about 28 m, boosting in from under 90 m when energy is above 70 | one team | R14, L04 |
| Against lightning carriers | No special stand-off rule in the squad stance | one team (negative) | R03, R05 |
| Retreat | Only when losing by the 5.19 rule (hp < 35% and target at least 10 points healthier; 2 threats and hp < 55%; 3 threats and hp < 80%); never when the target is under 20% with at most 2 threats; keep shooting | one team for thresholds; strong that both no-retreat and early retreat lose | R14, A05, A09, A25 |
| Heal and re-engage | Out of contact under 55% hp (or within 6 s of a losing retreat, until 90%): creep to cover and hold silently, still fetching cubes within 40 m and returning fire; leave at about 55-65% or as soon as a mech has a line of fire and we are not losing | contested | R14, A05 against A02, A21 |
| Loadout | Always want a laser; never a mortar unless the slot is empty. Second slot by stance: keep the gun in the squad stance, laser + lightning once free-for-all is latched; keep the flag | contested | L12, L13, L03, L04, S01 |
| Pickup seeking | Opportunistic only: 60 m when gun-only, 35 m otherwise; no long detours | one team plus three small negatives | E16, L01, L06, L11 |
| Upgrades | plating, armor, nanites, then laser_damage and laser_charge when a laser is held, lightning_efficiency when lightning is held, gun_damage, gun_rate, rest | one team, no A/B | U02, U01 |
| Drones and crates | Farm until about 200-230 s or 10 cubes; ground crates within 150 m approached to 30 m above 45% hp; drones within 170 m approached to 38 m above 50% hp and out of contact; no roofs | strong evidence for farming on; one team for the numbers | E01, E04, E12, E16, E02, E05, E06 |
| Supply drops | Take only an unheld drop within 220-300 m timed to arrive no more than 3 s early; never contest; do not chase a landed drop beyond about 70 m | one team each, all inside noise | E10, E11, E03, E16 |
| Endgame | Converge on the next centre from radius 70 and stand on the moving centre | no measurement | none |
| Free-for-all latch | Keep the 3-uncaused-deaths clause; drop or harden the two-beam clause (require the third mech to lose hp); log every latch; make the squad stance bit-identical while unlatched | one team plus one confounded warning | X01, X02 |
| Engineering | Seed all randomness from the match seed, no wall-clock gates, answer well under 15 ms | strong evidence | D01-D08, N03, N04 |

## 6. How to read the tables

Outside the noise and simulator-validity tables (which reuse some rows), the record tables hold 97 official A/B comparisons from 27 teams (61 negative, 34 positive, 2 exactly zero), 56 of them single-change, plus absolute scores, simulator results and recorded-match statistics, each labelled in the scorer column. Sources ending in `(commit message)` are the teams' own statements of their board scores, read from the commit history in `_meta/`. A bundle delta (n > 1) cannot be assigned to one change. Baselines differ: a delta on a 2.4 bot and on a 5.6 bot are not the same quantity. "Absolute" rows (no Before) describe what a scored bot does, read from its notes or code; they are not experiments.

## 7. Noise

Deterministic bots repeat exactly (D01, D02), and the same public code scored the same for different teams (D03), so every team plays the same 48 matches. Any behaviour change re-rolls them. Two teams measured that directly by changing only a random seed: -0.06 (D04) and -0.27 (D05). Bots that cut their path search by wall-clock time do not even repeat: the same code moved by 0.02, 0.15 and 0.33 (D06-D08), and one team's simulator spread by 0.44 across worker layouts on fixed seeds (D09). One place in one match is 0.021 (`nullat0m7__mech-royale/PATTERNS.md`). Teams' own thresholds range from 0.15 (`jackbalseca__mech-royale-bot/SUBMISSIONS.md`, row 9) through 0.2 (`nullat0m7__mech-royale/PATTERNS.md`, pattern 3) and 0.3 (`alexwilldev__mechroyale-bot/STATUS.md`) to 0.4 (`Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md`).

Working rule used in this note: a single A/B under 0.3 is not evidence on its own. Single-change results at or above 0.3 are: hiding (A22 -1.75, A24 -0.83, A20 -0.64, A01 -0.50), early retreat (A25 -1.10), roofs (C04 -0.93, C02 -0.37, with C03 pointing the other way), long gun range (R01 -0.77, R09 -0.34), very long laser range (R06 -0.37), fast strafe flips (M03 -0.69), no crate shooting (E12 -0.65), farming on (E04 +0.37), finishable targets (G01 +0.39), and execution or timing defects (F03, F04, N05).

## 8. Structural facts

**Where points come from.** A practice point is a house bot dead before us. House bots die to us, the zone, drones or their own mortar splash; in one team's simulator 2.9 of 3.4 points per match were own kills, 0.45 drones and none zone (`nullat0m7__mech-royale/PATTERNS.md`, pattern 2, mechanism only).

**Outcome distribution.** Nobody has official per-match results; the site shows one number and no replays (S10). The bimodal picture comes from one local simulator (S09): 56-69% of matches at 0-2 points, 12-28% outright wins, 12-31% in between. At a simulated mean of 5.59 the bot won 28% of matches and those wins were 75% of its points. The win rate behind 5.58 is therefore not measured; about 28% is the simulator's answer.

**House bots.** Fifteen bots in tiers of 4 easy, 4 medium, 4 hard and 3 expert, sharing vision and never fighting each other; the weakest hunter comes first, more as they thin out, all of them late (S12). The exact schedule is unknown: team simulators use guesses between one extra hunter per kill and one per two kills, with everyone hunting from 240-300 s. Against a passive bot they are less aggressive than simulators assume (a hide probe scored 4.04 against a predicted 3.3, A01), yet pure hiding still scores only 1.7-2.6 (A22, A24). Idle members: one team's rule "non-hunters leave us alone unless hurt" gained 0.23 (G02, `jackbalseca__mech-royale-bot/CLAUDE.md`); another infers from its simulator that they engage on sight (S13). Aim: on the real server house guns hit 94% inside 40 m, 58% at 40-80 m, 31% at 80-130 m and 12% beyond (S05); another recording gives 55-75% overall with a strafe reversal about every 0.8 s (S06). In the kit's recorded practice stream the hunter arrives with gun and laser and fights at 100-150 m (`arnabxero__xero-mech-royale/STATUS.md`); hunters keep tracking for 5 s after losing sight (`nullat0m7__mech-royale/CLAUDE2.md`). In three recorded live matches the gun did 52% of the damage to mechs and the laser 33% (S07).

**Leaderboard.** S11 gives the history. The top has been 5.58 since 03:38 UTC, while 16th place rose from 4.33 at 02:40 UTC to 4.92 at 05:19 UTC and 32nd from 4.04 to 4.29 by 04:48 UTC (the 05:19 snapshot is `web/mech_leaderboard_now.json`, outside `intel/`). Lineages with public evidence in the top 16: Wolverines (own bot, 5.19), r1ver (a fork of it, 5.10), Kanyaraasi and BackwardsDeployeds (forks of the Lance bot, 5.19 and 5.06), and, by timestamp inference only, A-bot LLC (R13).

**Simulators.** Six teams saw their simulator give the wrong sign for a change that then lost 0.18-0.77 officially (V01-V06); one over-predicted a loss fourfold (V07); a paired re-run of four scored builds got three of six orderings right (V08); a third-party squad simulator was off by 3.7 points on the kit example (V09). Two simulators agreed with the board once each (V11, V12). The errors cluster on range and retreat questions.

**Practice against free-for-all.** Practice ranks 1-4 placed 6th to 12th in recorded Top-16 showdowns; calm bots outlasted boosters (S04); in private rooms a quiet variant beat a fighting variant 10.75 to 9.33 (S08). Showdown winners differ from the bottom half mainly in laser share of damage, cubes, time in the open and distance to the nearest enemy (S01); all of these carry a time-at-risk confound.

## 9. Audit commentary

Large parts of E2, E3 and E5 are a transcription of one bot, the Wolverines' v8-econ. As a package that policy is well supported: it scored 5.19 and a fork scored 5.08-5.10. Its individual numbers have never been A/B-tested, so each is "one team".

Four places where the amendment generalises beyond its evidence:

1. "Never stand still out of sight." The source is a two-change bundle (A02). The bot the amendment copies does the opposite when hurt, and the 5.58 bot lost 0.41 when its low-health hiding was removed (A05). What is measured is narrower: holding fire while healing costs 0.34 (A08, A09), retreating at 72% costs 1.1 (A25), and quiet walking while travelling costs 0.2 (M01).
2. Long range. The -0.77 result is a gun-and-laser backpedal on a 3.8 bot. For lasers the only sweep says 110 m beats 150 m and more (R06-R08), while the leading bot kites at 125-185 m (R13).
3. Kill cubes, the lightning stand-off and the free-for-all stance all trace to commits that never improved a board score, or to local simulators (E3, E2, E8 rows of the audit). The amendment's latch, including the two-beam clause, is the Wolverines' main-line code; that line scored 3.56 for the team that submitted it, against 5.19 for the sister branch that has the economy package and no latch (X02). The two lines differ in several ways, so this does not prove the latch leaks, but the beam clause has a plain false-positive path in practice: a house bot firing a beam at a drone or crate next to a squad-mate.
4. Loadout. The amendment drops the gun; its model bot never does (L12).

## 10. Caveats

Scores in commit messages are self-reported and carry no receipt. The identity of the 5.58 repository is inferred from timestamps. X02 compares two lines of one bot submitted by two teams; public bots otherwise reproduce exactly across teams (D03), but the lines differ in economy, weapon order, upgrade order and free-for-all logic, so the 1.63 gap is not attributable. Recorded-match statistics come from 7 to 13 matches. No record here was produced by running another team's code.
