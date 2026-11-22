// Panel R5: how often V4 leaves FIGHT for DISENGAGE / HEAL while the current mech target was a near kill, in the
// simulator (behaviour only). Near kill: tr.tau (hp / our dps estimate) <= 3 s and B.A x (tau + 0.3) < hp - 150.
// Also: what becomes of that target (killed by us within 20 s, or not), and damage dealt into mechs never killed.
const P = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const V4 = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot'
const [from, to] = [+(process.argv[2] || 1), +(process.argv[3] || 6)]
const OV = process.env.OVR ? JSON.parse(process.env.OVR) : {}
const { makeContext, playMatch } = await import(P + '/sim/run.js')
const { createBrain } = await import(V4 + '/lib/brain.js')
const { Nav } = await import(V4 + '/lib/nav.js')
const ctx = makeContext({ quiet: true })
let nav = null
const T = { leaves: 0, near: 0, nearKilledLater: 0, nearOurHpf: 0, nearTgtHpf: 0, leavesByReason: {}, wasted: 0, dmgOut: 0, kills: 0, deathsAfterNear: 0, matches: 0 }
for (let seed = from; seed <= to; seed++) {
  let brain = null, prevMode = '', pend = [], lastT = 0
  const dmgTo = new Map(), killed = new Set()
  const team = () => ({ name: 'ours',
    hello(h) { const mc = h.config.mech; if (!nav) nav = new Nav(ctx.world, { cell: 2, stepUp: mc.step_up, maxSlopeDeg: mc.max_slope_deg }); nav.setBody(mc.radius, mc.height); brain = createBrain(h, { world: ctx.world, nav, log: () => {} }, OV); return { type: 'ready', name: 'ours' } },
    act(obs) {
      const tgt0 = brain._B.target
      const a = brain.act(obs, performance.now() + 27.5)
      const B = brain._B, me = B.me, t = obs.t
      lastT = t
      if (Array.isArray(obs.events)) for (const e of obs.events) {
        if (!e) continue
        if (e.type === 'hit' && Number.isInteger(e.target) && e.target < 100) { dmgTo.set(e.target, (dmgTo.get(e.target) || 0) + e.amount); T.dmgOut += e.amount }
        if (e.type === 'kill' && Number.isInteger(e.target) && e.target < 100) { killed.add(e.target); T.kills++; for (const p of pend) if (p.id === e.target && t - p.t <= 20) { p.done = true } }
      }
      if (prevMode === 'FIGHT' && (B.mode === 'DISENGAGE' || B.mode === 'HEAL') && tgt0 && !tgt0.npc) {
        T.leaves++
        const why = B.mode + (B.losing ? '/losing' : '')
        T.leavesByReason[why] = (T.leavesByReason[why] || 0) + 1
        const tau = tgt0.tau
        if (tau <= 3 && B.A * (tau + 0.3) < me.hp - 150) {
          T.near++; T.nearOurHpf += me.hpf; T.nearTgtHpf += tgt0.hp / tgt0.maxHp
          pend.push({ id: tgt0.id, t, done: false })
        }
      }
      prevMode = B.mode
      a.tick = obs.tick; return a } })
  await playMatch(seed, { mode: 'squad' }, ctx, { team, opponents: [] })
  T.matches++
  for (const p of pend) if (p.done) T.nearKilledLater++
  if (pend.length && lastT - pend[pend.length - 1].t < 10) T.deathsAfterNear++
  for (const [id, d] of dmgTo) if (!killed.has(id)) T.wasted += d
}
console.log(`V4 seeds ${from}-${to}: kills ${T.kills}, damage into mechs ${T.dmgOut.toFixed(0)}, into mechs never killed ${T.wasted.toFixed(0)} (${(100 * T.wasted / T.dmgOut).toFixed(0)}%)`)
console.log(`FIGHT -> DISENGAGE/HEAL with a mech target: ${T.leaves} (${Object.entries(T.leavesByReason).map(([k, v]) => k + ' ' + v).join(', ')})`)
console.log(`... of which near kills (tau <= 3 s, B.A x (tau + 0.3) < hp - 150): ${T.near}; our hp then ${(100 * T.nearOurHpf / Math.max(1, T.near)).toFixed(0)}%, target hp ${(100 * T.nearTgtHpf / Math.max(1, T.near)).toFixed(0)}%; killed by us within 20 s anyway: ${T.nearKilledLater}; we died within 10 s of the last one: ${T.deathsAfterNear} matches`)
