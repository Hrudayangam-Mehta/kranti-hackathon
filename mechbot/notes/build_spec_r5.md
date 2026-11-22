# Build R5: binding spec (panel R5 chair, 20:00 UTC Sat). Supersedes build_spec_r4.md sections 1, 3, 4, 5 and the factorial rows of panel_r4_schedule.md 3.1 / 4.

Inputs: panel_r5_research.md (RS), panel_r5_algorithms.md (AL), panel_r5_design.md (DS), build_spec_r4.md (R4),
panel_r4_gameplay.md (GP), panel_r4_schedule.md (SC), submissions.md, integration_log.md (R4a section),
variants/V4/bot/lib/{params,tactics}.js (read only). Tags as the panel: [M] official result, [T] a 6+ bot's choice,
[S] our simulator (behaviour only; wrong sign six times), [A] arithmetic or model, [N] no evidence.

## 0. State and the chair's decisions

- Official: 5.02 (all R3a2 items off), V1 4.98, V2 4.60, V3 4.83, **V4 5.15** (best; V4 = V1 + `retreat: 'd3'`).
  Readings (sd 0.24 each): fighting early +0.38, boost spending +0.15, heal breaks +0.17. Board: top 6.31, cut about
  5.33 and rising, projected 5.80-5.92 at the close. State BEHIND (SC 3.5): the mean must rise by about 0.5.
- Code on hand: **C3** = R3a2 (V4 is C3 with its SELECT). **C4** = R4a (lib/hunt.js: `hunt: off/h50/lite`,
  `seek: off/on`), built 19:30-20:00, release gate GO, identity 14/14 with V1 and V4 SELECT, FFA-inert 14/14;
  **not pushed**. R4b was never built.
