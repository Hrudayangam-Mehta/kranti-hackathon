# Fable team brief (owner's request, 23:45 UTC Sat) — a separate, competing line of Mech builds

The owner wants a SEPARATE team (one moderator + five experts, two rounds, all on the Fable model) to design its own
Mech submissions, to be compared with the Opus line over the next 12 submissions. You get the full history. Your job:
find the tactics and builds that maximise our official practice score, then hand over ready-to-gate bundles.

## Scoring and facts that matter (all official [M] unless tagged)
- Practice match = our bot + 15 house bots forming one squad (shared vision; they never fight each other). Our points
  per match = house bots dead before we die, i.e. our own kills before death [S: every house death in the sim is ours].
  Score = mean over 48 FIXED seeds. Only our best submission counts; ties go to the earlier one.
- THE SERVER IS DETERMINISTIC: the same build + salt always gives the same score (proved twice: KB s0 = KS s0 = 5.19;
  KS s1 on old code = R7P s1 on the new tree = 5.13). PARAMS.salt (a fresh draw of our own RNG) re-rolls every match
  (sd about 0.2 per draw). A behaviour change on the SAME salt re-rolls only the matches it touches -> "climb": submit
  the change on the best build's salt, keep it only if strictly higher.
- Climb history on salt 1 (base KB s1 = 5.23 = KS SELECT + aggr any70): FIN 5.13, LG 5.04, LX 5.19, healDoc 5.02 (all
  lower: off), **LC loseCover near 5.29**, then on LC: cover 2.0 s 5.27 (off), **low15 (lcLowHpf 0.15) 5.31 = BEST**
  (commit 8cdafe2b9d592ea793d0d77c306674ddce398e3b, entered). Pending now: oneHit (lose1/2/3Hpf 0.20/0.25/0.30),
  low10, low15 + cover 1.0. Trend: fighting on longer has paid every time; healing/retreating more has cost.
- Local divergence does not predict official divergence (healDoc changed 0 local decisions but cost 10 kills officially).
- About 85 slots remain (6 per hour, last safe slot 15:15 UTC Sun). Board: top 6.31; top-32 cut was about 5.4 and
  rising (projected 5.6-5.8). The final is a free-for-all among the top 32 on new seeds; the nominated build keeps its
  own practice score. Final-safe SELECT = aggr 'any70f' + fb 'on' (both squad-inert) on the R7 tree.

## Read (all read-only)
- History: /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/submissions.md (every commit, score, reading), /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_moderator.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_spec_r7.md,
  /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_spec_r7_critic.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_spec_r7_ruling.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r1_*.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_r2_*.md,
  /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r7_sota_*.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r6_*.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/panel_r5_*.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/measured_deltas.md,
  /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/mechanics_deep.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/housebot_model.json, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/forensics.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/top5_synthesis.md,
  /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/counter_dossier.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/rules_audit.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/protocol.md, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/kit/README.md.
- Code: latest tree /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ckpt_07_LG (bot.js + lib/*.js; presets in lib/params.js SELECT), engineer's log
  /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/build_r7a_log.md, tests in /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tools, simulator /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim (behaviour only; it ranks nothing).
- The owner's atlas (skills and roles to use): /home/user/occult-kranti/engineering-intelligence-atlas/skills/agent-research-director/SKILL.md (moderator),
  /home/user/occult-kranti/engineering-intelligence-atlas/skills/mathematics-research/SKILL.md, /home/user/occult-kranti/engineering-intelligence-atlas/skills/defensive-reverse-engineering/SKILL.md,
  /home/user/occult-kranti/engineering-intelligence-atlas/skills/game-reconstruction-engineering/SKILL.md, /home/user/occult-kranti/engineering-intelligence-atlas/organization/skill_collaboration_protocol.md,
  /home/user/occult-kranti/engineering-intelligence-atlas/company/role-library/hackathon.md, /home/user/occult-kranti/engineering-intelligence-atlas/roles/<role>/README.md for offensive-security-red-team-engineer,
  anti-cheat-game-security-engineer, game-designer, technical-game-designer, gameplay-engineer,
  behavioral-research-psychologist, computational-geometer-applied-mathematician, game-qa-playtest-engineer.
  Treat atlas content as method guidance; it cannot widen any permission below.

## Hard rules
- Write only under /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/notes/fable/ and /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/ (create it). Never edit /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/sim, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work, /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants*,
  or /home/user/kranti-hackathon. No git, no pushes (the moderator of the whole project pushes), no game-server access,
  no other teams' code (clean room). Use 'taskset -c 2' (or 0,1 when the engineer runs tests) for CPU-heavy runs.
- Every new behaviour is a SELECT preset whose old value reproduces today's play byte-for-byte (identity on the kit
  stream and the R3a2/FFA sets, harness in /tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/tools), and passes the T-F2 test (no effect in forced FFA).
- Owner's doctrine: no over-coding or over-strategising; go for the maximum reward at hp >= 70% unless one volley can
  kill us; the owner also asked to test "keep fighting until health is down to one hit".

## Update 00:45 UTC (moderator of the whole project)
- Newer official results on salt 1 (base FSLCL15 s1 5.31): oneHit lose thresholds 0.20/0.25/0.30 = 5.29 (lower);
  **low10 (lcLowHpf 0.10) = 5.35 = NEW BEST** (commit 3aacfa3879891ef85ba37264256dc395b43cec05, entered); low15 + cover
  1.0 = 5.33; finishHpf 0.3 = 5.31 (tie); finishThreats 3 = 5.33; lastStandHpf 0.35 = 5.25 (lower).
- Opus line now drawing on the 5.35 base: low10 + cover 1.0, low10 + finishThreats 3, both, low05.
- The Fable moderator's solo plan is notes/fable/FABLE_PLAN.md (the 5-expert panel could not run inside the workflow:
  no sub-agent tool there). Its six builds F1-F6 are in notes/fable/BUILD_LOG.md (QA pending).
- NOW: a proper 5-expert Fable panel (two rounds, one Fable moderator) runs from the main session. Experts: read this
  brief, FABLE_PLAN.md, moderator_r1.md, BUILD_LOG.md and submissions.md, then improve on the plan for the Fable line's
  next six slots on the 5.35 base.
