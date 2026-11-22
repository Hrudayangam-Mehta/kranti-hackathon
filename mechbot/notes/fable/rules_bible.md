# Mech Royale rules bible (rules analyst, Sun 22 Nov 2026, 03:20 UTC)

One author; nothing here is independent review. No game server was contacted; only the public pages were fetched.

**Sources and tags.**
- **[P]** `kit/protocol.md` and `kit/README.md` (official rule text).
- **[S]** `kit/mechfight.schema.json`.
- **[C]** `notes/hello_example.json` (the hello config, identical key by key to the hello in `kit/check/stream.jsonl.gz`). The path is given as `config.<path>`. The protocol says the live values come in every `hello` and "balance changes between matches", so read them; do not hard-code them.
- **[W]** official web pages fetched 03:20 UTC Sun into `scratchpad/web/rules_0320/`, compared with the copies in `scratchpad/web/` (Sat 04:25-16:37 UTC, plus `lb_now_0315.html` from Sun 03:16).
- **[M]** our own measurements (replay, stream, simulator) quoted from `notes/mechanics_deep.md`, `notes/fable/switch/rules_model.md`, `notes/panel_r6_rewards.md`. These are not official.
- **[A]** arithmetic. **[N]** unknown or undocumented.

Integrity check [W]:
- The kit tarball downloaded now is byte-identical to our `mechbot/kit`. Its files are dated 2026-11-20 18:29 UTC; `protocol.md` sha256 is fa27ac19...; the hashes are in `web/rules_0320/kit_dl/kit_sha256.txt`.
- `protocol.md` served by the track page is identical to the kit's copy.
- The browser client `play.joinbuilders.org/assets/game-CAuB82rx.js` is identical to `web/game.js` (sha256 359f24fc...).
- **No game-rule text changed since Saturday.**

---

## 0. Official changes and announcements since the Saturday copies

