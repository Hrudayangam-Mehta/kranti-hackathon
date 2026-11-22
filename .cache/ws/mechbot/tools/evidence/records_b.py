# Evidence records, part B. Same conventions as part A.
from records_a import A, R, M, O, JB, NP, DM, XS, AW, BD, MM, KY, KO
S = "simulator"; W = "recorded_public_matches"; LV = "live_server_private_rooms"
AR = "Achintya-Lakshmanan__mech-royale-bot/docs/REPORT.md"
EV = "dmclaughlin-bit__mech-bot/pipeline/data/evidence.jsonl"
MR = "moonriver0922__wgsrobot/experiments/official-runs.md"

# ---- T6 upgrades
R("U01","kyoto-max","upgrades","Lightning-first order: plating, armor, lightning_efficiency, lightning_range, nanites, capacitor, laser_damage, reactor",3.98,3.69,M(KY,"8b6a735"),note="their seed-only reshuffle moved the score by 0.27")
R("U02","Wolverines (TTUN v8-econ)","upgrades","Absolute: 5.19 bot order plating, armor, nanites, lightning_efficiency, laser_damage, laser_charge, gun_damage, gun_rate, lightning_range, lightning_chain, gyros, servos, gun_mag, capacitor, reactor, jets, gun_velocity, sensors, mortar_*, laser_pierce",None,5.19,"varchaskukreja__TTUN__branches/b7e9a6d_bot.ts",note="read from code")
R("U03","Showdown winners (7 matches)","upgrades","Picks of the 7 recorded free-for-all winners: laser_damage 6 picks (4 winners), plating 6 (4), armor 6 (4), nanites 3, capacitor 4 (3), servos 3 (2), laser_charge 3 (2), sensors 2",None,None,EV,scorer=W,note="5-7 upgrades each; free-for-all, not practice")
R("U04","jmonked","upgrades","Plating before armor (x1.15 vs x1.087 effective hp per pick; plating also helps against zone damage)",None,None,M("jmonked__monked-mech-royale","c6c97c4"),note="reasoning only, no score")

# ---- T7 economy
R("E01","kyoto-max","economy","Early farming run until 200 s or 10 cubes while hp >= 50%: walk to 60 m of remembered drones / 25 m of ground crates",3.69,3.96,M(KY,"2ef45b8"))
R("E02","kyoto-max","economy","Farm longer: until 270 s or 21 cubes",3.96,3.83,M(KY,"1921375"))
R("E03","kyoto-max","drops","Aggressive supply drops: up to 350 m (was 170), boost when >80 m away, contest a held drop when above 60% hp",3.96,3.75,M(KY,"e864cbe"),stack=3,note="'every change that added travel or time in the open lost points'")
R("E04","MauroMiranda28","economy","Actively farm crates and drones until 230 s (walk to remembered ones, explore for more)",3.46,3.83,M(MM,"7d7c9c3"))
R("E05","MauroMiranda28","economy","Push harder: cube memory to 150 m, farm until 300 s, trips up to 260 m, drops from 260 m and contest a lone capturer",3.83,3.71,M(MM,"d12e24a"),stack=4)
R("E06","MauroMiranda28","economy","Climb roofs (up to 36 m) for crates, cubes and loot",3.98,3.77,M(MM,"b75320f"))
R("E07","dmclaughlin-bit","economy","Farm cubes/drones/crates when no enemy within 160 m",2.38,2.44,DM,receipt="BB-35E5C75F")
R("E08","dmclaughlin-bit","economy","Farm reach: walk toward drones and crates within 150 m when safe",2.44,2.54,M("dmclaughlin-bit__mech-bot","2930b6b"),receipt="BB-5573AA45")
R("E09","nullat0m7","economy","Crate and cube range 90 -> 140 m",4.44,4.35,NP)
R("E10","nullat0m7","drops","Chase supply drops out to 300 m (was 220), still must arrive in time",4.44,4.46,NP,note="+1 place-point of 213")
R("E11","nullat0m7","drops","Also chase already-landed, untaken drops anywhere within 300 m",4.46,4.38,NP)
R("E12","Goonies (koillea)","economy","No crate shooting",3.69,3.04,M(KO,"e3a20e7"))
R("E13","Jiackary","economy","First 110 s: loot search radius 250 m (was 160), near-360 scan; hunt remembered drones when healthy and no mech in sight",3.96,4.06,M("Jiackary__buildathon_26","fd8b439"),stack=2)
R("E14","JorgeN0","economy","v1 -> v5 stack: fight only threats, early weapon, farm remembered drones/crates within 250 m, focus the wounded, free-for-all detector",3.38,4.28,"JorgeN0__Mech-Royal/CLAUDE.md",stack=5,note="their calibrated simulator predicted 4.3-4.4")
R("E15","alexwilldev","economy","Cube farming until 8 cubes or 230 s (crates 110 m, drones 120 m, cubes 120 m)",3.73,3.56,AW,note="scorer reported answer waits; batch 12 with farming off scored 3.46")
R("E16","Wolverines (TTUN v8-econ)","economy","Absolute: 5.19 bot. Cubes remembered 40 s; mid-fight detour to a cube within 70 m (hp>50%), 40 m (lower), 12 m (losing); weapon within 60 m gun-only / 35 m; crates on the ground within 150 m approached to 30 m when hp>45%; drones within 170 m approached to 38 m when hp>50%; drop within 220 m, not held by another, not more than 3 s early",None,5.19,"varchaskukreja__TTUN__branches/b7e9a6d_bot.ts",note="read from code")
R("E17","r1ver (moonriver0922)","economy","TTUN v8-econ derivative choosing cube piles by upgrade value",None,5.08,MR,receipt="BB-74CEE7A0",note="base changed from their 4.67 bot, so +0.41 is not attributable")
R("E18","micah-andelman","economy","Stepping onto cubes within 25 m mid-fight: 'measured harmful'; a similar bundle measured at -0.66 by another team",None,None,M("micah-andelman__mech-royale","0bdf2b0"),note="second-hand, no receipts")
R("E19","A-bot LLC (Kgc3105, inferred)","economy","Absolute: 5.58 bot grabs a nearby cube or laser even in contact, farms crates/drones only at full health",None,5.58,M("Kgc3105__MAGIC-Royale","347636b"),note="design note, not an A/B")

