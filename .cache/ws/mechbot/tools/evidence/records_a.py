# Evidence records, part A (official 48-seed practice scorer A/Bs). Own-words summaries; numbers cited to
# files under P/intel. "M:" sources are commit messages read from our metadata clones (_meta/<repo>.git@<hash>).
O = "official48"
def M(repo, h): return "_meta/%s.git@%s (commit message)" % (repo, h)
A = []
def R(i, team, topic, change, before, after, src, scorer=O, receipt=None, note=None, stack=1):
    d = None if (before is None or after is None) else round(after - before, 2)
    A.append(dict(id=i, team=team, topic=topic, change=change, score_before=before, score_after=after, delta=d,
                  scorer=scorer, changes_in_bundle=stack, receipt=receipt, source=src if isinstance(src, list) else [src], note=note))

JB = "jackbalseca__mech-royale-bot/SUBMISSIONS.md"
NP = "nullat0m7__mech-royale/PATTERNS.md"
DM = "dmclaughlin-bit__mech-bot/EXPERIMENTS.md"
XS = "arnabxero__xero-mech-royale/STATUS.md"
AW = "alexwilldev__mechroyale-bot/STATUS.md"
BD = "_triage/raw/bd_docs_RESULTS.md"
MM = "MauroMiranda28__mech-royale-bot"; KY = "kyoto-max__Mech_Royale"; KO = "koillea__mech-royale-goonies"

# ---- T1 engagement range
R("R01","V.exe (jackbalseca)","range","Hold 130 m with gun / 160 m with laser and backpedal while firing (on the v3 bot)",3.81,3.04,JB,receipt="BB-C8CC3711",note="simulator had predicted +0.3 to +1.0")
R("R02","V.exe (jackbalseca)","range","Closer engagement: gun 40 m, laser 60 m (on v3)",3.81,3.79,JB,receipt="BB-927E23D7",note="no effect")
R("R03","nullat0m7","range","Seven changes at once: gun 170 m, laser 210 m, loadout re-weighted toward gun, stand still to regen when unseen, keep >60 m from lightning carriers, earlier retreat per extra shooter, outnumbered at 2",4.44,3.98,[NP,"nullat0m7__mech-royale/CHANGELOG.md"],stack=7,note="author: long range confounded; simulator predicted 7.63")
R("R04","swan28pande","range","Gun range 85 -> 130 m together with strafe flips every 0.4-0.9 s and heal to 95% before re-engaging",4.21,3.94,[M("swan28pande__oval-tools","87d5176"),M("swan28pande__oval-tools","0566bf3")],stack=3)
R("R05","swan28pande","range","Same bundle with range back at 85 m (keeps fast flips, heal to 95%) plus >=75 m from lightning carriers",4.21,3.62,M("swan28pande__oval-tools","10597f8"),stack=3,note="worse than the 130 m version, so range is not the main loser here; which of the two later commits scored 3.62 is inferred from commit order")
R("R06","alexwilldev","range","Laser range 230 -> 255 m (batch 18 vs 17)",3.79,3.42,AW,note="simulator said 5.10")
R("R07","alexwilldev","range","Laser range 255 -> 150 m (batch 19 vs 18)",3.42,3.60,AW)
R("R08","alexwilldev","range","Laser range 150 -> 110 m and gun 130 -> 90 m (batch 20 vs 19)",3.60,4.13,AW,stack=2,note="team best; 'shorter ranges help for real'")
R("R09","dmclaughlin-bit","range","Remove the rule that holds gun fire beyond 100 m (shoot at any range)",2.38,2.04,DM,receipt="BB-07153949")
R("R10","BingBU (niranjankumarnk)","range","Fight at about 145 m instead of 85-125 m (experiment A) and cover-step positions (B)",None,None,[M("niranjankumarnk__mech-royale","6bf8f4c"),"niranjankumarnk__mech-royale/README.md"],note="both 'scored lower' than v1; no numbers published")
R("R11","MauroMiranda28","range","More aggressive: engage any visible mech to 160 m (was 95), gun fight range 75 -> 55 m, close on fights sooner",4.00,3.71,[M(MM,"2ec6d2f"),M(MM,"1c04e84")],stack=3)
R("R12","KennethLei1492","range","Absolute: sniper play, laser engages to 280 m and kites to 130 m, gun+laser priority",None,4.52,M("KennethLei1492__Builder-Mech-Royale","d33a9d8"),note="first score; simulator had said 7.32")
R("R13","A-bot LLC (Kgc3105, inferred from timestamps)","range","Absolute: the 5.58 bot holds 125-185 m when it has a laser and backs away firmly (boost if a mech gets well inside)",None,5.58,[M("Kgc3105__MAGIC-Royale","f0a85ee"),M("Kgc3105__MAGIC-Royale","e39579f")],note="not an A/B; identity inferred: 5.58 commit 03:30 UTC, board entry 03:37:53 UTC")
R("R14","Wolverines (TTUN v8-econ)","range","Absolute: the 5.19 bot prefers 70 m gun-only, 110 m with laser, 28 m with lightning, +-15 m dead band, retreat stick 0.7",None,5.19,["varchaskukreja__TTUN__branches/b7e9a6d_bot.ts","_meta/varchaskukreja__TTUN.git@11350d3 (commit message)","moonriver0922__wgsrobot/experiments/README.md"],note="read from code, not an A/B; the restored 5.19 commit is byte-identical to this snapshot")
R("R15","nullat0m7","range","Absolute: the 4.44/4.46 bot fights at 75 m gun, 120 m laser",None,4.46,"nullat0m7__mech-royale/CHANGELOG.md")