- Decisions:
  1. **Base = V4.** Every R5 item is one preset; its old value reproduces V4 byte for byte (identity streams).
     Heal breaks (`retreat: 'd3'`), fight early (`fightEarly: 'on'`) and boost spending (`boost: 'spend'`) stay on
     in every variant.
  2. **The factorial stops** (F04-F16 are not drawn). Two of its six factors (D retreat, E boost) are settled for
     practice by the readings, and most remaining cells sit on V1's pulse retreat or without boost. F02 / F03, if
     drawn in the 19:44 window, are kept as data.
  3. **K0 replaces it.** The six official draws solve for the four remaining R3a2 core items together (laser economy
     + mid band, focus 'add', farm to 50%, speed upgrade 3rd): K0 - V4 = 5.02 + 2 V1 - V2 - V3 - V4 = **+0.40 +- 0.48**
     (data alone). The top-bot evidence for three of the four items [T x3, A04 M] pulls this to about +0.05 +- 0.3.
     Even shrunk, it is the largest-variance ticket on the table, it costs no code, and it keeps every measured
     item. It is drawn first.
  4. **hunt50 is its own variant** (H, owner's rule) in the first window, with HL beside it; the design's
     practice form `hunt: 'esc'` is built as a preset and drawn only by the rule in section 5.
  5. R5 code comes in two stages, each with an independent check, inside three hours (section 3). Everything else
     waits for the night block (section 4).

Firewall for every new R5 item (as R4a): acts only while `B.env !== 'FFA'`, `B.foreignDeaths < h50ForeignMax` (1),
next radius > `zoneLateR` (70 m) and `aliveN > 3`. No item reads a clock (D10); every loop has a fixed count.

---

## 1. Ranked build list (changes against V4; gains are on the official score, centre and range, not additive)

| Rank | ID | Preset (old -> new) | Gain | Evidence | Stage | Fits the 3 h build? |
|---|---|---|---|---|---|---|
| 1 | K0 | `laserEcon: on->off, laserRange: mid->far, focus: add->mult, farmHp: 50->90, upg: speed->std` (existing presets) | data +0.40 +- 0.48; shrunk +0.05 (-0.4..+0.8) | [M] six draws; against: [T x3] for laser, focus, farm | ready (C3, SELECT only) | yes, no code |
| 2 | FIN | `finish: off->ttk` | +0.08 (-0.05..+0.20) | [S] 23 near-kill exits / 20 matches, 7 of 10 on an empty magazine; [M] G01 +0.39, A32 +0.34 same sign | R5a | yes |
| 3 | S | `seek: off->on` | +0.10 (-0.10..+0.25) | [S] roam 15.4% -> 10.6%; GP I2; [M] A12 / R11 against walking at idle mechs | built (C4) | yes, built |
| 4 | LG | `laserGrab: std->wide` | +0.10 (-0.15..+0.30) | [T x3] laser by 24-50 s; [S] laser in 1 of 6; [M] laser-first walks -0.06..-0.11 at weaker bots | R5b | yes |
| 5 | ISO | `isolate: any->near` | +0.08 (0..+0.20) | [S] isolate legs 73 hp/s against 42 in stand-off; GP I3 | R5a | yes |
| 6 | AVO | `focus: add->av` | +0.05 (0..+0.12) | [A] +0.07..+0.12 kills per engagement with a laser; ranked top-2 by all three panelists | R5b | yes |
| 7 | HL | `hunt: off->lite` | +0.05 (-0.30..+0.35) | GP 1.9; [S] 3.33 vs V4 3.83 seeds 1-6 (not a verdict) | built (C4) | yes, built |
| 8 | H | `hunt: off->h50` (owner's hunt50) | -0.10 (-0.60..+0.30) | GP 1.9; [M] cover cycles -0.6..-0.94; [S] 3.00 / 3.70 seeds 1-6 / 1-20 | built (C4) | yes, built |
| 9 | LC | `loseCover: off->near` | 0 (-0.20..+0.15) | DS G3 / G6; [M] A05 -0.41 warns; removes some heal-break entries | R5a | yes |
| 10 | ESC | `hunt: off->esc` (h50 with cover <= 0.6 s) | 0 (-0.30..+0.20) | DS 6: the pulse pays only with cover within 7 m [A] | R5a (params) | yes |
| 11 | HAND | `handoff: off->on` | +0.03 (0..+0.08) | [A] | night | stretch for R5b only if code-complete by 22:05 |
| 12 | PRE | `precharge: off->line` (+ DS `seek: 'lull'` if S passes) | +0.03 (0..+0.08) | house first shot 1.15 s after a line opens | night | no |
| 13 | KD | `killDrop: off->weapons` (GP I8; pairs with LG) | 0..+0.10 | [S, A] | night | no |
| 14 | GASP | `lastGasp: off->on` (GP I7) | 0..+0.15 | [T] kyoto 1.7 kills in its fatal fight | night | no |
| 15 | SYNC | `gait: d4->sync` | +0.06 (-0.20..+0.20) | [A] house hits 0.49 -> 0.29 at 100-150 m; [M] M03 -0.69 for open-loop flips | night (3 h) | no |
| 16 | ARC | `deadYaw: off->arc` | +0.03 (0..+0.06) | [S] rear hits 13-19% of intake | night, if slots | no |

Final-only, practice-inert (no practice slot; merge before the 12:30 Sun FFA freeze with the local FFA league and
the SQUAD identity streams): `ffaOpenGuard: 'on'`, `laserRangeFfa: 'far'`, `laserForceFfa: 'on'` (R4 section 3),
`ffaHunt: 'h50'` (DS 5.2: hunt50 fits best at 11-6 alive in the final).

Not built: adaptive gun lead (AL 0.4: full lead and V4 within noise), pure Smith order (AL 0.5: fewer kills in 5 of
6 cases), SHADOW (+0.02 for 2 h; A17 -0.71 risk), ARB (5 h; only if FIN or AVO is adopted before 09:00),
`upg: 'kill'` (no A/B; one draw only if K0's ablations implicate the upgrade order), factorial F04-F16.

---

## 2. Already built (no code): the 20:44 arms

- **K0** on C3: V4 SELECT + `laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std'`.
  Every other string as V4 (`fightEarly: 'on', retreat: 'd3', boost: 'spend'`, Z rules on). package.sh PASS,
  hygiene, param_diff (only those keys) before the push. The R5a check proves C5 identical to C3 under K0's SELECT,
  so K0 can later carry R5 arms.
- **H**, **HL**, **S** on C4: V4 SELECT + `hunt: 'h50'` / `hunt: 'lite'` / `seek: 'on'` (integration_log R4a).

---

## 3. The three-hour build (20:05-22:35 UTC), two stages, each with an independent check

One engineer (Opus sub-agent) writes; a **different** sub-agent checks each stage and writes notes/check_r5a.md /
check_r5b.md with GO or NO-GO per item. A NO-GO item ships at its old value (still byte-identical) and its slot goes
to the next row of the slot rule (section 5). Code line: C5 = C4 + R5a, C6 = C5 + R5b. Shared functions: reuse
`lib/hunt.js` burst3 / TTK / IN (R4 2.2); new wrappers in `lib/r5.js` (pure functions of B).

### 3.1 R5a (code 20:05-21:10; check 21:10-21:35; pushed for the 21:44 window)

**FIN `finish: { off: { finTtk: false }, ttk: { finTtk: true } }`** (AL item 1, both halves in one preset).
- Near kill, tested every decision on the current mech target, or the last one if seen within 3 s (`B.finTr`):
  `TTK'(tgt) <= finTtkS (3.0)` and `IN3 x (TTK' + 0.3) <= me.hp - M`, `M = max(150, 0.10 x maxHp) + 0.5 x IN3`.
  `TTK'` = hunt.js TTK + remaining reload when empty, + 0.3 s if not the current target, + 1.0 s with no line out.
  `IN3` = max(B.A now, max of B.A over the last 3 s), at least 30.
- (a) `tactics.losing()`: `finishing ||= nearKill` on the existing `finishing` line; the d3 table is untouched.
- (b) `tactics.decideMode()`: while a near kill is armed (target hp <= one magazine at q(dist) plus a ready beam,
  cube bonus included), the `afterLose` HEAL entry (`healAfterLoseHp`) is off. When the gun holds
  `ceil(hp / (damage x k x q))` rounds or a lethal beam is ready (`killNow`) and the test passes: FIGHT at once
  (urgent switch, no `modeHold`). `selectTarget` keeps `B.finTr` as a candidate while armed so the regain leg can
  bring the line back. HEAL below `healEnterHp` (55%) and everything else as V4.
- With `hunt` on (later stacks only): the committed-target line of `losing()` takes precedence; FIN (a) applies only
  to uncommitted targets.
- Tests: AL item 1 T1-T5 (three lines B.A 250, our hp 700, ammo 6 -> not LOSING; ammo 0 -> DISENGAGE, then FIGHT
  within one decision after the reload, no HEAL; our hp 300 -> HEAL as V4; FFA / late zone / 3 alive identical to
  off; identity). T6 behaviour: `tools/panel_r5/abandon2.js 1 20` -> near-kill exits never killed fall below 4 of 10.

**ISO `isolate: { any: { isoNear: 0 }, near: { isoNear: 12 } }`** (GP I3, R4 3 I). `brain.fightLegs` isolate branch
(`B.A - tgt.a > 20 && B.nLos >= 2`): take the posEval cell only within `isoNear` and with `xOther === 0`; otherwise
stand-off. Tests: best cell 25 m -> 'standoff'; 8 m with xOther 0 -> 'isolate'; identity.

**LC `loseCover: { off: { loseCoverNear: false }, near: { loseCoverNear: true } }`**, params `lcCoverS 1.5`,
`lcLowHpf 0.25` (DS 4.4). Last line of `losing()`: if LOSING and not (`hide.state === 'found'` and (`B.tCover <=
lcCoverS` or `me.hpf < lcLowHpf`)), return false (downstream readers see a normal fight; `lastStand` / doomed
unchanged). Tests: 3 lines, 50% hp, cover 30 m -> FIGHT; cover 8 m -> DISENGAGE; 20% hp, cover 30 m -> DISENGAGE;
no cell -> FIGHT; identity.

**ESC `hunt: { ..., esc: { hunt50: true, h50Pulse: true, h50CoverS: 0.6, h50PulseMinK: 1 } }`** (DS 6). New param
`h50PulseMinK` (default 0 = R4a): a pulse starts only at our kills >= it (one line in hunt.js). Tests: R4a T10 with
tCover 1.0 s -> no pulse, 0.5 s -> pulse; k = 0 with two lines and the burst spent -> no pulse; `h50` / `lite`
unchanged (R4a group h50 108/108).

### 3.2 R5b (code 21:35-22:15; check 22:15-22:35; pushed for the 22:44 window)

**AVO `focus: { mult, add, av: { focusAdd: true, focusAv: true } }`** (AL item 2, budget-aware, not pure Smith).
After the V4 'add' cost: up to 5 lowest-cost non-NPC candidates with a line either way in the last 1 s; threat
`a_i` = max(prior, tr.a) with the AL prior (gun 93 x pH(d) x k_i x (laser ? 0.6 : 1), + 78 x k_i with a laser,
+ 190 x k_i lightning inside 45 m, x 0.35 if not hostile); `ttk_i` from TTK'; rear x1.5 for hunters more than
90 deg off the bearing of the current kill; all orders (<= 120 x 5 steps), J = kills before our hp runs out (15 s
horizon) + spare hp / 500 when all die; target = first of the best order. Keep the current target if its best order
is within 0.08 of J, always under 25% hp, always while finishable and hit in the last 1 s; re-order every 0.3 s
unless the target dies or loses its line for 1 s. Tests: AL item 2 T1-T5 (1300 hp picks the gun + laser 1400 hp
hunter, 500 hp picks the 900 hp gun hunter; front-arc tie-break; 40% target kept; n = 5 under 0.1 ms; identity).

**LG `laserGrab: { std: { grabLaserWide: false }, wide: { grabLaserWide: true } }`** (GP I1, R4 3 L). SQUAD, no
laser held: `economy.chooseGrab` laser reach 60 -> 130 m of path at hp >= 50%, `B.nLos <= 1`, target not
finishable; `selectTarget`: while no laser is held, t < 90 s and a wanted laser is known within 200 m of path, the
P1 `engaged()` clause is false for non-hostile mechs (D0-hostile mechs are still answered). Tests: GP I1 (grab in one
decision at 110 m / laser 90 m; two lines -> no grab; hostile answered; laser held -> identical to std).

**Stretch, only if code-complete by 22:05:** HAND `handoff: off/on` (AL item 3); otherwise night.

### 3.3 Gate for each stage (the checker runs all of it; times on one core, Dockerfile engine settings)
1. Identity: every new preset at its old value, the 14 R3a2 streams byte-identical to C4 under the **V4 SELECT and
   the K0 SELECT** (and to C3 under K0's), fuse 0 in every run, one run at a time.
2. FFA-inert: each new item on, kit + check2a ffa_s1-4 (auto and forced FFA) and sim FFA 411-414 byte-identical.
3. Tests: every old group unchanged (test_brain 108/108, test_world 39/39, test_counters 15/15, test_requests 12/12)
   plus each item's tests.
4. Simulator smoke, squad seeds 1-10 per arm (behaviour only): errors 0, stuck 0, fuse 0, zone deaths 0, false
   latches 0, and the item's own metric (FIN: never-killed near-kill exits below 4 of 10; ISO: isolate leg share
   down; LC: no DISENGAGE without a cell within 1.5 s above 25% hp; AVO: target switches per kill <= V4 + 20%;
   LG: laser-held share above V4's 24-33%).
5. Worst decision <= V4 + 3 ms; at most one A* per decision. 6. param_diff: only the intended keys. 7. Determinism:
   two runs, same hashes. 8. package.sh PASS, `GATE_CPU=1 GATE_WAIVE=H9-method-exposure tools/release_gate.sh dist`
   GO. Log rows in submissions.md before every push; push only in the minute of the submission.

---

## 4. Night block (R5c, 23:00-03:00; draws from 23:44; SQUAD code freeze 09:00 Sun as SC 5)
In order: HAND (if not in R5b), PRE + `seek: 'lull'` (only if S passed its screen), KD (only if LG passed), GASP,
SYNC (tracker unit test T1 first; draw only if slots), ARC. FFA-only items of section 1 alongside, each with the
local FFA league and SQUAD identity. After 22:44: a STACK arm = leader + every arm whose draws average d >= 0, first
slot of 23:44.

---

## 5. Mech Royale: the next 12 slots (20:44, 21:44, 22:44; repo URL + 40-character hash every time)

Leader mean m = pooled V4 draws (V4 5.15 and the 19:44 salts). d = draw - m.

| Slot | Window | Code | Variant (SELECT change vs V4) | Salt | Role |
|---|---|---|---|---|---|
| 1 | 20:44 | C3 | **K0**: `laserEcon: 'off', laserRange: 'far', focus: 'mult', farmHp: '90', upg: 'std'` | 0 | new |
| 2 | 20:44 | C4 | **H**: `hunt: 'h50'` (the owner's hunt50, its own variant) | 0 | new |
| 3 | 20:44 | C4 | **S**: `seek: 'on'` | 0 | new |
| 4 | 20:44 | C4 | **HL**: `hunt: 'lite'` | 0 | new |
| 5 | 21:44 | C5 | **FIN**: `finish: 'ttk'` | 0 | new |
| 6 | 21:44 | C5 | **ISO**: `isolate: 'near'` | 0 | new |
| 7 | 21:44 | C5 / as drawn | second draw of the best 20:44 arm with d >= 0; if none, **ESC** `hunt: 'esc'` | 1 / 0 | new (2nd draw) |
| 8 | 21:44 | C5 | **LC** `loseCover: 'near'`; or the second-best 20:44 arm's s1 if its d >= +0.15 | 0 / 1 | new |
| 9 | 22:44 | C6 | **AVO**: `focus: 'av'` | 0 | new |
| 10 | 22:44 | C6 | **LG**: `laserGrab: 'wide'`; if K0 scored d >= +0.25, K0 s1 instead (laser economy suspect) | 0 / 1 | new |
| 11 | 22:44 | leader's | leader salt | next | salt |
| 12 | 22:44 | leader's | leader salt | next | salt |

Rules at each window's end (BEHIND):
- First draw: d <= -0.25 reject; d >= 0 second draw in the next window (at most two per window, in slots 7, 8, 10);
  -0.25 < d < 0 parked (second draw after 23:44 if slots allow).
- Two draws: adopt at mean d >= 0 (H and its family at >= -0.05). An adopted arm is the leader; later arms run on
  its SELECT (the stage gate proves identity for it, as for K0).
- Leader = the build with the best pooled mean over >= 2 draws (V4 unless an arm is adopted).
- K0 high (d >= +0.25): the night block draws the ablations K0 + `laserEcon: 'on', laserRange: 'mid'` and K0 +
  `focus: 'add'` to find the culprit, and LG / AVO move onto whichever base wins.
- R5a not gated by 21:35: slots 5, 6, 8 take the second draws of 20:44 arms with d > -0.25 (best first), then V4
  salts; FIN / ISO / LC move to 22:44 ahead of AVO / LG. R5b late: slots 9-10 become leader salts.
