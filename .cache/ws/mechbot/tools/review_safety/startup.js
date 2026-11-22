// Start-up: wall time from process spawn to the "ready" line, and CPU time (utime+stime of all threads) the
// process burned to get there. Variants: pinned to one CPU / unpinned, Bun / Node, good map dir / missing map.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { P, realHello, loadStream } from './common.js'
const BUN = join(P, 'bun'), BOT = join(P, 'bot', 'bot.js')
const firstObs = loadStream()[1]
function cpuMs(pid) { try { const s = readFileSync(`/proc/${pid}/stat`, 'utf8'); const f = s.slice(s.lastIndexOf(')') + 2).split(' '); return (Number(f[11]) + Number(f[12])) * 10 } catch { return NaN } }
function threads(pid) { try { return Number(/Threads:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) } catch { return NaN } }
function rssMb(pid) { try { return Number(/VmHWM:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1]) / 1024 } catch { return NaN } }
async function once(cmd, hello) {
  const t0 = performance.now()
  const child = spawn(cmd[0], cmd.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] })
  let out = '', err = ''
  child.stderr.on('data', (d) => { err += d })
  const res = await new Promise((resolve) => {
    let ready = null, firstAns = null, tObs = 0
    child.stdout.on('data', (d) => {
      out += d
      const lines = out.split('\n')
      if (ready === null && lines.length > 1) {
        ready = { ms: performance.now() - t0, cpu: cpuMs(child.pid), threads: threads(child.pid), hwm: rssMb(child.pid), line: lines[0] }
        tObs = performance.now(); child.stdin.write(JSON.stringify(firstObs) + '\n')
      } else if (ready && lines.length > 2 && firstAns === null) {
        firstAns = performance.now() - tObs
        child.stdin.write(JSON.stringify({ type: 'end', place: 1, kills: 0 }) + '\n'); child.stdin.end()
      }
    })
    child.on('exit', (code) => resolve({ ready, firstAns, code }))
    child.stdin.write(JSON.stringify(hello) + '\n')
    setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 30000)
  })
  res.err = err
  return res
}
const hello = realHello()
const variants = [
  ['bun, taskset -c 0', ['taskset', '-c', '0', BUN, BOT], hello],
  ['bun, unpinned (4 CPUs)', [BUN, BOT], hello],
  ['node 22, taskset -c 0', ['taskset', '-c', '0', 'node', BOT], hello],
  ['bun, taskset -c 0, map dir missing', ['taskset', '-c', '0', BUN, BOT], { ...hello, map: { dir: '/nonexistent/arena', files: [] } }],
  ['bun, taskset -c 0, hello without map/config', ['taskset', '-c', '0', BUN, BOT], { type: 'hello', protocol: 'mechfight/1', slot: 3, seed: 1 }],
]
for (const [label, cmd, h] of variants) {
  const rs = []
  for (let k = 0; k < 5; k++) rs.push(await once(cmd, h))
  const ok = rs.filter((r) => r.ready)
  const f = (a) => `${Math.min(...a).toFixed(0)}..${Math.max(...a).toFixed(0)}`
  console.log(`${label.padEnd(44)} ready ${f(ok.map((r) => r.ready.ms))} ms wall, cpu ${f(ok.map((r) => r.ready.cpu))} ms, threads ${f(ok.map((r) => r.ready.threads))}, peak RSS ${f(ok.map((r) => r.ready.hwm))} MB, first answer ${f(rs.map((r) => r.firstAns ?? NaN))} ms, exit codes ${rs.map((r) => r.code).join(',')}`)
  console.log('   stderr:', rs[0].err.trim().split('\n').slice(0, 4).join(' | ').slice(0, 400))
}
