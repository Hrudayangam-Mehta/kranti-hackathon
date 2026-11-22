# Calibration progress (Opus sub-agent, started 06:53 UTC Sat Nov 21)
- Frozen bot copy at start: calib/bot_frozen_start (06:53:44 UTC). Scratch tree calib/tree = sim + frozen bot + kit + hello config.
- Driver: calib/tools/calib.py (runs roster bots only through /srv/mech-sparring/run.sh via sim proc:).
- Step 1 smoke (2 squad matches, seeds 1,2, default table): calib/out/smoke/smoke_summary.json  [running]
- Note: "pure stealth ~0.1" not found in notes; measured hiders score 1.7-2.6 (A22/A24) -> use roster hide bots as passive anchors.
- Scratch house.js changes (to port to P/sim): Math.floor on hunter count; squad.huntClose (0.6) and squad.huntPrefTof (null) knobs; defaults unchanged.
- Calibration set (12): magic_53f6854 5.58, ttun_v8econ_b7e9a6d 5.19, th3r0n_expJ_7775214 5.02, bd_lancecharge_dfe5cdd 4.79, nullatom_7a3a25a 4.46, ourux_v4_2d700d7 4.33, joek_v0_333fb36 3.94, gtgoats_03a8f93 3.71, achintya_734a0cf 3.29, dmcl_0ed6ffc 2.88, colton_hide_285afd7 1.73, kit_starter 1.15
- Held out (3): r1ver_ts_af337d5 5.10, mauro_v14_b75320f 4.00, ourux_hide_e5fb3a9 2.58
- Tools: calib/tools/evalset.py (evaluate(params,bots,seeds,tag)), calib/tools/search.py (build(x), X0). Eval log: calib/out/evals/log.jsonl
