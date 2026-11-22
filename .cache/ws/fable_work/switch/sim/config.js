// Config helpers for the dev simulator: the real hello.config saved in notes/, and the older balance the
// official replay was recorded with (notes/forensics.md section 0) for the replay sanity test.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SIM_DIR = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(SIM_DIR, '..')
export const MAP_DIR = join(ROOT, 'kit', 'arena')

/** The complete rule set of a real `hello` (current balance). */
export function loadConfig(path = join(ROOT, 'notes', 'hello_example.json')) {
  return JSON.parse(readFileSync(path, 'utf8')).config
}

/** Numbers measured in replay/mech16.jsonl.gz that differ from the current config. */
export const OLD_BALANCE = {
  mech: { walk_speed: 9.0, boost_speed: 15.0, ground_accel: 45, boost_drain: 26, jet_drain: 20 },
  weapons: {
    gun: { speed: 140, cooldown: 0.3 },                    // one shot per 8 ticks for a bot that fires on "cooldown 0"
    laser: { damage: 420, charge: 0.65, cooldown: 2.55, charge_turn_mult: 0 },   // the old build locked the torso while charging
    mortar: { cooldown: 2.7 },
    lightning: { energy: 5.5 },
  },
  cubes: { size_per_cube: 0 },
}

export function oldBalance(cfg) {
  const c = JSON.parse(JSON.stringify(cfg))
  Object.assign(c.mech, OLD_BALANCE.mech)
  for (const k in OLD_BALANCE.weapons) Object.assign(c.weapons[k], OLD_BALANCE.weapons[k])
  Object.assign(c.cubes, OLD_BALANCE.cubes)
  return c
}

/** Shallow-per-section merge of overrides into a config copy (for experiments). */
export function withOverrides(cfg, over) {
  const c = JSON.parse(JSON.stringify(cfg))
  for (const k in over || {}) {
    if (c[k] && typeof c[k] === 'object' && !Array.isArray(c[k])) {
      for (const q in over[k]) {
        if (c[k][q] && typeof c[k][q] === 'object' && !Array.isArray(c[k][q])) Object.assign(c[k][q], over[k][q]); else c[k][q] = over[k][q]
      }
    } else c[k] = over[k]
  }
  return c
}
