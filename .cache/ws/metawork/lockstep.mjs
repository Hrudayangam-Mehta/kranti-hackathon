// usage: bun lockstep.mjs <bot.js> : feeds the kit stream one observation at a time (waits for each answer); prints sha256 of the answers
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
const KP = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/mechbot'
const BUN = KP + '/bun'
const lines = gunzipSync(readFileSync(KP + '/kit/check/stream.jsonl.gz')).toString('utf8').split('\n').filter(Boolean)
const p = spawn(BUN, [process.argv[2]], { stdio: ['pipe', 'pipe', 'pipe'], cwd: '/tmp' })
let buf = '', waiters = [], errs = ''
p.stderr.on('data', (d) => { errs += d })
p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); const w = waiters.shift(); if (w) w(l) } })
const next = () => new Promise((r) => waiters.push(r))
const h = createHash('sha256'); let n = 0, maxMs = 0
p.stdin.write(lines[0] + '\n'); const ready = await next()
for (const l of lines.slice(1)) {
  const o = JSON.parse(l)
  if (o.type !== 'obs') { p.stdin.write(l + '\n'); continue }
  const t0 = performance.now(); p.stdin.write(l + '\n'); const a = await next(); const ms = performance.now() - t0; if (ms > maxMs) maxMs = ms
  h.update(a + '\n'); n++
}
p.stdin.end()
const code = await new Promise((r) => p.on('exit', r))
console.log(`${process.argv[2].split('/').slice(-3).join('/')}: ready ${JSON.parse(ready).type}, answers ${n}, sha256 ${h.digest('hex').slice(0, 16)}, max ${maxMs.toFixed(1)} ms, exit ${code}, stderr errors ${(errs.match(/failed|Error/g) || []).length}`); if (process.env.SHOWERR) console.log(errs.split("\n").filter((l) => /failed|Error/.test(l)).map((l) => l.slice(0, 160)).join("\n"))
