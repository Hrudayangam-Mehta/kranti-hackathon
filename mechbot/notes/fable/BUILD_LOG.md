# Fable line BUILD_LOG (gameplay engineer, Fable sub-agent; 00:05-00:25 UTC Sun Nov 22)

S = scratchpad, F = S/fable_work. Nothing pushed, no git, no game server; r7work, mechbot/bot, mechbot/sim, variants* untouched
(read only). Base B = FSLCL15 s1 (8cdafe2, 5.31): notes/submissions.md had no result for any Opus step on it at build time.

## Tree and harness
- `F/bot` = copy of r7work/ckpt_07_LG; only `lib/params.js` differs (three PRESETS lines; SELECT and salt as in ckpt_07_LG).
  New preset values (old values untouched):
  - loseCover: `near10`, `near20`, `low15` (verbatim from variants6/FSLCL15_s1, needed for the base), plus
    `oneHit: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0.23 }`, `never: { loseCoverNear: true, lcCoverS: 0, lcLowHpf: 0 }`,
    `c075: { loseCoverNear: true, lcCoverS: 0.75, lcLowHpf: 0.15 }`
  - healDoc: `low: { healEnterHp: 0.40 }`
  - aggr: `any60f: { aggrFw: true, aggrHpf: 0.6, aggrS: 0, h50SeekHpf: 0.6 }`