# ---- T8 zone / endgame
R("Z01","dmclaughlin-bit","zone","Path-aware zone travel with a leave-time rule",2.17,2.23,DM,receipt="BB-955D92D8")
R("Z02","SeanCowen","zone","Successive versions ending with region routing to the next circle, drop look-ahead, opening cube preference",3.77,4.06,"SeanCowen__oval-runner/README.md",stack=4,note="3.77 -> 3.88 -> 3.98 -> 4.06")
R("Z03","r1ver (moonriver0922)","zone","Short ground-path check on top of the cube-pile version",5.08,5.10,MR,receipt="BB-EAEAF89A")

# ---- T9 cover / roofs
R("C01","dmclaughlin-bit","cover","While holding, walk silently to the nearby spot the fewest enemy eyes can see",2.38,2.23,DM,receipt="BB-BC5A52AB")
R("C02","GT Goats","roofs","Rooftop camping",3.60,3.23,"atharvatripathi2026__gtgoats_mech_royale/README.md")
R("C03","Goonies (koillea)","roofs","Roof perching off (covered ground spots instead)",3.69,2.96,M(KO,"2d7c25b"),note="author: confounded with a merge; roof versions 3.52/3.69 vs no-roof 3.21/2.96")
R("C04","colton-boi","roofs","Hold a rooftop instead of a ground cover spot",2.56,1.63,M("colton-boi__Mech-Bot","d6dfb7a"))
R("C05","BingBU (niranjankumarnk)","roofs","Absolute: fight from a roof against the practice squad",None,2.40,M("niranjankumarnk__mech-royale","d308a0c"),note="'scored worse', switched off")
R("C06","Rohanasudani","roofs","Pressure-triggered roof climbs",1.56,1.38,"Rohanasudani__edgewise-mech-royale/SUBMISSIONS.md",receipt="BB-9AA67944")
R("C07","alexwilldev","roofs","Rooftop camping when idle (batch 14/15)",3.46,3.52,AW,note="author: 'def not the move'")
R("C08","Team-Xero","cover","Concealment-scored hold spots, canopy model, engagement policy",2.63,2.67,XS,stack=3)

