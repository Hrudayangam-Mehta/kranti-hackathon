// Prints the re-anchored numbers of the patched brain for each map's hello config (and the V4 constants).
// usage: bun anchors.mjs <patched bot dir> names...
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url))
const [BOT, ...names] = process.argv.slice(2)
const { anchorToConfig } = await import(pathToFileURL(join(BOT, 'lib', 'brain.js')).href)
const { resolveParams } = await import(pathToFileURL(join(BOT, 'lib', 'params.js')).href)
const keys = ['farmStopT', 'scanLateT', 'ffaLatchT', 'openFarmT', 'ffaQuietS', 'fpStartT', 'ffaFinalT', 'fpShootT', 'zoneLateR', 'scanLateR', 'magSize', 'magReloadS', 'laserDpsIn', 'lightDpsIn', 'mortarDpsIn', 'mortarMaxR']
const P0 = resolveParams({})
console.log('V4     ', keys.map((k) => `${k}=${P0[k] ?? 235}`).join(' '))
for (const n of names) {
  const c = JSON.parse(readFileSync(join(HERE, n, 'hello.json'), 'utf8')).config
  const P = resolveParams({}); anchorToConfig(P, c, null)
  console.log(n.padEnd(7), keys.map((k) => `${k}=${P[k]}`).join(' '))
}
