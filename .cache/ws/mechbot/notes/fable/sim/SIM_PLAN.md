# SIM_PLAN (project moderator, 03:00 UTC Sun; the Fable search/moderator stages were stopped to free CPU)

Inputs: calibration.md (analyst), search_engine.md (engine), structural.md + structural_eval.md (strategist, engineer, critic),
switch/*.md (rules, switching, pause/ambush, code designers) and the switch-build sims; official results in submissions.md.

1. Measurement: one official draw has sd ~0.17 score (8.3 kills); the simulator cannot rank changes below ~+0.5 (sign 12/24,
   Spearman ~0); it is a screen for large structural effects only (>= +0.5, z >= 3, >= 200 paired seeds).
2. Earliest-failure signal fired for the target-9 line: no parameter candidate at +0.5 (smoke finalists -0.02/-0.06 at 84 seeds),
   roof sanctuary FAIL (96 seeds, -0.09/-0.12), dropLife nearly inert (we die before the 95 s drop or cannot reach it).
3. Remaining tickets, all final-safe on the 5.38 build, in order:
   a. full salt redraws of FNV (s3..s6 pushed): each a fresh draw of the build's distribution (s1 5.38, s2 5.17); best counts.
   b. switching builds after Fable QA: pauseMove (sim +0.33, 20/24 differ), util tgt (+0.12), isoDwell (+0.12): one slot each.
   c. tweak-layer (ckpt_08_TW) squad-only overrides: one slot each, only after its verifier passes.
4. Early-stop rules per line: two consecutive official results below the line's base stop the line; a tie keeps it only if the
   ticket touched few matches. Redraws continue while slots are free (expected max of N draws rises ~sd*sqrt(2 ln N)).
5. Honest outlook: 9 needs +3.6 (174 kills); nothing in the sim or the official record supports a route there with this brain.