# ---- T10 fire control / execution
R("F01","Team-Xero","execution","Execution fixes only: aim at first visible body point (centre, +2 m, +3.6 m), torso follows gun lead and hands off to laser aim at 80% charge, never dump a charge, no gun at strafing targets beyond 140 m",3.35,3.75,XS,stack=4,note="second run of the same code 3.90")
R("F02","Team-Xero","execution","Hold the trigger when the cooldown ends inside the 0.1 s decision window (gun was firing every ~0.3 s instead of 0.24 s)",None,None,XS,scorer=S,note="official score 'pending'; simulator 1v1 vs gun hunter 46.0% -> 56.3% wins over 1024 matches")
R("F03","dmclaughlin-bit","execution","Aim and track each weapon properly (on the kit example bot)",1.15,1.67,DM,receipt="BB-92A5D3DC")
R("F04","V.exe (jackbalseca)","execution","Fix a crash that stopped the bot firing whenever it steered to a pickup",2.56,3.44,JB,receipt="BB-07B3FDEA -> BB-1F463041")
R("F05","afiapoks","execution","Predictive aiming on the starter bot",1.15,1.38,"afiapoks__mech-royale/RESULTS.md")
R("F06","A-bot LLC (Kgc3105, inferred)","execution","Aim with own-motion compensation and a tighter on-target window",None,None,M("Kgc3105__MAGIC-Royale","bb460bb"),scorer=S,note="local sparring: laser releases on mechs ~70% -> 97% hits, gun 69% -> 74%")

# ---- T11 navigation / timing
R("N01","dmclaughlin-bit","navigation","Nearest-reachable fallback for failed paths (offline failures 179 -> 85 of 2000)",2.38,2.35,DM,receipt="BB-9A951653")
R("N02","dmclaughlin-bit","navigation","Wall padding 2.0 -> 2.5 m",2.38,2.10,DM,receipt="BB-5BB9D164")
R("N03","Goonies (koillea)","timing","Decision-time fix only (path search stops at a 2.5 ms deadline), 'no behaviour change'",3.52,3.69,M(KO,"2d7c25b"))
R("N04","alexwilldev","timing","12 ms soft per-tick budget, cached cover search, path search cap (fix for late answers seen on the scorer)",3.35,3.73,AW,stack=3)
R("N05","alexwilldev","timing","Hard 20 ms deadlines inside searches on top of the farming batch",3.56,3.17,AW)

# ---- T12 free-for-all detection
R("X01","V.exe (jackbalseca)","ffa_detection","Switch to free-for-all targeting only on an unexplained death before 90 s, or 3+ overall",3.81,3.81,JB,receipt="BB-D884C5A1",note="identical score: the stricter rule never changed behaviour in the 48 practice matches")
R("X02","Wolverines two lines (second one submitted by micah-andelman)","ffa_detection","Two lines of one bot. Branch A (5.19): economy package (cube and weapon memory, mid-fight cube detours), laser 3.2 > lightning 2.5, plating first, no free-for-all logic. Line B (3.56 when another team submitted it): free-for-all latch (3 uncaused deaths or two beam clues), silence near mechs, endgame cover hold, laser cover; lightning 3 > laser 2.6, armor first, no cube or weapon memory",5.19,3.56,[M("micah-andelman__mech-royale","e189b97"),M("micah-andelman__mech-royale","587504c"),"varchaskukreja__TTUN__branches/b7e9a6d_bot.ts","varchaskukreja__TTUN/mech-royale/bot/bot.ts","_meta/varchaskukreja__TTUN.git@edf5776 (commit message)"],stack=6,note="confounded: the 1.63 gap is the economy package and loadout order and/or a leaking free-for-all latch; public bots otherwise reproduce exactly across teams (D03)")
R("X03","JorgeN0","ffa_detection","Detector (>=2 uncaused deaths before 120 s or >=4 any time): fires for 85% of free-for-all bots (median 17 s), 4% false positives in practice",None,None,"JorgeN0__Mech-Royal/CLAUDE.md",scorer=S)
R("X04","Achintya-Lakshmanan","ffa_detection","Detector (more deaths than our kills + 1) switched at 22.7 s on one recorded free-for-all",None,None,AR,scorer=W)

# ---- T13 determinism and noise
R("D01","nullat0m7","noise","Identical behaviour resubmitted",4.44,4.44,NP)
R("D02","dmclaughlin-bit","noise","Identical commit resubmitted",2.17,2.17,DM,receipt="BB-91057C0A / BB-89ECDFF6")
R("D03","cross-team","noise","Same public code gives the same score for different teams: Lance v0.5 quiet-on 4.54 (author and BackwardsDeployeds); quiet-off 4.75 (BackwardsDeployeds and davidvarvas); GT Goats 03a8f93 3.71 (author and BackwardsDeployeds)",None,None,[BD,"LanceHuang245__mech-royale/README.md","atharvatripathi2026__gtgoats_mech_royale/README.md",M("davidvarvas__mech-royale-bot","f1d0f81")])
R("D04","V.exe (jackbalseca)","noise","Same strategy, only the bot's random salt changed",3.81,3.75,JB,receipt="BB-3D1125E1")
R("D05","kyoto-max","noise","Same bot, only the strafe random seed changed",3.98,3.71,M(KY,"0ec8628"))
R("D06","kyoto-max","noise","Unchanged resubmit of a bot whose path search runs on a wall-clock budget",3.96,3.98,M(KY,"8b6a735"))
R("D07","Team-Xero","noise","Same commit scored twice (wall-clock time-sliced search)",3.75,3.90,XS)
R("D08","alexwilldev","noise","Same build scored twice",2.38,2.71,AW)
R("D09","nullat0m7","noise","Own simulator, same parameters and 48 seeds, only worker layout changed: means 3.33-3.77 (sd 0.15); 12 of 48 placements differ",None,None,NP,scorer=S)