| # | What | Old (Sat 04:25-16:37 UTC) | Now (Sun 03:20 UTC) | Where |
|---|---|---|---|---|
| 1 | Mech Royale scorer version | `builders-3` | `builders-3`, **unchanged** in every copy | track page "Scorer version", page data `scorer_version` |
| 2 | Other scorers | shopping-sessions-4, machina-deid-1, blast-radius-1 | shopping-sessions-**5** (rescored, announcement #5); the other two unchanged | page data |
| 3 | Kit, protocol, map, check.py, browser client | - | byte-identical | download + sha256 |
| 4 | **Repository rule** | "Keep your repository public with every submitted commit until results are published; an entry that cannot be fetched or built for the final scores nothing." | "Your repository must be public when you submit, so we can fetch it. Once a submission is scored you may make the repository private: we keep a copy of every commit we score, and the final uses that copy. An entry that cannot be built for the final scores nothing." | track page, Rules |
| 5 | **Mech Royale quota** | 4 an hour (`practice_limit` 4) | **6 an hour**: `practice_limit` 6, status page "6/hr per team", buildathon page "6 submissions an hour". The track page text still says "Your team may submit 4 times an hour" (stale). Staff in chat, 03:14: "it's a rolling 1-hour window per submission — every submission frees up 1 hour after you sent it". | announcement #3 (Sat 21:06 UTC): "RWX, Databricks, and Mech Royale hourly quotas have been increased, godspeed! ... quotas may be reduced at any time." |
| 6 | **New rule: code reuse** | none | "Your entry should be your team's own work. Excessive reuse of code, another team's entry included, may result in disqualification, at the organizers' discretion. Open-source libraries are still fine. Only your final entry counts, so you have until 11:00 AM ET Sunday to make sure it is your own." Also added to the buildathon page Rules. | announcement #4 (Sat 23:23 UTC). Staff chat 02:50 UTC, answering whether a team may fork a public open-source bot and submit it with its own changes: "feel free to do this, try to respect the preferences of your competitors in their repos though!" The owner's note "only exact code copies matter" (submissions.md, 02:40) is **not** in the published text. |
| 7 | **Possible Mech Royale rescore** | - | Staff in chat, 03:10 UTC, answering "update mech royale to 10 please": "people are spamming submissions, we are likely going to rescore it too to reduce improvements from luck". This is not an announcement yet. Read it as: lucky best-of-N scores may be re-run. | track page / watch chat |
| 8 | Board sealing | "Once a track publishes its final results, its practice standings fold beneath them." | "At the cutoff each board is sealed until its final results are revealed at the ceremony". The page data has a new field, `sealed: false`. | buildathon page |
| 9 | Help | chat only | "or email hi@joinbuilders.org if it is private" | buildathon page |
| 10 | Other tracks | Shopping 2/h, Blast 1/h | Shopping 5/h (new final: top 30 retimed on 3 datasets); Blast 4/h | buildathon page; announcement #5 (Sat 02:08 UTC Sun) |
| 11 | Field and board | 141 teams; 1st 5.58, 16th 4.73, 32nd 4.23, 50th 4.00 (Sat 04:25) | **339 teams; 1st 6.58 ("2696"), 16th 6.27, 32nd 6.19, 50th 5.81**. Cut history: Sat 16:37 had 6.31 / 5.81 / 5.33 / 5.13; Sun 03:16 had 6.58 / 6.27 / 6.17 / 5.81. | page data `standings`, `team_count` |
| 12 | Cutoff | 2026-11-22T16:00:00Z | unchanged (Sun 11:00 AM ET); `locked_at` null; ceremony 12 PM ET | page data `cutoff_at` |

Staff also answered "can you see how your mech royale bot did" with "read the docs again (:", followed by "so no replays got it". No replays are offered.

**Where we stand [W][M].** Our best entry is 5.38 (FNV s1). Five redraws of that build average 5.11 (sd 0.17). The qualifying line (32nd) is now 6.19, **0.81 above our best**, and our best sits below 50th place (5.81).

---

## 1. The match

| Item | Value | Config path / source |
|---|---|---|
| Mechs per match | 16 (slot 0-15 = mech id) | `config.match.mechs` |
| Tick rate / decisions | 20 ticks/s, one decision every 2 ticks (10/s) | `config.match.tick_hz`, `config.match.decide_every` |
| Clock cap | 480 s | `config.match.duration_s` |
| Spawns | at least 130 m apart; inside 0.8 of the start circle [N exact meaning]; 30 m arena margin | `config.match.spawn_min_separation`, `spawn_zone_fraction`, `arena_margin` |
| Map | fixed (OSU campus, `v2/world.json` + `terrain.i16`); spawns, crates, NPCs, loot, zone and drops are random per match | [P] section 11 |
| Placement | order of death: last alive is 1st, first to die is 16th; same-tick deaths share a place; at the clock, survivors are ranked by HP | [P] section 4 |
| Points | `16 - place` per match (15 for a win, 0 for dying first); score = mean over the run's matches | [P] section 4; track page "mean of (16 - place)" |
| `obs.alive` | mechs alive, NPCs excluded = our place if we died now | [P] section 6 |
| Clock end in practice | never: the zone reaches radius 0 at 415 s at 260 HP/s, and the largest possible pool (2,981 HP) dies by about 427 s [A] | `config.zone.phases` |
| Baseline | 1.15 (the kit's Python example bot) | track page |

**Practice (what the board shows)** [W, track page]:
- 48 matches against **15 house bots (4 easy, 4 medium, 4 hard, 3 expert) acting as one squad: they share vision, never fight each other, and hunt you weakest first (one early, more as you thin them out, all of them late).**
- "Practice seeds are private and fixed all event. Your bot never sees the seed, and your slot and spawn vary each match."
- Every entry must build and pass `check/check.py` under the runtime limits. Failed builds or checks are rejected with the reason and never affect your best score.
- "A bot that crashes or stops answering stays in any match as a sitting target and is scored, not rejected."
- The board ranks each team's **best** practice score. "Equal scores rank the earlier submission first."
- Practice score = the number of house bots dead before us. Zone and drone deaths of house bots count too.

**Final** [W, track page]:
- At the cutoff the chosen submission (your best unless you pick another) **locks with its practice score**.
- The **top 32** play a qualifying round: 16 matches each, 16-mech free-for-alls against other qualifiers, on new seeds.
- The **top 16** by qualifying mean advance, announced without scores. They play a **64-match series** of FFAs on new seeds; the last 4 are played live and count the same. The series mean alone decides.
- Earlier submissions break all ties. "Organizers may adjust match counts before the final starts, never after."
- With fewer than 32 teams everyone qualifies; with 16 or fewer, everyone plays the series.
- "**Expert house bots fill empty slots.**" An entry that fails to fetch or build sits out, and the next practice-board team takes its seat.
- Non-finalists rank below finalists. Standings stay hidden until the last match ends.
- Prize: $5,000 to the winner; second place gets nothing.

**House-bot behaviour.** Officially documented: only the squad sentence above. Everything else is our measurement [M] (replay, stream, simulator):
- They lead with first-order prediction and no noise. They fire on the first observation showing cooldown 0, a 0.30 s cadence.
- 12 rounds, then 2.4-2.5 s silent; they never reload early (72/72).
- Lasers are released only at full charge, 2.4-2.7 s between beams.
- They never retreat or heal by choice, and still close in under 20% HP. They aim at the body centre and sweep the torso about ±46° while walking.
- Their gun DPS on us is 51 / 51 / 27 / 11 at 40 / 75 / 110 / 150 m; a house laser adds about 35.
- A velocity reversal during the bullet's flight cuts their hit rate from 84% to 22% beyond 75 m.
- They capture supply drops: they walk to 2.5 m from the centre and stand 4 s.
- About 66% of their death cubes are never collected.
- In the official FFA replay house bots also fought each other, and one died to the zone.

---

## 2. The mech

| Stat | Base | Config path | Notes |
|---|---|---|---|
| HP | 1400 | `config.mech.hp` | max HP also scales with cubes (section 6) and `plating` |
| Body | cylinder r 2.5 m, h 9 m; eye +8, muzzle +7, mortar tube +9.5 | `config.mech.radius`, `height`, `eye_height`, `muzzle_height` | everything scales by 1 + 0.05 x cubes, **no cap** (`config.cubes.size_per_cube`) |
| Shot origin | 3.0 m out along the actual aim (radius + 0.5), or the wall if closer | [P] section 5 | a barrel inside a wall wastes the shot |
| Armor | 0 (damage taken x (1 - armor)) | `config.mech.armor` | upgrade `armor` adds 0.08 per stack; weapons only, never the zone |
| Rear hits | x1.5 from outside the 180° front arc of the **torso** yaw | `config.mech.rear_mult`, `front_arc_deg` | direction = the bullet path, beam/arc origin, or shell blast point; `damaged.rear` / `hit.rear` flag it |
| Self splash | 50% | `config.mech.self_damage_mult` | own mortar |
| **HP regen** | **45 HP/s after 5 s without dealing or taking damage**, never outside the zone | `config.mech.regen_per_s`, `regen_delay` | zone damage counts as taking damage. [M]: hits on mechs and drones reset it; hits on crates did not on the old build (current build [N]); misses never reset it |
| Energy | 100; regen 18/s after 0.6 s without spending | `config.mech.energy`, `energy_regen`, `energy_regen_delay` | lightning shots, boost and jet all spend |
| Walk / boost | 11.7 / 19.5 m/s; boost drains 17 energy/s on the ground (5.9 s per tank) | `walk_speed`, `boost_speed`, `boost_drain` | laser charging: x0.5 speed (`charge_move_mult`) |
| Acceleration | ground 58.5 m/s² (0 to walk in 0.2 s), air 12 m/s² | `ground_accel`, `air_accel` | |
| Jump / jets | jump 11 m/s up; jet +34 m/s² up to 10 m/s rise; 15 energy/s (6.7 s, about 60 m of climb per 100 energy); gravity 22 | `jump_speed`, `jet_accel`, `max_rise_speed`, `jet_drain`, `gravity` | jumping needs `grounded`; boost in the air = jet |
| Terrain | step-up 1.2 m; slopes over 50° unwalkable; map edge is a wall; mechs push apart | `step_up`, `max_slope_deg` | `world.json rules.maxStep` 1.5 is for the viewer only |
| Torso | yaw 4 rad/s, pitch 3 rad/s, pitch range -0.7 to 1.3 rad; **shots leave along the actual (slewed) aim** | `turn_rate`, `pitch_rate`, `min_pitch`, `max_pitch` | legs are independent of the torso |
| **Vision** | buildings block. Within 45 m all round (canopy does not block); within 200 m inside a 120° yaw wedge (canopy blocks if dense: under 3.96 m of crown on the line) | `config.vision.near_range`, `range`, `fov_deg`, `canopy_blocks`; `world.json rules.canopyDensity` 0.35, `canopyBlockT` 0.25 | line of sight to the centre or the top; `sensors` adds 15 m near and 25 m range (`mech.near_range_bonus`, `vision_bonus`) |
| Memory | a mech or drone once seen stays listed **with its true live position/hp/aim** for 5 s | `config.vision.memory_s` | crates, cubes, pickups and projectiles only while seen |
| Enemy HP shown | yes | `config.vision.show_enemy_hp` | |
| **Hearing** | bearing noise σ 7° x `hearing` (1; `sensors` x0.5 per stack); classes near < 60 m, mid < 160 m, far beyond | `config.sound.bearing_noise_deg`, `near`, `mid`, `mech.hearing` | own sounds not reported; a sound does not say who made it |
| Sound ranges (m) | step 40, boost 90, reload 60, gun 320, mortar 420, explosion 420, laser_charge 140, laser 380, lightning 160, jet 90, death 600, crate 220, npc_gun 200, drop 600 | `config.sound.range.*` | a step every 0.6 s above 5 m/s on the ground (`sound.step_speed`, `step_every`); slow walking is silent |

`self.stats` carries every `config.mech` key after upgrades, including `eye_height` and `muzzle_height` at the current size.

---

## 3. Weapons

You start with the gun in slot 0; slot 1 is empty. Each slot has its own trigger. Damage multipliers stack:
cubes x(1 + 0.04 x min(cubes, 10)) (`config.cubes.damage_per_cube`, `stat_cap`), rear x1.5, cook-off x1.6 (laser on a mortar holder), the target's armor x(1 - armor).

There are **no headshots or critical hits**: no rule gives location damage [P]. Lightning arcs and lasers go through trees; nothing shoots through buildings.

| | Gun | Mortar | Laser | Lightning |
|---|---|---|---|---|
| Damage | 45 per bullet (`weapons.gun.damage`) | 200 direct (`weapons.mortar.damage`) "plus splash 160 falling to 30% at 7 m" (`splash`, `splash_edge`, `splash_radius`), blocked by walls | 315 at full charge, 35% (110) at zero; linear 315 x (0.35 + 0.65 x c / 0.75) (`damage`, `min_frac`) | 60, then chains to 2 more targets within 14 m at x0.7 per jump: 60 / 42 / 29.4 (`damage`, `chain`, `chain_range`, `chain_falloff`) |
| Rate | one shot per 0.24 s held (`cooldown`) | 2.6 s (`cooldown`) | charge 0.75 s, then cooldown 1.65 s after release (`charge`, `cooldown`) | 0.25 s (`cooldown`) |
| Magazine | 12, then reload 2.4 s; `reload: true` starts it early (`mag`, `reload`) | - | - | costs 3 energy per shot (`energy`): 33 shots per 100 energy |
| Range | straight line, no drop, 230 m then gone (`range`) | ballistic at 72 m/s, gravity 22, max about 235 m at 45°; shell lives 7 s (`speed`, `gravity`, `ttl`) | hitscan 280 m, no spread (`range`) | 45 m and within a 30° cone of the aim yaw, line of sight needed (`range`, `cone_deg`) |
| Projectile | 252 m/s, sphere r 0.3 m, Gaussian spread 0.6° (`speed`, `projectile.gun_radius`, `spread_deg`) | visible to all in `projectiles`, with velocity | beam visible to viewers in `beams`; `charging: true` and the aim are visible; `laser_charge` sound heard at 140 m | instant; hits the **nearest** target in the cone (mech, NPC **or crate**) |
| Special | lead moving targets; [M] hit rate on a standing mech 99 / 92 / 82 / 76% at 100 / 150 / 200 / 230 m | **Concussion**: every mech the blast reaches is thrown 16 m/s away and 9 m/s up and loses 45 energy, scaled by falloff, your own blast included (`knock`, `knock_up`, `drain`) | release before 0.15 s and it fires once 0.15 s is in (`min_charge`); a full charge held 2 s more fires itself (`hold_s`); torso turns freely while charging (`charge_turn_mult` 1); passes through 0 extra targets (`pierce`); **cook-off +60%** on a mortar holder (`cookoff`) | **Short**: a laser holder it hits loses any charge and cannot charge for 2 s (`short_s`); fires and spends energy even with no target |
| Ideal DPS [A] | 187.5 burst; 102-107 sustained (12 shots per 5.0-5.3 s) | 77 direct only; 138 if the direct hit also takes full splash [N: the text "plus splash" is ambiguous] | 131 at full charge (one beam per 2.4 s); 84 at a 0.15 s release | 240 single target; 2,000 damage per 100 energy in 8.3 s; up to 131 per shot with 2 chains |
| Kills 1400 HP in | 32 hits: 31 x 0.24 + 2 reloads ≈ 12.2 s | 7 direct, 15.6 s | 5 full beams, 9.6 s from the first | 24 arcs, 5.8 s; needs 72 energy |

**Triangle** [P]: laser beats mortar (cook-off and range), mortar beats lightning (concussion and energy drain), lightning beats laser (short), gun is neutral.

**Cover** [P]: bullets, shells and lasers hit buildings, bridges and terrain exactly where they are. You can shoot under bridges. **Trees never stop shots** (they block sight only).

**Timing details** [P][M]:
- An action applies on the next two ticks; `fire` is held for both.
- Gun read-outs after a shot go 0.19, 0.09, 0 over the next observations. Holding the trigger at a read-out of 0.10 or less fires on the ready tick: 0.24-0.25 s against the house bots' 0.30 s.
- Gun fire during a laser charge is not forbidden by any rule; we have not verified it on the server [N].
- A missed answer releases a charging laser early (the triggers are dropped).

---

## 4. Pickups, power-ups, crates, cubes, NPCs, drops

### 4.1 Power cubes (ids 5000+)

| Fact | Value | Config path |
|---|---|---|
| Effect per cube | **+4% max HP, and the difference is healed** (+56 HP at base); +4% damage; +5% size | `cubes.hp_per_cube`, `damage_per_cube`, `size_per_cube` |
| Cap | HP and damage up to 10 cubes (x1.4 damage, 1,960 HP without plating); size has no cap | `cubes.stat_cap` |
| How to take | automatic: walk within 3.5 m horizontally and 4 m vertically. The **closest** mech gets it; a tie goes to the lower id. No action needed | `cubes.pickup_radius`; vertical 4 m fixed [P] |
| Upgrade offers | when the cube count reaches 1, 3, 6, 10, 15, 21, 28, 36, 45 | `cubes.upgrade_thresholds` |
| Sources | crate 1 (`crates.cubes`); NPC drone 2 (`npc.cubes`); **killed mech: all its cubes + 2** (`cubes.death_drop_extra`); supply drop 3 (`drops.cubes`) | |
| Where they land [M] | crate cube exactly at the crate; drone cubes 1.0-4.7 m around it; death cubes up to 5.0 m around the corpse; always on the surface | |
| Persistence | listed only while seen. Despawn is not documented [N]; [M] cubes still lay there 22 s or more later | |
| Max HP formula [M][A] | `mech.hp` (after plating) x (1 + 0.04 x min(cubes, 10)). Replay: 1 cube 1,456, 4 cubes 1,624 | |

### 4.2 Crates (ids 1000+)

| Fact | Value | Config path |
|---|---|---|
| Count | 36 per match; a quarter on rooftops | `crates.count`, `roof_fraction` |
| HP / size | 300 HP; r 1.4 m, h 2.4 m | `crates.hp`, `radius`, `height` |
| Kill cost | 7 gun hits; **one full laser beam (315 ≥ 300)**; [A] 5 lightning arcs | |
| Reward | 1 cube; a weapon with probability 0.5 (weights mortar : laser : lightning 1 : 1 : 1). [M] the weapon lands 0.1-3.9 m away | `loot.crate_weapon_chance`, `loot.weights` |
| Visibility | listed with HP while seen; a `crate` sound (220 m) on a break; your hits on crates appear in `hit` events (since 2026-11-16) | [P] |

### 4.3 NPC drones (ids 100+, `kind: "npc"` in `mechs`)

| Fact | Value | Config path |
|---|---|---|
| Count / HP / size | 12, 350 HP, r 1.8 m, h 3.5 m | `npc.count`, `hp`, `radius`, `height` |
| Movement | speed 5; wander within 30 m of home; chase until the target is 90 m away or the drone is 60 m from home | `npc.speed`, `leash`, `deaggro_range`, `chase_leash` |
| Aggro | shoot whoever attacks them, or any mech within 45 m with line of sight while within 30 m of home | `npc.aggro_range`, `leash` |
| Gun | 25 damage, 1 s cooldown (25 DPS), 90 m/s, spread 2.5° | `npc.damage`, `cooldown`, `projectile_speed`, `spread_deg`; `projectile.npc_radius` 0.3 |
| Reward | 2 cubes. No zone damage to drones. [M] drone deaths are silent | `npc.cubes` |
| Cost | regen resets on every hit we land or take | [P][M] |

### 4.4 Weapon pickups (ids 8000+, `obs.pickups`)

| Fact | Value | Config path |
|---|---|---|
| Spawns | 40 at match start on open ground and roofs (a quarter on roofs); mortar : laser : lightning 1 : 1 : 1, gun 0. Expectation [A]: about 13 lasers, of which about 10 are on the ground | `loot.floor_count`, `floor_roof_fraction`, `weights` |
| Other sources | crates (50%); **dead mechs drop every weapon they held except the gun** (`loot.death_drop` 1: undocumented key, consistent with "all") | `loot.crate_weapon_chance`, `loot.death_drop` |
| Despawn | never, though the zone closes over them | [P] |
| How to take | send `"take": id` within 4 m horizontally and 4 m vertically. The weapon goes into the empty slot; with both slots full, add `"drop": slot` to swap (the old weapon is left at your feet, anyone can take it) | `loot.pickup_radius`; vertical 4 m fixed |
| Contest | two takes on the same tick: the **closer** mech wins (the other gets `take_failed: gone`) | [P] |
| Limits | no two weapons of the same kind (`have`); no slot free and no `drop` (`full`); a charging laser can't be dropped or swapped (`busy`); out of reach (`range`) | `take_failed.reason` |
| Equip delay | a taken weapon can't fire for max(1 s, its cooldown): gun or lightning 1 s, laser 1.65 s, mortar 2.6 s. First laser beam at the earliest 2.4 s after the take [A] | `loot.equip_s` |
| **Dropping** | `drop` alone empties the slot; the weapon lies at your feet as a new pickup (`dropped` event) that anyone may take. A dropped gun keeps its ammo and reload state. The gun can be dropped too (needed for laser + lightning). Weapon upgrades **stay with the mech** and apply again when you hold that kind | [P] section 7, section 10 |

### 4.5 Supply drops (ids 20000+, `obs.drops`; "the" power-up)

| Fact | Value | Config path |
|---|---|---|
| When | called at 70, 140, 210 s; lands 25 s later: **capturable at 95, 165, 235 s** | `drops.times`, `fall_s` |
| Where | open ground inside the circle the zone is closing to (`spread` 0.7 of it [N exact]; [M] measured 0.38 and 0.32 of the next radius) | `drops.spread` |
| Knowledge | every mech sees every drop from the call: `pos`, `lands_in`, `holder`, `progress`, even with no line of sight; a `drop` sound (600 m) on landing | [P] |
| Capture | once landed (`lands_in` 0), stand inside the 8 m ring **alone** for 4 s | `drops.radius`, `capture_s` |
| Reward | **+3 cubes, full HP, full energy** (`repair` 1 = 100%). 3 cubes can cross one or two offer thresholds | `drops.cubes`, `drops.repair` |
| Contest | two or more mechs in the ring freeze the clock. If the ring empties, or a different mech becomes the only one in it, the clock **restarts**. Nothing in the rules says damage interrupts a capture [N] | [P] section 7 |
| Stealing a drop | step into the ring (freeze it); kill the holder; or **push it out with mortar concussion** (16 m/s knock against an 8 m ring) so the clock restarts. A house holder is a stationary target at a known spot for 4 s | [P][A] |
| After capture | the `drop` event gives your new cube total; the drop leaves `obs.drops` | [P] |

---

## 5. Upgrades (`config.upgrades`, 22 ids)

**How offers work** [P][C]:
- At each threshold in `cubes.upgrade_thresholds` you get an offer: `{id, expires, choices[3]}`. Answer with `"pick": 0-2`.
- If you do not pick within 5 s, **choice 0** is applied (`bot.offer_timeout_s` 5). Offers queue.
- The 3 choices are distinct upgrades you can still take. Weapon upgrades appear only for weapons you hold **when the offer is drawn**, each up to its `max`.
- Stacks compound (`mul` multiplies again, `add` adds again). Upgrades belong to the mech, not the item.
- With cubes capped at 10 for stats, realistic offers come at 1, 3, 6 and 10 cubes. Drops and kill piles can reach 15 or 21.

| id | Name | Effect per stack (config) | Max | Values at 0 / 1 / 2 / 3 stacks [A] |
|---|---|---|---|---|
| plating | Composite plating | `mech.hp` x1.15 (heals the difference [M]) | 3 | 1400 / 1610 / 1851.5 / 2129 HP (2,981 with 10 cubes) |
| armor | Reactive armor | `mech.armor` +0.08 | 3 | 0 / 8 / 16 / 24% less weapon damage |
| servos | Leg servos | `walk_speed`, `boost_speed` x1.08 | 3 | walk 11.7 / 12.6 / 13.6 / 14.7; boost 19.5 / 21.1 / 22.7 / 24.6 |
| capacitor | Capacitor bank | `mech.energy` +30 | 3 | 100 / 130 / 160 / 190 |
| reactor | Reactor tune | `energy_regen` x1.3 | 3 | 18 / 23.4 / 30.4 / 39.5 per s |
| jets | Efficient jets | `boost_drain`, `jet_drain` x0.75 | 2 | boost 17 / 12.75 / 9.56; jet 15 / 11.25 / 8.44 per s |
| **nanites** | Repair nanites | `regen_per_s` x1.6, `regen_delay` -1.5 s | 2 | **45 HP/s after 5 s / 72 after 3.5 s / 115 after 2.0 s** |
| gyros | Torso gyros | `turn_rate`, `pitch_rate` x1.3 | 2 | yaw 4 / 5.2 / 6.76 rad/s |
| sensors | Sensor suite | `near_range_bonus` +15, `vision_bonus` +25, `hearing` x0.5 | 2 | near 45 / 60 / 75 m; range 200 / 225 / 250 m; bearing σ 7 / 3.5 / 1.75° |
| gun_damage | Tungsten rounds (gun) | `weapons.gun.damage` x1.15 | 3 | 45 / 51.8 / 59.5 / 68.4 |
| gun_rate | Rotary feed (gun) | `weapons.gun.cooldown` x0.87 | 3 | 0.24 / 0.209 / 0.182 / 0.158 s. Tick quantisation is unknown [N]: with 0.05 s ticks the first stack may change nothing |
| gun_velocity | Rail barrel (gun) | `gun.speed` x1.25, `gun.range` x1.15 | 2 | 252 / 315 / 394 m/s; 230 / 265 / 304 m |
| gun_mag | Drum magazine (gun) | `gun.mag` +8, `gun.reload` x0.8 | 2 | 12 / 20 / 28 rounds; 2.4 / 1.92 / 1.54 s |
| mortar_splash | Cluster shells | `mortar.splash_radius` x1.3 | 2 | 7 / 9.1 / 11.8 m |
| mortar_reload | Autoloader | `mortar.cooldown` x0.82 | 3 | 2.6 / 2.13 / 1.75 / 1.43 s |
| mortar_velocity | Long tube | `mortar.speed` x1.2 | 2 | 72 / 86.4 / 103.7 m/s (max range about 236 / 339 / 489 m, ttl 7 s) |
| laser_charge | Fast capacitors | `laser.charge` x0.75 | 2 | 0.75 / 0.56 / 0.42 s |
| **laser_damage** | Focusing lens | `laser.damage` x1.18 | 3 | 315 / 372 / 439 / 518. **One stack = a 1400 HP mech dies to 4 beams, and a drone (350) to one** |
| laser_pierce | Phased beam | `laser.pierce` +1 | 1 | the beam passes through one more target (crate, drone, second mech) |
| lightning_chain | Arc relay | `lightning.chain` +1 | 2 | 2 / 3 / 4 jumps |
| lightning_range | Tesla coil | `lightning.range`, `cone_deg` x1.2 | 2 | 45 / 54 / 64.8 m; 30 / 36 / 43.2° |
| lightning_efficiency | Superconductor | `lightning.energy` x0.65, `damage` x1.1 | 2 | 3 / 1.95 / 1.27 energy; 60 / 66 / 72.6 damage |

---

## 6. Kill rewards

[P]:
- A kill gives a `kill` event and `end.kills`. **Kills do not score**; only placement does.
- What a kill pays is **loot on the ground**: the corpse's cubes **+ 2** (`cubes.death_drop_extra`) and every non-gun weapon it held.
- There is no automatic heal and no damage bonus. The loot goes to whoever walks over it first: cubes to the closest mech within 3.5 m, weapons to `take` within 4 m.
- The heal comes through the cubes: +4% max HP healed per cube, so a fresh kill (2 cubes) is +112 HP and +8% damage.
- A 4-cube house bot pays 6 cubes (+336 HP healed, +24% damage up to the cap) and possibly an offer.

[M]: house death cubes lie up to 5 m from the corpse; 66% of them are never collected.

In practice the only "kill reward" that scores is the extra house death before ours.

---

## 7. Zone (`config.zone`)

Start: circle r 560 m at (41.3, -72.8) (`zone.start_center`, `start_radius`).

| Phase | Hold (s) | Shrink (s) | Radius | DPS outside | Edge speed (max, radius + centre) [A] |
|---|---|---|---|---|---|
| 1 | 0-60 | 60-110 | 560 → 380 | 20 | 3.6 + 3.6 = 7.2 m/s |
| 2 | 110-155 | 155-195 | 380 → 240 | 35 | 7.0 |
| 3 | 195-230 | 230-265 | 240 → 140 | 60 | 5.7 |
| 4 | 265-295 | 295-325 | 140 → 70 | 100 | 4.7 |
| 5 | 325-350 | 350-375 | 70 → 25 | 160 | 3.6 |
| 6 | 375-390 | 390-415 | 25 → 0 | 260 | 2.0 |

Paths: `zone.phases[i].hold_s`, `shrink_s`, `radius`, `dps`.

Rules [P][M]:
- Each phase's dps applies from its hold through its shrink.
- Outside the zone: that dps, no armor, no regen. The 5 s regen timer restarts on re-entry.
- `obs.zone` always gives the current and **next** circle and the shrink window. The next circle always lies inside the current one.
- House drones take no zone damage.
- [M] We die at about 80-100 s, so only phase 1 (20 HP/s) has mattered in practice.

---

## 8. Protocol limits and what we see

| Limit | Value | Path / source |
|---|---|---|
| Answer budget | **50 ms wall time** per observation, 1 CPU | `bot.tick_budget_ms` |
| `ready` | within 20 s of `hello` (includes container start) | `bot.hello_budget_ms` |
| Late, missing or wrong-tick answer | dropped. The mech keeps `move` / `boost` / `aim`, drops `fire` / `jump` / `reload` / `pick` / `take` / `drop`; after 1.0 s it idles | `bot.coast_s` |
| Queued observations | answer only the newest (wrappers and check.py) | [P] section 2 |
| Line size | 64 KiB per JSON line (trailing spaces count); a bad line is ignored | `bot.max_line_bytes` |
| Offer timeout | 5 s, then choice 0 | `bot.offer_timeout_s` |
| Name | 32 chars | [P] |
| Sandbox | no network, uid 65534, read-only disk except `/tmp` 64 MB, 512 MB RAM without swap, 128 processes, map at `/arena` | [P] section 3 |
| check.py | 300 recorded observations. Lateness on more than 2% of answers fails a pass; it is retried up to 3 passes with a fresh bot, best counts | `check/check.py` |
| Build | linux/amd64, network on, 10 min; repository ≤ 20 MB at the commit (`max_bytes` 20000000) | track page |
| Debug | 64 lines, 64 points, 16 texts, 80 chars, 8,192 B per action, 8 MB per match, 0.5 s hold | `config.debug.*` |
| Track note | "Answer times vary by a few ms between runs and machines, so a bot that answers near the limit can score differently on a rerun." | track page |

**Each observation (10 per second while alive)** [P][S]:
- `tick`, `t`, `alive`.
- `self`: pos (feet), vel, **actual** aim, hp / max_hp, energy / max_energy, grounded, cubes, upgrades[], in_zone, `weapons[2]` (kind, cooldown, ammo, reload, charge, post-upgrade stats), `stats`.
- `mechs`: other mechs and NPCs seen now or within 5 s memory, at their **true** positions. Fields: id, kind, pos, vel, aim, hp, max_hp; for mechs also cubes, weapons, charging.
- `projectiles`: enemy bullets and shells plus NPC bullets, with velocity; ours are omitted.
- `crates` (with hp), `cubes`, `pickups`: only while seen.
- `sounds`: kind, bearing ±σ, dist class, age; since the last observation.
- `beams`: others' lasers and arcs that we saw.
- `events`: `damaged` (amount, weapon, bearing, by, rear), `hit` (target, amount, weapon, effect, rear), `effect`, `drop`, `kill`, `pickup`, `upgrade`, `took`, `dropped`, `take_failed`.
- `drops` (always known), `zone` (always known), `offer`.

**Action** [P]: `tick` (echo), `move` [x, y] (|v| ≤ 1), `boost`, `jump`, `aim` [yaw, pitch], `fire` [slot0, slot1] (held 2 ticks), `reload`, `pick`, `take`, `drop`, `debug`. Missing fields take their defaults; `aim` defaults to the last commanded aim.

---

## 9. Levers for an aggressive power-up / attack / heal bot

Currency [M]: practice points = house deaths before ours. Our lives run about 80-100 s. One kill costs us about 390 HP of intake today (about 7,800 damage out against about 2,100 HP taken per life). So **+390 HP of budget, or -390 HP per kill, is worth about one point**.

Code paths are under `scratchpad/variants6/FNV_s1/bot/lib/`. Values come from `params.js` with SELECT applied.

| # | Mechanic | Numbers that make it worth points | Our bot (FNV_s1) | Status |
|---|---|---|---|---|
| 1 | **Laser in hand early, and laser-first play** | 315 hitscan, 280 m, no spread, 131 DPS. 5 beams kill 1400 HP (4 with one `laser_damage`); one beam breaks a crate. House gun DPS on us falls 51 → 11 from 75 → 150 m; a laser does not fall off. [M] 343 HP per kill with a laser vs 540 gun-only; 0.149 vs 0.075 kills/s. About 10 ground lasers at the start plus about 6 from crates [A] | `economy.js chooseLoot()`: a laser pickup is worth 3 x 1.5 = 4.5, within 120 m of path (`lootPickupPath`), and only when quiet (3 s no contact, `B.A === 0`). `chooseGrab()`: in contact only within 60 m (`grabLaserR`); `grabLaserWide` false, so `lgGrabR` 130 is dead. `laserEcon` off (P2 'off'). We hold a laser in 15-18% of decisions before kill 3 [M] | **underused** |
| 2 | **Supply drop = full heal + 3 cubes + full energy** | Capturable at 95 s (our death window), 165 s and 235 s. Position known 25 s ahead; 4 s alone in an 8 m ring. From 50% HP: +700 HP healed + 3 cubes (+168 max HP, +12% damage, 1-2 offers) ≈ 2-2.5 points at 390 HP per point [A]. A mortar blast restarts a house capture; a house holder stands still 4 s | `tactics.js decideMode()`: DROP sits below ZONE, LOSING, HEAL, DISENGAGE and **FIGHT**, so with any target it never runs. `economy.js chooseDrop()`: skipped when any tracked mech is within 60 m of the ring (`dropContestR`), when we would arrive more than 3 s early (`dropEarlyS`: no waiting), beyond 250 m (`dropMaxD`), or when hp ≤ B.A x (tApp + 4) + 200. `steal.js dropOk()`: never when a mech is within the ring + 4 m or races us. There is no logic to fight for the ring, contest a house holder, or knock it out. [M] alive at the first landing in 5 of 40 sim matches | **ignored in practice** |
| 3 | **Converting damage into kills (finish order)** | A kill counts only at HP 0; damage left in a live mech at our death is worth 0. [M] about one kill of damage is spread over 2.5 targets at each of our deaths. 1400 HP = 32 gun hits or 5 beams; a target under 25% is 1-2 beams | `tactics.js selectTarget()` 'mult' focus: score 100 / (dist + 20), x2 if the current burst finishes it, x1.6 attacker, x1.3 current. Target HP enters only through `finishable` and the 25% keep rule. SELECT `finish: 'off'` (`finTtk`, `finB` false), `focus: 'mult'` (`focusAdd` off). `losingRaw()` treats only targets under 20% with ≤ 2 threats as finishing; quickest-kill applies only under `B.lastStand` (< 25% HP, ≥ 2 attackers, no cover in 3 s) | **underused** |
| 4 | **Kill piles: cubes + weapons** | Corpse cubes + 2 per kill, each +56 HP healed (base) and +4% damage, no regen delay; an offer at 1 / 3 / 6 / 10. [M] 66% of house death cubes are never collected; kyoto took 56 of its 84 cubes within 8 s of its kills | `economy.js chooseGrab()` / `killReachOk()`: 200 m reach (`killCubeR`) only with ≤ 1 threat (`killCubeThreats`) and no mech within 60 m of the cube (`killCubeClear`); otherwise 70 m at hp > 50%, 40 m below, 12 m when LOSING. Remembered 40 s (`cubeMemS`; 90 s for death cubes with `stealOn`). The laser band 125-185 m (`laserRange: 'far'`) leaves our kills' piles 125-185 m away | **partly used** |
| 5 | **The regen clock** | 45 HP/s after 5 s without dealing **or taking** damage, inside the zone. Any hit we land resets it (one 45 HP bullet can cost 5 s x 45 = 225 HP of regen). With 2 `nanites`: 115 HP/s after 2 s. [M] lulls: median 6.3 s; 14% last ≥ 13 s | `senses.js` writes `me.lastDealtT` (line 278), `me.regenDelay`, `me.regenPerS` (lines 97-98); **nothing reads them**. `tactics.js decideMode()` HEAL entry: < 55% HP after 1.5 s line-quiet (`healQuietS`), exit at 70%. `holdFire` only in HEAL. `firecontrol.js run()` has no regen term; `steal.js farmOk()` gates only drones on regen | **ignored** |
| 6 | **Upgrade picks** | `plating`: +210 / +241 / +278 HP, healed at once (+0.5 point each). `laser_damage`: 4-beam kill, one-shot drones. `nanites` (lever 5). `gun_mag`: +29% sustained gun DPS. `armor`: -8% per stack, never heals. Weapon upgrades only for weapons held at the draw; choice 0 after 5 s | `economy.js pick()` + `params.js upgradeOrder`: plating > armor > nanites > laser_damage > laser_charge > lightning_efficiency > gun_damage > gun_rate > ... > gun_mag (13th) ... gun_velocity (17th). Lists non-existent ids `mortar_damage` and `mortar_rate`; the real `mortar_reload` and `mortar_velocity` are unlisted (score 100). Nanites rank 3rd although regen rarely runs. Nothing keeps a laser in hand before a threshold | **used, order questionable** |
| 7 | **Rear hits x1.5 (attack and defence)** | Every hit from outside the target's 180° torso arc is x1.5: rear beam 472, rear bullet 67.5. House bots focus one target and sweep ±46°, so a second-line flank is a free +50%. Defensively, keeping all lines inside our front arc avoids x1.5 on us | `tactics.js assess()` sets `tr.rearOn` and multiplies estimated DPS; `burstDamage()` uses it; `scan.js rearPick()` faces a rear hitter for 1.5 s; `selectTarget()` torso veto. **No leg logic** in `brain.js fightLegs()` / `mover.standoff()` seeks a target's rear arc or keeps all attackers in one arc; `damaged.rear` share is not counted | **partly used** |
| 8 | **Gun cadence, reload windows, dual triggers** | Holding at cooldown ≤ 0.10 gives a 0.24-0.25 s cadence vs the house 0.30 s (+20-25% DPS). A house mag of 12 then 2.4 s silence = a 2.4 s push window; a house laser is dead 1.65 + 0.75 s after a beam. Gun during a laser charge: about +3 bullets (+135) per laser cycle if the server allows it [N] | `firecontrol.js run()`: `readyCd` 0.10 (used); gun during charge (used, unverified). `gunFlightMax` 0.55 s silences the gun beyond about 139 m unless the target is steady. `brain.js fightLegs()` uses the enemy reload only as `reloading && !me.laser` (band shortening, not with a laser); `losingRaw()` and the veto ignore it | **partly used** |
| 9 | **Early cube farming (crates, drones, loose cubes)** | 36 crates (300 HP → 1 cube + 50% weapon), 12 drones (350 HP → 2 cubes; 25 DPS back; reset regen). Each cube +56 HP healed and +4% damage; 10 cubes = 1,960 HP and x1.4 before the first house hunter arrives (first hurt at a median 32 s [M]) | `tactics.js selectTarget()` openFarm gate (no fight started until 10 cubes or 75 s; used). `economy.js chooseLoot()`: farming only at hp ≥ 90% (`farmHp`) and t < 210 s; crate value 1 (+1.5 with an empty slot), drone value 2; crates need `me.gun`. `firecontrol.js run()`: laser and mortar fire only at a mech or drone target (`if (lz && tgt)`), so the **one-beam crate break is never used** and crates take 7 gun hits | **used, with gaps** |
| 10 | **Signature effects: cook-off, short, concussion** | Laser on a mortar holder x1.6 (315 → 504; 756 from behind). Lightning shorts a charging laser and locks it 2 s; 240 DPS inside 45 m. Mortar concussion: 16 m/s knock + 9 up, -45 energy; it can **empty a supply ring** and restart the capture; splash goes over walls by lobbing | `tactics.js selectTarget()` x1.15 for a mortar holder; `firecontrol.js` includes cook-off in the release estimate (used). `economy.js wantPickup()` ranks laser 3 > lightning 2 > mortar 0; the gun always stays in SQUAD, so never laser + lightning (`ffaPair` is FFA only). A mortar only after 60 s with nothing better (`mortarWaitS`). Lightning is used only as a rush without a laser (`brain.js fightLegs()`, `rushR` 28). No concussion use on drop holders | **partly used** |

**Ranking of the stakes.** From our own estimates ([M] `panel_r6_rewards.md`, `rules_model.md`; not official), in points per match:

| Lever | Stake |
|---|---|
| Laser early | +0.5 |
| Supply drop 1 | up to about +2 if it were reachable; +0.06 at today's gates |
| Finishing | +0.5 to +1.0 |
| Kill piles | +0.35 |
| Regen discipline | +0.15 to +0.2 (more with nanites) |
| Plating | about +0.5 per stack in HP terms |
| Rear geometry | unmeasured |
| Gun cadence and reload windows | small and cheap |
| Early farming | +0.06 per crate trip |
| Signature effects | situational |

**Biggest gaps in the code, cheapest first:**
- (a) `upgradeOrder` ids and order, and holding a laser at a threshold.
- (b) Read `me.lastDealtT` so HEAL and the gun know when regen is running.
- (c) Let DROP outrank FIGHT around 90-100 s and drop the 60 m contest refusal against a lone house holder.
- (d) A laser grab radius of 130 m in the first 20-30 s (`grabLaserWide`).
- (e) A laser beam on crates while farming.
- (f) Quickest-kill focus below a set target HP, not only in last stand.

---

## 10. Unknowns that bear on the levers

- Whether damage taken during a capture interrupts it (rules say only the occupancy rules).
- Whether crate hits reset regen on the current build.
- Whether gun fire during a laser charge is applied.
- The exact meaning of `drops.spread`, `loot.death_drop`, `match.spawn_zone_fraction`.
- Whether a mortar direct hit also takes splash.
- Tick quantisation of `gun_rate`.
- How many house hunters follow k kills and what "late" means.
- Which way same-tick shared places round.
- When the possible Mech Royale rescore (staff, 03:10 UTC) happens and on which seeds.

Fetched copies (Sun 03:20 UTC), all under `scratchpad/web/rules_0320/`:
- Pages: `buildathon.html`, `tracks_builders.html`, `leaderboard.html`, `play_index.html`, `play_page.html`, `status.html`, `watch.html`, `protocol.md`, `protocol_inline.md`, `game_asset.js`.
- Kit: `kit_dl/mechfight-kit.tar.gz` and its extraction.
- Extracted text and Next.js data: `*.txt`, `*.flight.txt`, and `OLD_*` for the Saturday copies.
- Extraction scripts: `scratchpad/rules_tools/`.
