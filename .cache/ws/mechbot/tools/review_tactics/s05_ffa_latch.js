// Scenario 5: why does the brain latch FFA inside a squad practice match? Prints every change of the F / Q
// counters (brain.debugState()) together with what the observation showed on that decision.
//   bun tools/review_tactics/s05_ffa_latch.js --seeds 6 [--reps 2]
import { runTrace } from './lib_trace.js'
const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
const seeds = arg('seeds', '6').split(',').map(Number), reps = parseInt(arg('reps', '1'), 10)
for (const seed of seeds) for (let rep = 0; rep < reps; rep++) {
  let pF = 0, pQ = 0, pAlive = -1, pKills = 0, ref = { brain: null }
  const lines = []
  const res = await runTrace(seed, { hook: (row, obs, a, B) => {
    // the stance object is not reachable from B; F and Q are read through the closure kept by debugState of this brain
    row.alive = obs.alive; row.kills = B.counters.kills
    row.beams = (obs.beams || []).map((b) => `${b.kind} by ${b.by} ending [${b.path[b.path.length - 1].map((v) => Math.round(v)).join(',')}]`).join('; ')
    row.drops = B.trackList.filter((t) => !t.npc && t.listed && t.hpPrev - t.hp >= 40 && obs.t - t.hpPrevT <= 0.5).map((t) => `mech ${t.id} hp ${Math.round(t.hpPrev)}->${Math.round(t.hp)} d=${Math.round(t.dist)} lastOurHit ${(obs.t - t.lastDmgOutT).toFixed(1)}s ago mortar=${t.hasMortar}`).join('; ')
    row.myLastDealt = obs.t - B.me.lastDealtT
    row.where = B.trackList.filter((t) => !t.npc && t.listed).map((t) => `${t.id}@${Math.round(t.x)},${Math.round(t.y)}`).join(' ')
  }, })
  // second pass over the same decisions is not possible (F/Q live in a closure), so read them from debugState inside a wrapper run
  let prev = null
  const { rows, rec, brainLogs } = res
  console.log(`seed ${seed} rep ${rep}: kills ${rec.kills}, ${brainLogs.filter((l) => l.includes('FFA')).join(' | ') || 'no latch'}`)
  for (const r of rows) {
    if (prev && (r.alive !== prev.alive || r.kills !== prev.kills)) console.log(`   t=${r.t.toFixed(1)} alive ${prev.alive}->${r.alive} ourKills ${prev.kills}->${r.kills} events [${r.ev}]`)
    if (r.beams) console.log(`   t=${r.t.toFixed(1)} beam: ${r.beams} | listed mechs ${r.where}`)
    if (r.drops) console.log(`   t=${r.t.toFixed(1)} hp drop >= 40 on a listed mech: ${r.drops}; our last hit event ${r.myLastDealt.toFixed(1)}s ago`)
    if (prev && prev.env !== r.env) console.log(`   t=${r.t.toFixed(1)} env ${prev.env}->${r.env}`)
    prev = r
  }
}
process.exit(0)
