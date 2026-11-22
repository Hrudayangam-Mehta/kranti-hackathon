import sys
p=sys.argv[1]; s=open(p).read()
s=s.replace("const failed = results.filter((r) => !r.passed)", """if (process.env.DBG) {
  const [nm, mul, add, want, ...seeds] = process.env.DBG.split(',')
  for (const sd of seeds) {
    const seed = +sd
    let prev = ''
    runTrack(nm, seed * +mul + +add, { onTick: (c, w, f, k) => { const r = c.archetypeOf(5); const m = c.debugState().mechs.find((m) => m.id === 5); if (!m) return; const lab = r.archetype + '/' + m.cand; if (lab !== prev || (r.archetype !== want && k % 5 === 0)) { prev = lab; console.log(seed, (k / 10).toFixed(1), r.archetype, 'cand', m.cand, JSON.stringify(m.scores), JSON.stringify({ still: m.feat.still, slow: m.feat.slow, stillL: m.feat.stillLong, slowL: m.feat.slowLong, boost: m.feat.boost, boostL: m.feat.boostLong, aimMech: m.feat.aimMech, clUs: m.feat.clUs, clMax: m.feat.clMax })) } } })
  }
}
const failed = results.filter((r) => !r.passed)""")
s=s.replace("// ----------------------------------------------------------------------------------------- a. archetype tracks","if (process.env.DBG) SEEDS.length = 0\n// ----------------------------------------------------------------------------------------- a. archetype tracks")
open('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/tools/_dbg_counters.js','w').write(s)
