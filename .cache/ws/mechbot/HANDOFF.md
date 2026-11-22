# HANDOFF — state of the bot project (written 06:50 UTC, Sat Nov 21 2026)

Deadline: submissions close Sun Nov 22 16:00 UTC (11:00 ET). Last safe submission 15:15 UTC.
Owner's standing instructions (binding):
- NO submission until the competitor study is finished and the owner says go. The owner submits by hand on
  the track page (repo URL + optional 40-character commit hash; 4 submissions per hour; best score counts;
  ties go to the earlier submission).
- Public repo: Hrudayangam-Mehta/kranti-hackathon (local clone /home/user/kranti-hackathon; one clean commit;
  holds only a harmless scaffold). Read REPO_HYGIENE.md before touching it: forbidden words, no comments,
  nothing that reveals our code or method; the real bot is pushed only in the minute of a submission, as the
  minified single-file build made by tools/package.sh (minified is approved by the owner).
- Other teams' code is never copied (disqualification rule). Their bots run only as sandboxed external
  opponents from /srv/mech-sparring (outside this tree); P/intel holds read-only clones (not in archives).
- Sub-agents run on Opus from now on (Fable usage is near its limit). Keep main-loop turns short.
- Never touch /home/user/yang_mills_workbench for this project.

## Where things are (P = this directory)
- bot/            readable source of our bot: bot.js (I/O, fail-safes) + lib/{world,nav,aim}.js (geometry,
                  navigation, ballistics; verified: tools/test_world.js 39/39) + lib/{senses,firecontrol,mover,
                  tactics,economy,stance,brain,params}.js (the brain, layers 1-7; tools/test_brain.js 29/29).
                  bot/Dockerfile carries the one-CPU engine limits (see notes/runtime_1cpu.md).
- BRAIN_SPEC_V2.md  binding spec; its top block "DOCTRINE V4" (also DOCTRINE_V4.md) overrides the rest.
                  The code was built against the OLDER text (115 m stand-off, patient heal): bringing it in
                  line with Doctrine V4 is the main pending code task.
- sim/            local simulator (sim.js, physics.js, house.js, procbot.js for external bots, run.js CLI,
                  README.md, test_sim.js). Built; NOT yet calibrated.
- tools/package.sh  builds dist/ (minified bundle + Dockerfile + LICENSE + README), hygiene grep, conformance
                  under a 1-CPU quota (tools/cg1.sh; create the cgroup as in notes/runtime_1cpu.md).
- kit/            official kit (protocol.md, check/check.py, arena/v2 map, schema).
- notes/          all research. Read in this order:
    measured_deltas.md      97 official one-change results from 27 teams + recommendations (the evidence)
    intel_synthesis.md      house-bot behaviour (exact aim, 12-shot rhythm, never retreat) + 12 bot studies
    showdown_profiles.md    how team bots behave in recorded real free-for-alls
    top10_name_map.md       team -> public repo map (14 of top 16 found; AT and BobBuildIt not found)
    intel/top_*.md          per-team counter studies (done: A-bot LLC/scorpion, tigerbyte/TigerTown27,
                            Wolverines, Kanyaraasi, AT+BobBuildIt profile, BackwardsDeployeds, ImagineLosing;
                            pending: r1ver, Mahalas, not even close, 404, RN SUS, 314159265)
    redteam_practice.md, redteam_final.md   pre-mortems of our own design (done)
    tactics_update_r2.md    second panel's change list (verdict on the owner's Elite report)
    baseline_parity.md      checklist of what the best public bots do vs our spec/code; repo_conventions.md
    sparring_roster.md/.json  about 110 runnable sandboxed public bots with official scores
    rules_audit.md          rules, scoring levers, submission strategy; runtime_1cpu.md; brain_checkpoint.md
    panel_*.md, tactics_spec.md, stance_playbook.md   first panel (theory; overruled by measured evidence)
- ../web/         leaderboard snapshots (mech_leaderboard_now.json, mech_submission_times.json)

## Key facts to remember
- Practice score = house bots dead before we die. Top 5.58, cut for the final (32nd) about 4.45 and rising.
- Measured: hiding / long-range gun duels / roofs / passivity lose; fight on, retreat only when losing,
  farm crates and drones at full health, grab cubes and a laser even mid-fight, laser is the key weapon.
- The 5.58 bot (Kgc3105/MAGIC-Royale @ 53f6854) kites at 125-185 m with a laser, breaks off only at six
  hunters or low health, and lost 0.41 when low-health retreat was removed.
- Final = real free-for-all: bottom half dies in a median 21 s; calm, laser-heavy, well-cubed bots win.
  One bot must do both: SQUAD default, FFA latch on deaths we did not cause.
- Local simulators mispredict (six wrong-sign cases measured by others): trust it for crashes / stuck /
  timing / gross sanity; doctrine comes from official-scorer evidence.
- Under the real 1-CPU quota the default engine settings gave 43-51 ms worst answers; the Dockerfile's
  BUN_JSC_* limits give 12-14 ms.

## Pending work, in order
1. Brain integration pass 1: finish the two reviewers' findings (they are the "result" lines of
   .../subagents/workflows/wf_03979f5c-c6d/journal.jsonl; the first fixer was stopped part-way: tests still
   29/29), implement Doctrine V4 (D0-D12) incl. determinism and start-up rehearsal, then the ranked fixes
   from redteam_practice.md, redteam_final.md, tactics_update_r2.md and baseline_parity.md; independent
   verification; simulator smoke runs.
2. Simulator calibration against the roster's official scores; yardstick run of our bot; FFA league.
3. Remaining counter studies, then notes/counter_dossier.md (per-team counters + adversarial check) and
   the FFA counters folded into the brain (pass 2).
4. Submission compliance check of dist/ against the primary guideline texts (notes/compliance_check.md).
5. Tell the owner the dossier and the bot's measured state; on "go": tools/package.sh, copy dist/* into
   /home/user/kranti-hackathon, hygiene grep, commit with a neutral message, push, give the owner the URL
   and commit hash; log every submission (id, commit, one change, score) in notes/submissions.md.
6. After the first scores: salts (PARAMS.salt) and one-change presets as extra draws; lock by 15:15 UTC Sun.
7. Tactics report for the owner (kept out of the repo until results are published).