- `F/tools` = copy of r7work/tools with the work-folder path pointed at F; `F/kit`, `F/replay` -> mechbot; `F/notes`,
  `F/ref_bot` -> r7work (read only); `F/sim/*.js` = copies of r7work/sim (the folder also holds the moderator's sweep data);
  `F/id/ck07` -> r7work/id/ck07 (reference recordings of ckpt_07_LG).
- test_tf2.mjs extended: loseCover low15 / oneHit / never / c075 in the loseCover case; healDoc low at 50% hp (HOLD, with
  and without tracks); aggr any60f at 65% hp against off and against any70f; a decision table of each loseCover value and
  a c075-vs-low15 case.

## Gates on the tree F/bot (default SELECT)
| Check | Result |
|---|---|
| test_world / test_brain / test_counters / test_requests | 39/39 / 109/109 / 15/15 / 12/12 |
| anchors7 / rb7 / io7 / aggr7 / lx7 / fin7 / iso7 / lg7 | 21/21 / 6/6 / 9/9 / 14/14 / 7/7 / 6/6 / 5/5 / 10/10 |
| T-F2 (13 old + 11 new) | 24/24. New: loseCover low15 / oneHit / never / c075, healDoc low (x2), aggr any60f each act in SQUAD and are identical to the old value in forced FFA |
| Decision table (3 lines; cover 8 m / 30 m at 50%, 21%, 12.9% hp) | low15: leave, fight, leave, fight, leave, leave. oneHit: fight, fight, leave, leave, leave, leave. never: fight x6. c075: fights on from cover 7 m where low15 leaves; leaves at 3 m. All equal to 'off' in forced FFA |
| Identity vs ckpt_07_LG (r7work/id/ck07), DEF / KS / KB, R3a2 set 14 + FFA-inert set 14 (kit stream in both) | 84/84 byte-identical, fuse 0, errors 0 |
| Base check: FB_s1 (this tree, the 5.31 SELECT, salt 1) vs variants6/FSLCL15_s1 | resolved params identical; sim squad 1-24 24/24 identical; kit stream squad / auto / forced FFA identical |

## Builds (F/builds/<name>/bot = tree + SELECT + salt via variants_tools/mkvar.py; F/builds/<name>/dist = bot.js + Dockerfile)
Common SELECT against the tree defaults: laserRange 'far', farmHp '90', laserEcon 'off', focus 'mult', retreat 'd3',
upg 'std', seek 'on', aggr 'any70f', fb 'on', plus the entries below. Bundle: `bun build --minify --target=bun`.
Sim = rec7 closed loop, squad seeds 1-24, compared with FB_s1 (behaviour only; it ranks nothing).

| # | name | SELECT entries (rest as common) | salt | bot.js sha256 | resolved change vs 5.31 | conformance base / v3dir | sim 24 vs base: differ, up / down, net |
|---|---|---|---|---|---|---|---|
| F1 | FOHLC_s1 | loseCover 'oneHit' | 1 | 37c0d0ee5a909e12f7d1ae85d5c88ea0200a5c272990efc71505e76b52b2096f | lcCoverS 1.5 -> 0, lcLowHpf 0.15 -> 0.23 | PASS / PASS (world, nav true; max 3.6 / 4.4 ms) | 8 (seeds 1,2,5,6,18,19,20,22), 2 / 0, +3 (2: 4->5, 20: 3->5) |
| F2 | FNR_s1 | loseCover 'never' | 1 | 41cf3b03467c815ab74af42d5d835bc91ae3161b5e68993932bd525ac02b2d4c | lcCoverS 1.5 -> 0, lcLowHpf 0.15 -> 0 | PASS / PASS (3.6 / 4.6 ms) | 5 (1,5,6,20,22), 0 / 0, 0 |
| F3 | FHE40_s1 | loseCover 'low15', healDoc 'low' | 1 | efa2fd70f328d4fda5825fb59d19189f07a937722ddd60a1130a143779f169be | healEnterHp 0.55 -> 0.40 | PASS / PASS (5.5 / 4.5 ms) | 3 (9,14,23), 0 / 2, -5 (14: 7->3, 23: 4->3) |
| F4 | FA60_s1 | loseCover 'low15', aggr 'any60f' | 1 | 630041ba17be248a26627a21213d9a8049d82f03e77e51481747d0c2069d9180 | aggrHpf 0.7 -> 0.6, h50SeekHpf 0.7 -> 0.6 | PASS / PASS (3.4 / 7.0 ms) | 0 of 24 (the moderator's 36-seed sweep differs on seeds 28, 31, 32 only); T-F2 shows it acting |
| F5 | FC075_s1 | loseCover 'c075' | 1 | 48853713568977b8b9b10dde967c8ccee2e2970890fe7c5ffeef27105a59218b | lcCoverS 1.5 -> 0.75 | PASS / PASS (4.0 / 4.1 ms) | 2 (1,5), 0 / 0, 0 |
| F6 | FB_s11 | loseCover 'low15' (= the 5.31 SELECT) | 11 | 5a87f82ba5f1b3b264500fd324aae84893e123f23ce491ace140b9fef1a53900 | salt 1 -> 11 | PASS / PASS (3.4 / 4.9 ms) | 24 of 24, 7 / 10, -6 (mean 3.71 vs 3.96) |
| ref | FB_s1 | loseCover 'low15' | 1 | 7fb5fb2d7cac304a2311a160e505667bd5ee2c90612a98cfe5723b7e40e84c47 | none (not for submission: same play as 8cdafe2, different bytes) | PASS / PASS (5.4 / 3.1 ms) | 0 vs variants6/FSLCL15_s1 |

All builds: 300/300 answered in time, errors 0, slow 0; sim fuse 0, errors 0, stuck 0, zone deaths 0; kit stream (squad,
auto, forced FFA) identical to the base for F1-F5 (none of the new values acts on it); F6 differs on kit squad / auto,
identical on forced FFA. Each bundle rebuilt a second time: byte-identical. Each variant folder differs from F/bot only
in lib/params.js (SELECT line and salt). Dockerfile = ckpt_07_LG's.

## Suites per variant (F/builds/<name>/troot, the variant's own SELECT baked in)
The suites assert the tree defaults, so a baked-in submission SELECT fails some expectations by construction (the 5.31
SELECT itself, FB_s1: 11 such checks, e.g. "r3a2 defaults", "aggr presets: off = defaults", "h50 presets"). Per variant:
test_world 39/39, test_counters 15/15, anchors7 21/21, rb7 6/6, io7 9/9, iso7 5/5, fuzz (6000 observations) threw 0 for all 7.
Checks failing beyond FB_s1's 11: FOHLC / FNR / FC075 the same 11 (LX T1-T2, FIN T1-T4, T-F2 loseExit / finish ttk /
ttkb, h50 T9: their scenes expect a LOSING retreat with cover 12 m away, which these values remove on purpose); FHE40 2
(the two checks that assert healEnterHp 0.55); FA60 and FB_s11 none. Timing checks that tripped while four lanes shared
the machine (test_world D3 on 3 variants, fuzz slowest on 2, test_brain decision time on 4) all passed on a quiet rerun.

## Not done / notes for the moderator
- Not run: release_gate.sh, hygiene packaging (LICENSE / README copy) and the fresh-clone hash: those are the pusher's
  steps (package_variant_r6.sh refuses outputs outside variants6). A plain grep of the forbidden-word list over the
  dist folders prints nothing.
- If an Opus step beats 5.31, rebuild from F/bot with `mkvar.py F/bot F/builds/<new name> 1 <common> <that step's SELECT> <F-entry>`
  (if the Opus step uses plain overrides such as lose1/2/3Hpf, they must be added to the variant as well).
- 'never' and 'oneHit' still leave when the hide cell is found at 0 s of travel (B.tCover <= 0), i.e. only when standing on it.
- F3 touches healEnterHp, which line 468 (FINb) also reads; finish is 'off' in every build, so that path is not reached.
- FA60 changed 0 of 24 sim matches here; locally it is close to inert (as healDoc 'on' was before it cost 0.21 officially).
Raw outputs: F/out (suites, conf_*, sim24/<name>, idbatch), F/id/ft, F/builds/<name>/troot/out.