# ---- T2 aggression / passivity / hiding / healing
R("A01","LanceHuang245","passivity","Probe: hide and hold fire at range ('patient') with quiet walking",4.54,4.04,"LanceHuang245__mech-royale/README.md",note="simulator predicted ~3.2-3.5: real house bots chase a hider less than modelled")
R("A02","nullat0m7","passivity","Stand still and silent whenever unseen and under 85% hp, plus count trees as cover",4.44,4.00,NP,stack=2)
R("A03","nullat0m7","healing","Leave the regen state at 65% hp instead of 85%",4.44,4.40,NP)
R("A04","nullat0m7","healing","Re-engage at 65% plus farm drones/crates only at >=85% hp (was 60%)",4.44,4.31,NP,stack=2)
R("A05","A-bot LLC (Kgc3105, inferred)","passivity","Stop hiding on low health or when out-gunned by a laser (leave hiding at 50%); crates only within 100 m (was 150); loose cubes to 130 m (was 90)",5.58,5.17,M("Kgc3105__MAGIC-Royale","e39579f"),stack=3,note="simulator said +0.25; author: sim undervalues falling back to cover and repairing")
R("A06","Achintya-Lakshmanan","passivity","'Combined caution': break off when 2 aim at us, duck on reload, 45 m",3.29,2.69,"Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md",stack=3)
R("A07","Achintya-Lakshmanan","healing","Regen behind cover",3.29,3.21,"Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md")
R("A08","dmclaughlin-bit","healing","Break line of sight under 35% hp, heal below 90% standing still, hold fire unless hit in last 2 s, avoid vision cones",2.23,2.04,DM,receipt="BB-AA244730",stack=3)
R("A09","dmclaughlin-bit","healing","Same as A08 but keeps firing normally while healing",2.23,2.38,DM,receipt="BB-54EDF93F",note="+0.34 against A08: the hold-fire gate was the cost")
R("A10","Team-Xero","aggression","Solo duel on v3.1: fight a lone attacker head-on, no cover runs, retreat only under 25%",3.00,3.19,XS)
R("A11","Team-Xero","aggression","Solo duel on v5",3.75,3.52,XS,note="v5 itself scored 3.75 and 3.90 on two runs; sign opposite to A10")
R("A12","Team-Xero","aggression","Solo duel + attack a lone visible enemy within 220 m when hp > 70% + farm drones",3.35,2.98,XS,stack=3)
R("A13","MauroMiranda28","passivity","Break line of sight and heal instead of trading; start fights only inside 60 m; less farming",3.54,2.85,M(MM,"98b2031"),stack=3)
R("A14","MauroMiranda28","passivity","Fight in the open; hide only under 50% hp, against 2+ threats or a clearly stronger enemy",3.54,3.31,M(MM,"98b2031"))
R("A15","MauroMiranda28","passivity","Pacifist base with constant jinks and living at the zone edge",3.54,2.21,M(MM,"98b2031"),stack=3)
R("A16","prakash-218","healing","Regen between fights, kill-time retreat, multi-threat cover",3.98,3.85,M("prakash-218__buildathon-mech","4983df2"),stack=3)
R("A17","prakash-218","passivity","Fight from cover spots, hide from charging lasers, peek, charge laser behind cover",3.98,3.27,M("prakash-218__buildathon-mech","4983df2"),stack=4)
R("A18","Goonies (koillea)","passivity","Cover-first combat (never trade in the open: cover, peek, duck) plus 130 m laser detour",3.52,2.58,M(KO,"f83a047"),stack=2)
R("A19","Goonies (koillea)","passivity","Fire discipline: shoot a mech only if it hit us in the last 4 s or is inside 40 m; no crate shooting; avoid fights",3.52,3.19,M(KO,"e0aaf30"),stack=3)
R("A20","kyoto-max","passivity","Hide profiles vs the fighting v1 (3.6): ghost 2.67, ambush 2.81, precomputed low-exposure hideouts 2.96",3.60,2.96,[M(KY,"2e0cc64"),M(KY,"463b269")],note="best of the three hide profiles shown; worst -0.93")
R("A21","kyoto-max","healing","Below 60% hp with no enemy in sight: stop seeking/farming, go to a walled cell within 24 m, wait to 90%",3.96,3.88,M(KY,"41b63e8"))
R("A22","ourux","passivity","Avoid everyone until t=380 s or <=3 alive, fight back only at close range",4.33,2.58,M("ourux__MechRoyale","7858b38"))
R("A23","ourux","aggression","In practice fight every visible hunter; hunt a second weapon when the slot is empty",4.33,4.15,M("ourux__MechRoyale","1a96803"),stack=2,note="simulator said +1.2")
R("A24","colton-boi","passivity","Pure stand-still-and-hide, fire only after being hit (vs 'survive' 2.56)",2.56,1.73,M("colton-boi__Mech-Bot","d6dfb7a"))
R("A25","Rohanasudani","healing","Break contact below 72% hp to regenerate",1.56,0.46,"Rohanasudani__edgewise-mech-royale/SUBMISSIONS.md",receipt="BB-E5AF82EF")
R("A26","joekritenbrink0-wq","healing","Disengage under 33% and regen to 75%, exposure-scored combat movement, path planning, supply drops",3.94,3.79,"joekritenbrink0-wq__mech-bot/README.md",stack=4)
R("A27","KennethLei1492","passivity","Scan spin, no drone/crate farming, sniper posts with partial sightlines, time budget",4.52,3.88,M("KennethLei1492__Builder-Mech-Royale","d33a9d8"),stack=4)
R("A28","V.exe (jackbalseca)","healing","Break line of sight to cover when hurt or outnumbered, regen, re-engage; wider weapon search",3.44,3.58,JB,receipt="BB-B64270EC",stack=2)
R("A29","V.exe (jackbalseca)","aggression","Never retreat in the final 1v1; face whoever is hitting us now",3.81,3.50,JB,receipt="BB-150F3F5C",stack=2)
R("A30","AbhinavDasari-pennstate","healing","After a kill: loot, then rest up to 8 s without firing until 85% hp",None,None,M("AbhinavDasari-pennstate__fog-of-war-mech","c10bf67"),note="reported delta -0.06 on the board ('noise'); absolute scores not given")
R("A31","afiapoks","passivity","Survival-first variant of the starter bot",1.15,0.79,"afiapoks__mech-royale/RESULTS.md")
R("A32","dmclaughlin-bit","aggression","Fight-or-flee by time-to-kill vs time-to-die: fight on against a single enemy when ttk < ttd; commit to a target within one magazine when no second enemy sees us (only above 35% hp)",2.54,2.88,[M("dmclaughlin-bit__mech-bot","dc5ce9b"),M("dmclaughlin-bit__mech-bot","7c14e83")],receipt="BB-2897E011",stack=2,note="baseline is 2.44 instead (delta +0.44) if it was scored before the farm-reach build was merged in")
R("A33","micah-andelman","passivity","Absolute: own passive duel posture (quiet opening, heal to 90% between duels)",None,2.40,M("micah-andelman__mech-royale","8b49a31"),note="their fork of another team's fighting bot scored 3.88")