# ---- T14 simulator validity (prediction vs official)
R("V01","nullat0m7","sim_validity","Long-range stack: simulator 4.76 -> 6.76 -> 7.63 predicted, official 4.44 -> 3.98",4.44,3.98,["nullat0m7__mech-royale/docs/bot.md",NP],note="wrong sign")
R("V02","V.exe (jackbalseca)","sim_validity","Long-range duelling: simulator +0.3 to +1.0, official -0.77",3.81,3.04,JB,note="wrong sign")
R("V03","A-bot LLC (Kgc3105, inferred)","sim_validity","No-retreat bundle: simulator +0.25 +-0.07 over 600 matches, official -0.41",5.58,5.17,M("Kgc3105__MAGIC-Royale","e39579f"),note="wrong sign")
R("V04","ourux","sim_validity","Fight every visible hunter: simulator +1.2 (~3 SE), official -0.18",4.33,4.15,M("ourux__MechRoyale","1a96803"),note="wrong sign")
R("V05","MauroMiranda28","sim_validity","'Safe tweaks' bundle: simulator +0.61, official -0.46; author: sim anti-correlated with the track",4.00,3.54,M(MM,"2ec6d2f"),note="wrong sign")
R("V06","alexwilldev","sim_validity","Laser range 255: simulator 5.10 (+0.15), official 3.42 (-0.37)",3.79,3.42,AW,note="wrong sign")
R("V07","LanceHuang245","sim_validity","Hide probe: simulator 3.19 vs 5.40 (-2.2), official 4.04 vs 4.54 (-0.5)",4.54,4.04,"LanceHuang245__mech-royale/README.md",note="right sign, size 4x too large")
R("V08","r1ver (moonriver0922)","sim_validity","Four scored builds re-run locally: of six pairwise orderings 3 agree, 1 tie, 2 reversed",None,None,MR,scorer=S)
R("V09","Conquer The World (Borovail)","sim_validity","Third-party squad simulator: kit example 4.88 locally vs 1.15 official; constant-offset correction leaves mean abs error 1.69 on three external builds",None,None,"Borovail__builders-mech-royale/PLAN.md",scorer=S)
R("V10","KennethLei1492","sim_validity","First real score 4.52 vs simulator 7.32 (simulated house bots never fired beyond ~126 m)",None,4.52,M("KennethLei1492__Builder-Mech-Royale","247ccb8"))
R("V11","Team-Xero","sim_validity","Solo duel: simulator -0.39, official 3.52 vs 3.75 (agrees)",3.75,3.52,XS,note="right sign")
R("V12","JorgeN0","sim_validity","Calibrated simulator predicted 4.3-4.4 for v5, official 4.28 (agrees)",None,4.28,"JorgeN0__Mech-Royal/CLAUDE.md",note="right")

