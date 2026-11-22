// Matched-seed A/B of the frozen copy (req_bot) in the project simulator. One process, one match at a time.
// usage: bun ab.mjs <mode squad|ffa> <seeds "1,2,..."> <configs "ON,R1off,..."> <out.jsonl>
import { appendFileSync } from 'node:fs'
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const BRAIN = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/req_bot/lib/brain.js'
const { makeContext, resolveBot, playMatch } = await import(P + '/sim/run.js')
const { brainBotFactory } = await import(P + '/sim/ourbot.js')
const real = await import(BRAIN)
const [mode, seedsS, cfgS, out] = process.argv.slice(2)
const CONFIGS = {
  ON: {}, R1off: { stealOn: false, crateGateOn: false }, R2off: { scanOn: false }, R3off: { headAimOn: false, aimCalOn: false },
  OFF: { stealOn: false, crateGateOn: false, scanOn: false, headAimOn: false, aimCalOn: false },
  G50: { gunLadderTop: 0.5 }, R1gateOff: { crateGateOn: false }, R1stealOff: { stealOn: false }, R1soft: { crateMechR: 120, crateQuietS: 2 }, L50: { aimLadder: [0.5, 0.65, 0.8, 0.35, 0.2] },
}
const ROSTER = ['magic_53f6854', 'proj1_kite200_b624765', 'ttun_ae1b122', 'kanyaraasi_83e4c93', 'r1ver_ts_af337d5', 'nexus_v281_312d591']
const ctx = makeContext({ quiet: true, timeout: 1000, mapDir: '/srv/mech-sparring/_arena' })
let last = null
const wrap = { createBrain: (h, c, o) => { last = real.createBrain(h, c, o); return last } }
const opponents = []
if (mode === 'ffa') for (const n of ROSTER) opponents.push(await resolveBot('proc:/srv/mech-sparring/run.sh ' + n, ctx))
for (const seed of seedsS.split(',').map(Number)) {
  for (const cname of cfgS.split(',')) {
    last = null
    const team = brainBotFactory(wrap, { world: ctx.world, name: 'req', overrides: CONFIGS[cname], quiet: true })
    const t0 = performance.now()
    const r = await playMatch(seed, { mode }, ctx, { team, opponents })
    const st = last ? last.debugState() : {}
    const c = st.counters || {}
    const rec = { mode, seed, cfg: cname, score: r.score, place: r.place, kills: r.kills, alive: r.timeAlive, dealt: Math.round(r.dmgDealt), taken: Math.round(r.dmgTaken), cubes: r.cubes, loadout: r.loadout, cause: r.cause, lates: r.lates, errors: r.errors, maxMs: r.maxMs, meanMs: r.meanMs,
      steals: c.steals || 0, stealDone: c.stealDone || 0, keeps: c.stealKeeps || 0, stealHurt: c.steal_hurt || 0, deaths: c.deathsSeen || 0, rearFaces: c.rearFaces || 0, calBeams: c.calBeams || 0,
      laserShots: c.laserShots || 0, laserHits: c.laserHits || 0, shots: c.shots || 0, forced: st.scan ? st.scan.forced : 0, maxBlind: st.scan ? Math.round(st.scan.maxBlind * 10) / 10 : 0, gunS: st.gun ? Math.round(st.gun.shots.reduce((a, b) => a + b, 0)) : 0, gunH: st.gun ? Math.round(st.gun.hits.reduce((a, b) => a + b, 0)) : 0, env: st.env, wallS: Math.round(performance.now() - t0) / 1000 }
    appendFileSync(out, JSON.stringify(rec) + '\n')
    console.log(JSON.stringify(rec))
  }
}
process.exit(0)