# ---- T3 movement
R("M01","BackwardsDeployeds","movement","Quiet walking (<=4.6 m/s near known enemies) switched off on the Lance v0.5 bot",4.54,4.75,BD,receipt="BB-E8B2D8F9 -> BB-6E7BFB8D",note="same 4.75 reproduced by another team with the same configuration: "+M("davidvarvas__mech-royale-bot","d4737f6"))
R("M02","r1ver (moonriver0922)","movement","Slow walk + destination commitment -> normal walking speed + supply-capture fix",4.54,4.67,"moonriver0922__wgsrobot/experiments/official-runs.md",receipt="BB-407987E8 -> BB-2DE41BE7",stack=2)
R("M03","Team-Xero","movement","Faster strafe reversals on v5",3.75,3.06,XS,note="v5 scored 3.75 and 3.90; interval values not published")
R("M04","alexwilldev","movement","Range play (laser 150, gun 90) with faster strafe flips 0.5-1.3 s (batch 13 vs 12)",3.46,3.46,AW,stack=2)
R("M05","MauroMiranda28","movement","Bundle: no farming with a mech within 100 m, upgrades armor>sensors>gyros>plating, gated laser dodge, wider scan, no boost outside combat",4.00,3.54,M(MM,"2ec6d2f"),stack=5,note="simulator said +0.61")
R("M06","BackwardsDeployeds","movement","Charge-aware movement fix (content inferred from adjacent commit subjects: no false stuck recovery while a laser charges)",4.75,4.79,M("brycehcmcgrath__mechfight-bot","2dc3979"))

