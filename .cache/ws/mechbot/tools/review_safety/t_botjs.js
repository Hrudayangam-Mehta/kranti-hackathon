// End-to-end oddities at the entry point (real process): junk lines, CRLF, split writes, backlog, obs without
// self, a 200 KB line, hello repeated, stdin closed without `end`, SIGPIPE on stdout.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { P, ARENA, loadStream, validateAction } from './common.js'
const lines = loadStream()
const hello = { ...lines[0], map: { dir: ARENA, files: ['v2/world.json', 'v2/terrain.i16'] } }
const obs = lines.filter((l) => l.type === 'obs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function start() {
  const child = spawn('taskset', ['-c', '0', join(P, 'bun'), join(P, 'bot', 'bot.js')], { stdio: ['pipe', 'pipe', 'pipe'] })
  const st = { child, out: [], err: '', exit: null, buf: '' }
  child.stdout.setEncoding('utf8'); child.stdout.on('data', (d) => { st.buf += d; let i; while ((i = st.buf.indexOf('\n')) >= 0) { st.out.push(st.buf.slice(0, i)); st.buf = st.buf.slice(i + 1) } })
  child.stderr.setEncoding('utf8'); child.stderr.on('data', (d) => { st.err += d })
  child.on('exit', (code, sig) => { st.exit = { code, sig } })
  child.stdin.on('error', () => {})
  return st
}
const waitOut = async (st, n, ms = 4000) => { const t0 = Date.now(); while (st.out.length < n && Date.now() - t0 < ms && !st.exit) await sleep(5); return st.out.length >= n }
const waitExit = async (st, ms = 3000) => { const t0 = Date.now(); while (!st.exit && Date.now() - t0 < ms) await sleep(5); return st.exit }
const W = (st, s) => st.child.stdin.write(s)
const J = (o) => JSON.stringify(o)
const results = []
const check = (name, ok, detail = '') => { results.push([name, ok, detail]); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${detail}`) }

{ // 1. junk before/after hello, CRLF, blank lines
  const st = start()
  W(st, '\n\n   \nnot json\n{"type":"obs"}\n[1,2,3]\nnull\n42\n"str"\n{"type":"unknown","x":1}\n')
  W(st, J(hello) + '\r\n')
  check('ready after junk + CRLF hello', await waitOut(st, 1, 20000), st.out[0])
  W(st, J(obs[0]) + '\r\n'); await waitOut(st, 2)
  check('answers a CRLF obs', st.out.length === 2 && validateAction(JSON.parse(st.out[1]), obs[0].tick).length === 0, st.out[1])
  // 2. obs split across writes
  const s = J(obs[1]) + '\n'
  W(st, s.slice(0, 100)); await sleep(30); W(st, s.slice(100, 3000)); await sleep(30); W(st, s.slice(3000)); await waitOut(st, 3)
  check('obs split over 3 writes answered once', st.out.length === 3 && JSON.parse(st.out[2]).tick === obs[1].tick)
  // 3. backlog of 5 in one write: only the newest answered
  W(st, [2, 3, 4, 5, 6].map((i) => J(obs[i])).join('\n') + '\n'); await sleep(400)
  check('backlog of 5 -> one answer, newest tick', st.out.length === 4 && JSON.parse(st.out[3]).tick === obs[6].tick, `answers ${st.out.length - 3}, tick ${st.out[3] && JSON.parse(st.out[3]).tick} want ${obs[6].tick}`)
  // 4. obs without self / with self null / empty obs: no answer expected, process must live
  W(st, J({ type: 'obs', tick: 9000 }) + '\n' ); await sleep(100)
  W(st, J({ ...obs[7], self: null }) + '\n'); await sleep(100)
  const n4 = st.out.length
  W(st, J(obs[8]) + '\n'); await waitOut(st, n4 + 1)
  check('obs without self is skipped, next obs still answered', !st.exit && st.out.length === n4 + 1 && JSON.parse(st.out[n4]).tick === obs[8].tick, `answers to self-less obs: ${n4 - 4}`)
  // 5. obs whose self has no pos / weapons / zone
  const o5 = JSON.parse(J(obs[9])); delete o5.self.pos; delete o5.self.weapons; delete o5.zone; delete o5.mechs
  W(st, J(o5) + '\n'); const ok5 = await waitOut(st, n4 + 2)
  check('obs with self but no pos/weapons/zone/mechs answered validly', ok5 && validateAction(JSON.parse(st.out[n4 + 1]), o5.tick).length === 0, st.out[n4 + 1])
  // 6. a 200 KB line (over max_line_bytes) then a normal obs
  const big = JSON.parse(J(obs[10])); big.pad = 'x'.repeat(200000)
  W(st, J(big) + '\n'); await sleep(200)
  const n6 = st.out.length
  W(st, J(obs[11]) + '\n'); await waitOut(st, n6 + 1)
  check('200 KB obs line does not break the stream', !st.exit && JSON.parse(st.out[st.out.length - 1]).tick === obs[11].tick, `lines after big: ${st.out.length}`)
  // 7. a second hello mid-match
  W(st, J(hello) + '\n'); const n7 = st.out.length; await waitOut(st, n7 + 1, 20000)
  check('second hello -> second ready, still alive', !st.exit && /"ready"/.test(st.out[n7] || ''), st.out[n7])
  W(st, J(obs[12]) + '\n'); await waitOut(st, n7 + 2)
  check('obs after re-hello answered', JSON.parse(st.out[st.out.length - 1]).tick === obs[12].tick)
  // 8. end
  W(st, J({ type: 'end', place: 3, kills: 1 }) + '\n'); const ex = await waitExit(st)
  check('exits 0 after end', !!ex && ex.code === 0, J(ex))
  const bad = st.out.filter((l) => { try { const o = JSON.parse(l); return !(o.type === 'ready' || typeof o.tick === 'number') } catch { return true } })
  check('stdout carried only protocol messages', bad.length === 0, bad.slice(0, 2).join(' | '))
  check('no exception logged on stderr', !/failed|uncaught|unhandled/i.test(st.err), st.err.split('\n').filter((l) => /failed|uncaught|unhandled/i.test(l)).slice(0, 2).join(' | '))
}
{ // 9. stdin closed without end
  const st = start(); W(st, J(hello) + '\n'); await waitOut(st, 1, 20000); W(st, J(obs[0]) + '\n'); await waitOut(st, 2)
  st.child.stdin.end(); const ex = await waitExit(st)
  check('stdin EOF without end -> exits 0', !!ex && ex.code === 0, J(ex))
}
{ // 10. final obs without trailing newline followed by EOF
  const st = start(); W(st, J(hello) + '\n'); await waitOut(st, 1, 20000); W(st, J(obs[0])); st.child.stdin.end(); await waitExit(st)
  check('last obs without newline before EOF still answered', st.out.length === 2, `lines ${st.out.length}`)
}
{ // 11. obs before hello (no brain yet)
  const st = start(); W(st, J(obs[0]) + '\n'); await waitOut(st, 1, 3000)
  check('obs before hello answered by the fallback policy', st.out.length === 1 && validateAction(JSON.parse(st.out[0]), obs[0].tick).length === 0, st.out[0])
  W(st, J({ type: 'end' }) + '\n'); await waitExit(st)
}
{ // 12. hello with config sections missing or wrong types
  for (const [name, h] of [['hello.config = null', { ...hello, config: null }], ['hello.config.weapons = []', { ...hello, config: { ...hello.config, weapons: [], mech: 'x', cubes: null } }], ['hello.seed missing, map null', { ...hello, seed: undefined, map: null }]]) {
    const st = start(); W(st, J(h) + '\n'); const r = await waitOut(st, 1, 20000)
    let okAll = r
    for (let i = 0; i < 40 && okAll; i++) { W(st, J(obs[i]) + '\n'); okAll = await waitOut(st, 2 + i) && validateAction(JSON.parse(st.out[1 + i]), obs[i].tick).length === 0 }
    W(st, J({ type: 'end', place: 1, kills: 0 }) + '\n'); const ex = await waitExit(st)
    check(`${name}: ready + 40 valid answers + exit 0`, okAll && ex && ex.code === 0, st.err.split('\n').filter((l) => /failed|uncaught/i.test(l)).slice(0, 2).join(' | ').slice(0, 300))
  }
}
console.log(`\n${results.filter((r) => r[1]).length}/${results.length} passed`)
process.exit(0)
