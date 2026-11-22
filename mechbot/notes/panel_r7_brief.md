# Panel R7 brief (moderator, 21:26 UTC Sat) — read fully before you start

You are one expert on a moderated panel (3 rounds) improving our entry in a 3D mech arena bot contest. Rules and
protocol: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/protocol.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/README.md; our rules study: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/rules_audit.md.
Write your round-1 memo to /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r1_<lens id>.md (new file) and scratch only under
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r7/<lens id>/ (new folder). Read-only everywhere else: never edit /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools outside your
folder, other notes, or /home/user/kranti-hackathon; never run git; never connect to any game server; never copy other
teams' code (clean room: our own prose notes about them are fine). Use `taskset -c 2` for any simulator or CPU-heavy run
(other cores are busy with an engineer and release gates). Bun: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun. Do not delete directories.

## Scoring
- Practice match = our bot + 15 house bots forming one squad with shared vision; house bots never fight each other.
- Our points per match = house bots dead before we die (placement). Score = mean over 48 fixed practice seeds.
- Only our best submission counts; ties go to the earlier submission.
- Changing PARAMS.salt (a fresh draw of our own RNG) moves the score with sd about 0.24 per draw.
- 6 submissions per hour; close Sun 16:00 UTC (last safe slot 15:15). Now about 21:30 UTC Sat (~18 h, ~105 slots).
- Board: top 6.31; top-32 cut about 5.4 and rising (projected 5.8-5.9 at close).
- Final = free-for-all among the top 32 entries on new seeds. The entry we nominate keeps its practice score and must be
  above the cut. The final may change balance, zone schedule or the map folder (the hello's config is the rule set).

## Official results (salt 0 unless noted; presets live in /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot/lib/params.js SELECT)
| build | change | score |
|---|---|---|
| pre-R3a2 | all R3a2 items off | 5.02 |
| V1 | full R3a2 | 4.98 |
| V2 | V1 + old farm-first opening | 4.60 |
| V3 | V1 without boost spending | 4.83 |
| **V4** | V1 + retreat 'd3' (heal breaks) | **5.15 (best)** |
| V4 salt 1 / salt 2 | same code | 4.69 / 5.06 |
| F02 | V1 + farmHp 90, boost off, upg std | 4.85 |
| F03 | V1 + focus mult, retreat d3, upg std | 4.94 |
| K0 | V4 + laserEcon off, laserRange far, focus mult, farmHp 90, upg std | 5.04 |
| H | V4 + hunt 'h50' (hit-and-run, pulse cover) | 4.98 |
| S | V4 + seek 'on' | 5.13 |
| HL | V4 + hunt 'lite' | 4.73 |
Pending this hour: S salt 1, S salt 2, K0 salt 1, KS (K0 + seek) salt 0/1/2. Readings so far: fighting early about
+0.38; heal breaks vs pulse +0.17 on one draw (0.00 +- 0.28 pooled per the rewards panel); nothing beats V4 beyond noise.

## Code and backlog
- Readable source: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot (R4a code: lib/hunt.js adds hunt/seek; lib/world.js now follows hello.map.files).
- Binding but unbuilt specs: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_spec_r5.md and /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_spec_r6.md.
- An engineer is implementing now, in this order, as default-off presets: RB2-RB6 robustness, IO-A timing, R5a (FIN
  finish ttk, ISO isolate near, LC loseCover near, ESC hunt esc), R5b (AVO focus av, LG laserGrab wide), R6a (heal
  need/full, zoneEsc edge, ffaHeal / zoneEscFfa). Do not plan to rebuild these: rank, refine, add to or veto them.
- Evidence notes in /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes: panel_r6_rewards.md (reward table, action-to-reward ratios), panel_r6_io.md,
  panel_r6_robustness.md, panel_r5_research.md, panel_r5_algorithms.md, panel_r5_design.md, panel_r4_gameplay.md,
  measured_deltas.md, mechanics_deep.md, housebot_model.json, forensics.md, top5_synthesis.md, counter_dossier.md,
  stance_playbook.md, submissions.md, owner_requests_r6.md. Replays of official matches (if any): /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/replay.
- Simulator: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim (`/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bun /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim/run.js --help`); transformed maps and helpers: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/panel_r6/maps. Use it for
  behaviour and failure-mode checks only. It has had the sign of within-bot deltas wrong six times: never rank by it.

## Owner's standing requests
Full-heal disengage (no fight until fully healed); zone escape (take small zone damage instead of a losing fight);
use the protocol timing/outputs better; a reward table and action-to-reward ratios; robustness to a new map and random
spawns without hard-coding; a dynamic time- and state-based risk factor (when to go for crates, push, be risky);
hunt50 hit-and-run; loot stealing; late-game scan; head-aimed laser; smart use of the scoring (best-of draws) within
the rules.

## How to write
Tag every claim: [M] official result, [T] a top bot's choice, [S] our simulator, [A] arithmetic/model, [N] no evidence.
Be concrete: preset or code site, trigger, exact change, expected delta with a range, engineering minutes, risk, test.
Few strong items beat many weak ones. Finish within about 35 minutes of work. End your memo with a section
"## Summary for the moderator" (at most 25 lines: top proposals ranked, vetoes, questions for the other experts).
Your final message back should be that summary section plus the memo path.