# ---- T4 target choice
R("G01","BackwardsDeployeds (GT Goats bot)","target","Magazine-aware finishing: prefer targets the current burst can kill",3.71,4.10,BD,receipt="BB-141EA830 -> BB-AB2A1A6E")
R("G02","V.exe (jackbalseca)","target","Engage only mechs that shot at us or aim at us (leave idle house bots alone)",3.58,3.81,JB,receipt="BB-4D4C943D")
R("G03","kyoto-max","target","Weight low hp heavily, sticky target, never retreat from a target under 30%, close to 30 m and boost after it",3.69,3.60,M(KY,"5d63434"),stack=2)
R("G04","jmonked","target","Absolute: target by time-to-kill with a 'kill leash', chase finishable runners",None,2.50,M("jmonked__monked-mech-royale","2400750"),note="later v10 base 2.85")

# ---- T5 loadout / pickups
R("L01","dmclaughlin-bit","loadout","Laser first: walk to the nearest safely reachable laser before anything else",2.38,2.27,DM,receipt="BB-DB8A4479")
R("L02","kyoto-max","loadout","Allow swapping the gun out (lightning 3.5 > laser 3 > gun 1): ends lightning + laser",3.65,3.69,[M(KY,"46ac97d"),M(KY,"79fe56c")])
R("L03","kyoto-max","loadout","Never give up the gun; second slot laser > lightning > mortar (gun + laser)",3.98,3.77,M(KY,"5a971de"),note="within their own measured re-roll noise (0.27)")
R("L04","MauroMiranda28","loadout","Lightning brawler: prefer lightning, swap gun for it (laser + lightning), fight at 28 m, boost in from >45 m",3.81,3.98,[M(MM,"e603196"),M(MM,"b75320f")],stack=2)
R("L05","BingBU (niranjankumarnk)","loadout","Absolute: lightning doctrine (lightning + laser, fights at 28 m, lightning upgrades)",None,3.90,M("niranjankumarnk__mech-royale","fbf9a38"),note="later README keeps lightning + laser; team board score 4.58")
R("L06","Goonies (koillea)","loadout","Take a laser within 70 m when no mech is within 80 m of it",3.69,3.63,M(KO,"06ddf38"))
R("L07","BackwardsDeployeds (GT Goats bot)","loadout","Loot priority weight 1.0 -> 1.6",3.71,3.65,BD,receipt="BB-CA56EA1E")
R("L08","Team-Xero","loadout","Laser-first loot priority + persistent cover + bullet/mortar dodging",2.67,3.00,XS,stack=3)
R("L09","MauroMiranda28","loadout","Early weapon rush (first 45 s, up to 170 m for lightning/laser) + drop ambush + endgame caution",3.98,4.00,[M(MM,"b75320f"),M(MM,"63b88d6")],stack=3)
R("L10","alexwilldev","loadout","Laser seeking mid-fight, weapon preference laser > mortar > lightning, gun range 130 m (batch 16 vs 15)",3.52,3.85,AW,stack=3)
R("L11","alexwilldev","loadout","Add scan spin, early laser detour up to 400 m, laser range 230, strafe flip 0.6 s (batch 17 vs 16)",3.85,3.79,AW,stack=4)
R("L12","Wolverines (TTUN v8-econ)","loadout","Absolute: the 5.19 bot never swaps the gun out; second slot laser 3.2 > lightning 2.5 > mortar 1; never swaps a charging laser",None,5.19,"varchaskukreja__TTUN__branches/b7e9a6d_bot.ts",note="read from code; the same team's other line prefers lightning 3 > laser 2.6 and is the 3.56 line of X02")
R("L13","Lance lineage (LanceHuang245; forks: BackwardsDeployeds, Kanyaraasi)","loadout","Absolute: laser + lightning with gun only as fallback, never mortar",None,4.75,["LanceHuang245__mech-royale/README.md","_triage/readme/devakchow_team-kanyaraasi-mech-royale.md"],note="forks of this bot sit at 5.06 and 5.19 on the board")
