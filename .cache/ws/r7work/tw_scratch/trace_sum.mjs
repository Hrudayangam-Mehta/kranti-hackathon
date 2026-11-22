import { readFileSync, readdirSync } from 'node:fs'
const D = process.argv[2]
const { PARAMS } = await import('/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/r7work/ckpt_07_LG/lib/params.js')
const init = new Set(), act = new Set()
for (const f of readdirSync(D).filter((f) => f.endsWith('.json'))) { const j = JSON.parse(readFileSync(D + '/' + f, 'utf8')); j.init.forEach((k) => init.add(k)); j.act.forEach((k) => act.add(k)) }
const keys = Object.keys(PARAMS)
const initOnly = keys.filter((k) => init.has(k) && !act.has(k))
const both = keys.filter((k) => init.has(k) && act.has(k))
const never = keys.filter((k) => !init.has(k) && !act.has(k))
console.log('PARAMS keys', keys.length, 'act-read', keys.filter((k) => act.has(k)).length)
console.log('INIT ONLY', initOnly.join(' '))
console.log('INIT AND ACT', both.join(' '))
console.log('NEVER READ in traces', never.join(' '))
console.log('non-PARAMS keys read', [...new Set([...init, ...act])].filter((k) => !(k in PARAMS)).join(' '))
