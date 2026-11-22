// Finding 1.18 own check: a running laser charge (0.4 of 0.75 s) is released when we are outside the zone (ZONE needs full speed).
import { createBrain, hello, ctxNone, check, mkObs, mech, dmgBy, wpn } from './common.js'
const b = createBrain(hello, ctxNone, { warmup: false })
const zIn = { center: [0, 0], radius: 600, next_center: [0, 0], next_radius: 500, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
const zOut = { center: [-400, 0], radius: 300, next_center: [-400, 0], next_radius: 250, shrink_start: 1e6, shrink_end: 2e6, dps: 20 }
let charge = 0, a = null
for (let k = 0; k < 6; k++) { a = b.act(mkObs({ t: 100 + k * 0.1, zone: zIn, mechs: [mech(10, 140, 0)], events: k === 0 ? [dmgBy(10)] : [], self: { weapons: [wpn('gun'), wpn('laser', { charge })] } }), performance.now() + 27); charge = a.fire[1] ? Math.min(0.4, charge + 0.1) : charge }
const before = a.fire[1]
const r = []
for (let k = 0; k < 3; k++) { const o = mkObs({ t: 100.6 + k * 0.1, zone: zOut, mechs: [mech(10, 140, 0)], self: { in_zone: false, weapons: [wpn('gun'), wpn('laser', { charge: 0.4 })] } }); a = b.act(o, performance.now() + 27); r.push(`${b.debugState().mode}:${a.fire[1]}`) }
check('1.18 running laser charge released outside the zone', before === true && r.every((x) => x.endsWith('false')), `inside, charging: trigger ${before}; outside at charge 0.4: ${r.join(' ')}`)
