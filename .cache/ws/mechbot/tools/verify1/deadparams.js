import { readFileSync } from 'node:fs'
const D = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot/bot/lib/'
const { PARAMS } = await import(D + 'params.js')
const src = ['brain', 'senses', 'tactics', 'mover', 'firecontrol', 'economy', 'stance'].map((f) => readFileSync(D + f + '.js', 'utf8')).join('\n')
const dead = Object.keys(PARAMS).filter((k) => !new RegExp('\\bP\\.' + k + '\\b').test(src))
console.log('PARAMS keys:', Object.keys(PARAMS).length, 'never read as P.<key> in the brain modules:', dead.length, dead.join(', '))
