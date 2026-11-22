# META_SPEC: per-slot gaming meta for the Mech bot (v1, 75-minute build)

Status: design merged from three expert notes (upgrade_meta.md, cases_weapon_situation.md, the lib/meta.js design). Nothing here has been built, run or measured; every number is arithmetic from rules_bible.md and q4_econ.md. Code paths are under variants7/MX_base2/lib/; the line numbers come from the architecture note and were not re-checked.

## The three rules that matter most
- **R1. Hp before damage, with no time phases.** Take plating at every offer until 3 stacks, then armor. Hp converts at about 390 hp-eq per kill and damage at about 1,400. The phased plan broke this rule and lost 11 kills (252 vs 263).
- **R2. Never leave a fight for an item.** Pickup reach shrinks as attacker lines grow. Loot and free beams happen only at zero lines.
- **R3. Test each behaviour on one slot, same salt, meta on vs off.** Whole-table changes regress toward about 245.

## 1. Case hierarchy (first match wins)
| # | Case | Trigger | Behaviour | v1 change |
|---|---|---|---|---|
| C0 | ZONE | `B.zoneUrgent` | today's code | none |
| C1 | LAST STAND | `B.doomed` (hp < 25% with 2+ lines, or hp < intake x 4 s) | stay, shoot the quickest kill | none |
| C2 | FINISH | target dies within 1.6 s | gun finishes if target hp <= 90 x dmgMult and 3+ rounds; hold the beam | set c |
| C3 | GRAB in contact | no laser held and one within 60 m; kill pile; cube within 18 m | reach by lines (section 3) | set b |
| C4 | FIGHT | default | never leave; seek when no target; band 100-130 m | none |
| C5 | LOOT | zero lines only | threshold cube, drone, crate with an idle beam | set b |
| C6 | HOLD | nothing else | seek | none |

DROP above FIGHT is not in the hierarchy; it is an optional experiment (set d).

## 2. Upgrade table (`economy.pick`)
Base order: plating, armor, nanites, laser_damage, gun_damage, gun_mag, laser_charge, lightning_efficiency, servos, gun_rate, lightning_chain, lightning_range, capacitor, reactor, gyros, jets, mortar_reload, mortar_splash, mortar_velocity, gun_velocity, sensors, laser_pierce. Keep the not-held penalties (+60, mortar +80). This also removes the non-ids `mortar_damage` and `mortar_rate`.

| State | Override |
|---|---|
| plating stacks < 3 | plating first, always |
| otherwise | armor first |
| laser held, 0 lenses, 0 kills, t < 45 s | laser_damage above armor (5 beams per kill becomes 4) |
| laser held, 1 lens, cubes >= 3 | laser_damage above nanites |
| no laser, 0 kills, t < 45 s | gun_damage and gun_mag above nanites |
| SQUAD | nanites below laser_damage and gun_damage |
| FFA, or hp < 40% at zero lines | nanites third |
| never early | gun_rate, laser_pierce, mortar ids, sensors |

No override ever moves an id above plating. `upgPhase` stays false.

## 3. Pickup table (`wantPickup`, `chooseLoot`, `chooseGrab`)
| Item | Go | Refuse |
|---|---|---|
| threshold cube (count becomes 1, 3, 6 or 10) | up to 100 m at <= 1 line | 2+ lines beyond 30 m |
| other cube, cubes < 10 | 52 m at one line, 30 m at two | cubes >= 10, unless within 2 of 15 |
| kill pile, n = 2 + victim cubes | path <= min(115, 58 x n / lines) m; abort after 6 s | 3+ lines beyond 25 m |
| crate | idle full beam; or 7 bullets at zero lines and hp >= 40% | as an opening plan |
| drone | hp >= 50%, no mech seen for 4 s | in any fight |
| laser, none held | `grabLaserR` 60 at 0-2 kills; on-path (4 m) only at 3+ kills | wider seek |
| lightning | empty slot, within 35 m | dropping the gun in SQUAD |
| mortar | never in SQUAD | |

## 4. Weapon and range rules
- Gun + laser is standard. Fire full beams only, and every gun round.
- Range 100-130 m at one line. At two lines, focus the finishable or lower-hp target.
- Lightning only when a hunter comes inside 45 m, or at last stand; keep `lightReserve` 35.
- Reload in a lull when <= 8 rounds remain (today <= 4).
- Never drop a target under 25% hp.

## 5. Module and hooks
- `params.metaTable: ''`, 16 characters, one per slot. '0' or a wrong length means off. Case-sets are cumulative: a = upgrades, b = + pickups, c = + finish and reload, d = + drop experiment. `saltTable` is untouched ('m' already parses as salt 22).
- `lib/meta.js`: `makeMeta(B, set)` returns `{ update() }` and writes one preallocated `B.meta = { upOrder, wantMortar, laserSeek, pileReach, cubeReach, reloadAt, gunFinish, dropFirst }`. `B.meta` is null when off, so off slots stay identical (no RNG calls, no allocation).

| Hook | Change |
|---|---|
| brain.js:197, 656 | `meta: null`; `stage('meta')` after 'assess', before 'econ' |
| economy.js:344 | order = `M.upOrder` when set |
| economy.js:34 | `M.wantMortar === false` returns null |
| economy.js:129-131, 215 | `M.laserSeek`, `M.cubeReach`, `M.pileReach` |
| firecontrol.js (reload, `finUpdate`) | `M.reloadAt`, `M.gunFinish` |
| tactics.js `decideMode` | set d only: `M.dropFirst` |

## 6. Dropped
- Refuted officially: time-phased upgrades, wide laser grab, farm-first, hide-and-heal, pauseMove, isoDwell, the aggressive CH1 rebuild.
- Cut as a leave-the-fight variant: the two-line retreat to cover.
- Deferred for scope: band overrides, `modeHint`, target-selection hooks, zone `far` flag.

## 7. Build and test plan (75 minutes)
| Min | Work |
|---|---|
| 0-15 | meta.js, the param, the brain hooks; confirm an all-off table matches the baseline byte for byte |
| 15-30 | set a |
| 30-50 | set b |
| 50-60 | set c |
| 60-75 | per-slot runs |

For each set in order a, b, c: turn it on in one slot with the salt unchanged, run the 48 matches, and compare that slot's kills with its off run. Keep the set only if it gains on at least 2 of 3 trial slots; otherwise revert that slot. Build set d only if time remains, test it on one slot, and never ship it table-wide.