# ---- T15 structural observations (not practice A/Bs)
R("S01","Showdown winners vs bottom (7 recorded Top-16 matches)","structure","Winners / bottom half means: laser share of damage 69.7% / 17.7% (winners' range 31.7-85.2%); gun share 15.1% / 80.8%; max cubes 25.9 / 0.66 (winners 15-35); supply drops taken 1.0 / 0 (winners 0,0,0,1,1,2,3); boost time 10.7% / 25.0%; nearest enemy 187 m / 114 m; hits on targets under 50% hp 46.6% / 24.7%; hold time in the open 0.7% / 39.5%; life 223 s / 27 s; 6 of 7 winners ended laser + lightning, 1 gun + laser",None,None,EV,scorer=W,note="free-for-all exhibition, time-at-risk confound")
R("S02","Recorded matches (13 matches, 208 rows)","structure","Laser picked up after 15 s scores better than within 15 s (10.51 vs 7.60 mean points, n=43/57); winners hold in the open 6.2% vs 36.6% for the bottom eight; winner loadout has a laser in 11/13 (8/8 showdowns)",None,None,"dmclaughlin-bit__mech-bot/research/intake/diego-match-data-1129.md",scorer=W)
R("S03","Achintya-Lakshmanan recordings","structure","Deaths: 55% involve 2+ attackers; median kill distance 44 m; deaths per minute 0.36 with no mech within 60 m, 2.02 with one, 4.58 with two; zone centre 0.85 vs near edge 0.55; 3-s burst laser 432, lightning 348, mortar 163, gun 121",None,None,AR,scorer=W)
R("S04","Achintya-Lakshmanan recordings","structure","Top-16 showdowns: practice ranks 1-4 averaged 8th, 9th, 6th and 12th; a 41%-boost bot lived 36 s (avg 12th); a bot standing 74% of the time lived 3 min (avg 4.8th); an expert house bot averaged 4.2th",None,None,AR,scorer=W)
R("S05","skandra08","structure","House-bot gun hit rate on the real server (~1500 shots): 94% inside 40 m, 58% at 40-80 m, 31% at 80-130 m, 12% at 130-230 m; own lead aim ~65% at all ranges",None,None,M("skandra08__robo-fight","79d9eeb"),scorer=LV)
R("S06","swan28pande","structure","Recorded live match: house bots hit 55-75% of gun shots, reverse strafe about every 0.8 s, weakest tiers hunt first",None,None,M("swan28pande__oval-tools","0566bf3"),scorer=LV)
R("S07","kyoto-max","structure","3 recorded live matches: gun 52% of damage to mechs, laser 33% at 15-27% laser accuracy; every house bot kept its gun; the best house bot ended gun + laser in 10 of 12",None,None,M(KY,"9913da9"),scorer=LV)
R("S08","Achintya-Lakshmanan private rooms","structure","Free-for-all vs 15 house bots, 48 games each: quiet variant 10.75 +-0.51 (kills 1.21) vs fighting variant 9.33 +-0.66 (kills 1.90): hiding wins free-for-all and loses practice",None,None,AR,scorer=LV)
R("S09","moonriver0922 simulator","structure","Per-match points in a local practice simulator are bimodal: 56-69% of matches score 0-2, 12-28% score 15, 12-31% in between; at mean 5.59 wins were 28% of matches and 75% of points",None,None,["moonriver0922__wgsrobot/experiments/results.csv","moonriver0922__wgsrobot/experiments/calibration-19551.csv"],scorer=S,note="no official per-match data exists")
R("S10","several teams","structure","No per-match official data: the site shows only the aggregate score, no replays",None,None,["dmclaughlin-bit__mech-bot/pipeline/data/experiments.jsonl","nullat0m7__mech-royale/CLAUDE2.md",AW])
R("S11","leaderboard history (ET, Nov 20)","structure","21:00 top 5.23 of 94 teams; 21:40 top 5.40, 16th 4.33, 32nd 4.04; 22:15 top 5.48, 16th 4.52, 32nd 4.13; 22:39 top 5.58; 23:17 16th 4.73, 32nd 4.23; 23:48 144 teams, top 5.58, 16th 4.77, 32nd 4.29",None,None,["dmclaughlin-bit__mech-bot/coord/log.md",DM,"nullat0m7__mech-royale/CLAUDE2.md"])
R("S12","house squad composition","structure","15 house bots: 4 easy, 4 medium, 4 hard, 3 expert; shared vision; never fight each other; weakest hunter first, more as they thin, all late. Join schedules in team simulators are guesses (1 at 20 s then 1-2 per kill, all at 240-300 s)",None,None,["dmclaughlin-bit__mech-bot/research/GAME_CONTEXT.md","nullat0m7__mech-royale/docs/bot.md","joekritenbrink0-wq__mech-bot/README.md"])
R("S13","AlexJawhari","structure","A simulator where only hunters shoot gives 6.4 against a real 2.40: real squad members engage on sight",None,None,"AlexJawhari__buildathon-mech/NOTES.md",scorer=S)
R("S14","LanceHuang245 league simulator","structure","Free-for-all ceilings when granted to 4 of 16 bots: damage taken -30% +1.65; max hp +30% +1.36; wide vision +0.90; damage dealt +30% +0.63; 1.5x hit boxes +0.28; starting with 10 cubes +1.67",None,None,"LanceHuang245__mech-royale/README.md",scorer=S)
