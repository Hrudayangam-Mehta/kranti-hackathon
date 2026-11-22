// print the anchored keys of each stream's hello config against the defaults
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const W = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/fable_work/builds/FB_s11/troot'
const { anchorToConfig } = await import(W + '/bot/lib/brain.js')
const { resolveParams } = await import(W + '/bot/lib/params.js')
const keys = ['farmStopT', 'scanLateT', 'ffaLatchT', 'openFarmT', 'ffaQuietS', 'fpStartT', 'ffaFinalT', 'fpShootT', 'zoneLateR', 'scanLateR', 'magSize', 'magReloadS', 'laserDpsIn', 'lightDpsIn', 'mortarDpsIn', 'mortarMaxR']
for (const f of process.argv.slice(2)) {
  const first = gunzipSync(readFileSync(f)).toString('utf8').split('\n')[0]
  const h = JSON.parse(first)
  const P0 = resolveParams({}), P = resolveParams({}); anchorToConfig(P, h.config, null)
  const d = keys.filter((k) => P[k] !== P0[k]).map((k) => `${k} ${P0[k]} -> ${P[k]}`)
  const z = h.config.zone
  console.log(f.split('/').pop(), d.length ? d.join(', ') : 'no anchored change', '| phases', z && z.phases ? z.phases.map((p) => `${p.hold_s}/${p.shrink_s}/${p.radius}`).join(' ') : 'none')
}
