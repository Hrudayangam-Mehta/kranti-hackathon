# Library bug reports (bot.js, aim.js, world.js, nav.js: files the brain authors must not edit)
## Safety review (crashes / protocol / performance), 2026-11-21

Scripts: `tools/review_safety/` (run with `taskset -c 0 ./bun <file>`). None of these is a wrong result in
normal play; they are costs and edge behaviour the brain has to work around.

### nav.js `Nav.setBody(radius, height)`: slower than its comment says, called inside a decision
- Comment: "Recomputes passability and step masks (about 2 ms)".
- Measured in the real bot process (`tools/review_safety/cube_spike.js`, kit stream with `self.cubes` stepping
  up, 6 fresh processes, main-thread CPU from `/proc/<pid>/task/<tid>/schedstat`): first resize 3.3-6.3 ms,
  second 3.7-9.4 ms, later ones 1.3-2.0 ms; all threads of the process (JIT compile included) up to 23.6 ms on
  the first resize. `senses.js senseSelf` calls it synchronously on every cube pickup.
- Work-around for the brain: call `nav.setBody` a few times for cubes 1..12 during `createBrain` (hello budget)
  and restore the base body, so the function is compiled before the first pickup; or defer the call to a
  decision with time left.

### nav.js: pockets are separate components and only `hopPlan()` joins them (by design, but nobody calls it)
- `nav.component(-307.02, 106.14)` = 16 (10033 cells, bbox x -375..-179, y -2..256, the stadium area), main = 0.
  `findPath` from there to any main-component goal returns `ok:false` with a partial path that ends at the wall.
- `nav.hopPlan(x, y, {toward})` returns a plan from 272/272 sampled cells of component 16 (climb 1.5-9.7 m,
  call <= 5.3 ms): `tools/review_safety/t_hopplan.js`. No brain module calls it (`grep hopPlan bot/lib`).
- Reproduction of the consequence: `tools/review_safety/t_bowl.js` (dev simulator, our mech moved into component
  16 before the first tick): 7 of 16 seeds die to the zone without ever leaving the component.

### world.js `_rayTerrain`: the part of a segment outside the terrain grid is marched every 0.5 m
- No block skip and no clipping outside the grid (guard 400000 iterations), so a segment to a point 90 km away
  costs about 1.5 ms. `senses.js vecOk` accepts coordinates up to 1e5.
- Reproduction: `tools/review_safety/t_far_ray.js`: 10 listed mechs 90 km east of the map edge -> 6-22 ms per
  decision (0.1-0.3 ms when they are 200 m outside). Not a legal observation; work-around: clamp track positions
  to `world.bounds` +- 200 m in `senseTracks`.

### bot.js (entry point), minor
- `handle()`: an `end` line in the same stdin chunk as an unanswered `obs` exits before that `obs` is answered
  (harmless: the match is over). Reproduction: pipe hello + obs lines + end in one write; 0 actions come back.
- `fallbackAct()` (only used when the brain is missing or throws out of `act`): `boost: me.in_zone === false`
  without looking at `self.grounded` (in the air boost is the jet, protocol section 6), and `fire[1]` held while
  an enemy is within 45 m whatever weapon is in slot 1 (a laser then only fires through the 2 s auto-release).

## Integration pass 1 (07:00-09:00 UTC): bot.js fixes applied (entry point, I/O contract unchanged)
- fallbackAct: boost only when `self.grounded !== false`; slot 1 fired only when it holds lightning.
- handle(): an `obs` in the same chunk as `end` is answered before exiting.
- Test: tools/test_brain.js "bot.js entry" (hello + obs + end in one write -> one answer line).
No change to world.js, nav.js, aim.js: the far-ray cost (world.js _rayTerrain) is avoided in the brain by clamping
track positions to bounds +- 200 m (senses.js); setBody cost is moved to start-up (brain.js warmBodies).
