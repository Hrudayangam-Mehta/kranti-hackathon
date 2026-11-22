# Weapon and situation meta: case table (one author, not independent review; nothing here is measured)

Sources: rules_bible, q1-q4, coach_spec, squad_model, mix_ledger, MX_base2 lib. Life is about 95 s, so cases 1-8 decide the score.

## Strict priority (first match wins)
1. ZONE urgent only when actually outside or the edge arrives within path time (`B.zoneUrgent`).
2. LAST STAND: hp < 25% with 2+ attackers, or hp < intake x 4 s. Never leave; target = quickest kill (`B.doomed`, `lastStand` scoring).
3. FINISH: target dies to one beam or burst (tKill <= 1.6 s). Gun finishes if hp <= 90 x dmgMult and 3+ rounds; else partial kill-release (`killNow`, `finUpdate`, keepTargetHpf 25%).
4. DROP 1 (landed or landing within 3 s of arrival, we miss >= 250 hp, travel <= 8 s). Keep firing, strafe inside the ring.
5. GRAB in contact: laser <= 45-60 m with none held; kill-pile cubes; cube <= 18 m (`chooseGrab`).
6. FIGHT (default; never leave, seek if no target).
7. LOOT / free beams only at zero lines. 8. HOLD = seek.

## Cases
| Case | Weapon and how | Range | Do | Code today | Handled |
|---|---|---|---|---|---|
| Open 0-20 s, 0 lines | gun reload full; idle beam on crates (315 >= 300) | - | take floor laser first, then threshold cube (1st cube = plating offer), drone, crate; walk toward next circle | `chooseLoot`, `laserEcon`/`laserSeekPath` | OK; wide laser grab and farm-first both lost, keep narrow |
| Open 20-60 s, 1 line | gun every ready round + full laser beams (131 dps, flat to 280 m) | 100-130 m, flips 0.5-0.7 s | fight the first hunter at once; kill 1 is cheap (escalation is kill-driven) | `selectTarget`, fightEarly | OK (fighting early won) |
| First kill | reload in the lull if <= 8 rounds; pre-charge only if a line is due in 2.7 s | - | boost to the pile (2 + its cubes) if lines <= 1 and path <= 115 m; median 5.4 s before the next attacker | `killCubeR` 200, `killReachOk` | WEAK: reach too wide at 2+ lines; reload waits for <= 4 rounds |
| 0 lines, hp < 75% | hold fire, let regen run (45/s) | stay put | never walk away to create it; end on any line | `HEAL`, `holdFire` | OK; hide-and-heal lost, do not extend |
| 1 line | gun + full beams; lightning only if the hunter comes inside 45 m | 100-130 m (house gun 27 -> 11 dps at 110-150 m) | fight, strafe, no straight walks | `standoff`, `bandFor` | OK |
| 2 lines | same; focus the lower-hp or finishable one | back along the bisector to keep both in the front arc | cut to 1 line only if cover <= 20-40 m and the target line stays | `losing` -> DISENGAGE | BAD: retreats walk straight (96% hit vs 55%) and never heal in contact |
| 3+ lines, hp > 25% | all triggers; beam the weakest | 100 m+ | fight on; cash out damage (990 hp is left unfinished at death) | `fcLow` cost, keep rules | BAD: target switching leaves 0.7 kill banked |
| Target <= one beam | see FINISH | close to 100 m if lines <= 1 so the pile is reachable | finish, never drop under 25% | `finUpdate`, `killSecure` | PARTIAL: beam overkill on gun-finishable targets |
| Mid 60-110 s (shrink 1) | as lines case | fight inside 150 m of the next centre | edge (7.2 m/s) never catches a walker; no early zone walk | `mover.zoneCheck` | BAD: `far` flag walks us straight into the squad's park ring |
| Drop 70/95 s | keep shooting; a house holder in the ring is a still target | 60 m leash round the ring from 70 s | take it: full hp + 3 cubes = +0.5 to 1 kill | `chooseDrop` | BAD: DROP sits below FIGHT in `decideMode`, plus `dropContestR` 60 and `dropHpBase` 200 block it in contact |
| Drop 140/165 s, phases 2+ | same | rim side, hunters on one side | same rule; rarely reached | same | untested |
| Final shrink | quickest kill | - | fight | `finalShrink` -> doomed | OK |

## Weapons held
- Gun + laser: the standard. Full beams only (partial is worse dps: 84 vs 131); gun fires during charge.
- Gun + lightning: 240 dps inside 45 m but house gun does 51 there; use only when they close, or at last stand. Keep `lightReserve` 35 for boost.
- Laser + lightning (drop the gun): FFA only (`ffaPair`); not in squad.
- Mortar: never in squad (cook-off x1.6 from house lasers); `RANK` mortar 0 is right.
- Cubes: farm to 10 then stop (+5% size after, no stats); threshold cubes (1, 3, 6, 10) are worth 2x reach.

## Upgrades by case (phased plan lost 11 kills; keep the standing order)
plating first; `laser_damage` over armor while holding a laser before 45 s (one stack: 4 beams per kill, one beam per drone); else armor, nanites.

## Test order (one slot each, per the ledger)
A. DROP above FIGHT with no contest/hp margin. B. zone `far` off before 150 s. C. gun-finish beam hold + reload at <= 8. D. pile reach by lines.
