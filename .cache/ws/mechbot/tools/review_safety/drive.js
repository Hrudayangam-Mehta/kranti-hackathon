// Lockstep driver for the REAL entry point (bot/bot.js as a child process pinned to CPU 0), the way the match
// server talks to it: hello -> ready, then one obs line -> one action line. Run the driver itself on another CPU:
//   taskset -c 1 bun drive.js --stream out/ffa1.jsonl [--repeat 3] [--actions out/a.jsonl] [--cpu 0] [--node]
//   taskset -c 1 bun drive.js --gen heavy --ticks 6000
// Reports: time to ready, answer latency distribution, late / missing / invalid answers, stderr error lines,
// RSS (VmRSS / VmHWM from /proc) every 500 decisions.
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { P, ARENA, validateAction, pct } from './common.js'

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const has = (k) => args.includes(k)
const cpu = arg('--cpu', '0')
const runtime = has('--node') ? ['node'] : [join(P, 'bun')]
const quiet = has('--quiet')

export async function drive({ hello, nextObs, total, actionsFile, label = '', budgetMs = 50, timeoutMs = 5000, memLimitMb = 0 }) {
  const cmd = memLimitMb ? ['prlimit', `--as=${memLimitMb * 1024 * 1024}`, 'taskset', '-c', cpu, ...runtime, join(P, 'bot', 'bot.js')] : ['taskset', '-c', cpu, ...runtime, join(P, 'bot', 'bot.js')]
  const tSpawn = performance.now()
  const child = spawn(cmd[0], cmd.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] })
  let out = '', err = ''
  const waiters = []
  const lines = []
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (d) => {
    out += d
    let i
    while ((i = out.indexOf('\n')) >= 0) { const l = out.slice(0, i); out = out.slice(i + 1); const w = waiters.shift(); if (w) w(l); else lines.push(l) }
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (d) => { err += d })
  let exited = null
  child.on('exit', (code, sig) => { exited = { code, sig }; while (waiters.length) waiters.shift()(null) })
  const nextLine = (ms) => new Promise((res) => {
    if (lines.length) return res(lines.shift())
    if (exited) return res(null)
    let done = false
    const w = (l) => { if (done) return; done = true; clearTimeout(tm); res(l) }
    const tm = setTimeout(() => { if (done) return; done = true; const k = waiters.indexOf(w); if (k >= 0) waiters.splice(k, 1); res(undefined) }, ms)
    waiters.push(w)
  })
  const rss = () => { try { const s = readFileSync(`/proc/${child.pid}/status`, 'utf8'); return { rss: +/VmRSS:\s+(\d+)/.exec(s)[1] / 1024, hwm: +/VmHWM:\s+(\d+)/.exec(s)[1] / 1024 } } catch { return null } }

  // on-CPU time (ns precision) from /proc schedstat: main thread alone, and all threads of the process.
  // Wall latency on this shared machine is polluted by other jobs; CPU time is not.
  let tids = []
  const listTids = () => { try { tids = readdirSync(`/proc/${child.pid}/task`) } catch { tids = [] } }
  const runNs = (tid) => { try { return Number(readFileSync(`/proc/${child.pid}/task/${tid}/schedstat`, 'utf8').split(' ')[0]) } catch { return 0 } }
  const cpuMain = () => runNs(child.pid) / 1e6
  const cpuAll = () => { let t = 0; for (const tid of tids) t += runNs(tid); return t / 1e6 }
  child.stdin.write(JSON.stringify(hello) + '\n')
  const ready = await nextLine(25000)
  const readyMs = performance.now() - tSpawn
  listTids()
  const res = { label, readyMs, readyCpuMain: cpuMain(), readyCpuAll: cpuAll(), threads: tids.length, ready, cpuM: [], cpuA: [], top: [], lat: [], late: 0, missing: 0, invalid: 0, badLines: 0, wrongTick: 0, firstInvalid: [], mem: [], actions: [], slowTicks: [] }
  if (!ready) { res.fatal = 'no ready: ' + JSON.stringify(exited) + ' ' + err.slice(-500); try { child.kill('SIGKILL') } catch {} return res }
  res.mem.push({ n: 0, ...rss() })
  for (let n = 0; n < total; n++) {
    const obs = nextObs(n, res.lastAns)
    if (!obs) break
    const line = JSON.stringify(obs) + '\n'
    if (n % 200 === 0) listTids()
    const cm0 = cpuMain(), ca0 = cpuAll()
    const t0 = performance.now()
    child.stdin.write(line)
    let ans
    for (;;) {
      const l = await nextLine(timeoutMs)
      if (l === undefined) { res.missing++; ans = undefined; break }
      if (l === null) { res.fatal = `process exited at decision ${n} (tick ${obs.tick}): ${JSON.stringify(exited)}`; break }
      let a
      try { a = JSON.parse(l) } catch { res.badLines++; if (res.firstInvalid.length < 5) res.firstInvalid.push('bad line: ' + l.slice(0, 200)); continue }
      if (a.tick !== obs.tick) { res.wrongTick++; continue }
      ans = a; break
    }
    if (res.fatal) break
    const ms = performance.now() - t0
    const cm = cpuMain() - cm0, ca = cpuAll() - ca0
    res.cpuM.push(cm); res.cpuA.push(ca)
    if (res.top.length < 15 || ca > res.top[res.top.length - 1].ca) { res.top.push({ n, tick: obs.tick, ca, cm, ms, cubes: obs.self && obs.self.cubes, mechs: obs.mechs && obs.mechs.length }); res.top.sort((x, y) => y.ca - x.ca); if (res.top.length > 15) res.top.length = 15 }
    res.lat.push(ms)
    if (ms > budgetMs) res.late++
    if (ms > 20 && res.slowTicks.length < 40) res.slowTicks.push({ n, tick: obs.tick, ms: +ms.toFixed(1), cubes: obs.self && obs.self.cubes, mechs: obs.mechs && obs.mechs.length })
    res.lastAns = ans || null
    if (ans) {
      const bad = validateAction(ans, obs.tick)
      if (bad.length) { res.invalid++; if (res.firstInvalid.length < 5) res.firstInvalid.push(`tick ${obs.tick}: ${bad.join('; ')} :: ${JSON.stringify(ans).slice(0, 300)}`) }
      if (actionsFile) res.actions.push(JSON.stringify(ans))
    } else if (actionsFile) res.actions.push('MISSING')
    if ((n + 1) % 500 === 0) res.mem.push({ n: n + 1, ...rss() })
  }
  res.mem.push({ n: res.lat.length, ...rss() })
  if (!res.fatal) {
    child.stdin.write(JSON.stringify({ type: 'end', place: 1, kills: 0 }) + '\n')
    child.stdin.end()
    const tE = performance.now()
    while (!exited && performance.now() - tE < 3000) await new Promise((r) => setTimeout(r, 10))
    res.exit = exited ? exited : 'did not exit within 3 s'
  }
  if (!exited) try { child.kill('SIGKILL') } catch {}
  res.stderr = err
  if (actionsFile) writeFileSync(actionsFile, res.actions.join('\n') + '\n')
  return res
}

export function report(res) {
  const l = res.lat
  console.log(`== ${res.label}`)
  if (res.fatal) console.log('FATAL', res.fatal)
  console.log(`ready in ${res.readyMs.toFixed(0)} ms wall; CPU until ready: main thread ${res.readyCpuMain.toFixed(0)} ms, all ${res.threads} threads ${res.readyCpuAll.toFixed(0)} ms (${res.ready})`)
  const d = (a, name) => a.length && console.log(`${name}: mean ${(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3)} p50 ${pct(a, 0.5).toFixed(2)} p90 ${pct(a, 0.9).toFixed(2)} p99 ${pct(a, 0.99).toFixed(2)} p999 ${pct(a, 0.999).toFixed(2)} max ${Math.max(...a).toFixed(1)} ms | >15ms ${a.filter((v) => v > 15).length} >25ms ${a.filter((v) => v > 25).length} >50ms ${a.filter((v) => v > 50).length}`)
  d(res.cpuM, 'CPU per decision, main thread ')
  d(res.cpuA, 'CPU per decision, all threads ')
  if (res.top.length) console.log('top by all-thread CPU:', res.top.slice(0, 10).map((s) => `#${s.n}(tick ${s.tick}) all ${s.ca.toFixed(1)} main ${s.cm.toFixed(1)} wall ${s.ms.toFixed(1)} cubes=${s.cubes} mechs=${s.mechs}`).join(' | '))
  console.log('wall latency (polluted by other jobs on this machine):')
  if (l.length) console.log(`decisions ${l.length}: mean ${(l.reduce((s, v) => s + v, 0) / l.length).toFixed(3)} p50 ${pct(l, 0.5).toFixed(2)} p90 ${pct(l, 0.9).toFixed(2)} p99 ${pct(l, 0.99).toFixed(2)} p999 ${pct(l, 0.999).toFixed(2)} max ${Math.max(...l).toFixed(1)} ms | >15ms ${l.filter((v) => v > 15).length} >25ms ${l.filter((v) => v > 25).length} >50ms(late) ${res.late} missing ${res.missing} invalid ${res.invalid} badLines ${res.badLines} wrongTick ${res.wrongTick}`)
  if (res.firstInvalid.length) console.log('invalid:', res.firstInvalid.join('\n  '))
  if (res.slowTicks.length) console.log('ticks > 20 ms:', res.slowTicks.map((s) => `#${s.n}(tick ${s.tick}) ${s.ms}ms cubes=${s.cubes} mechs=${s.mechs}`).join(', '))
  console.log('memory MB (decision: rss/hwm):', res.mem.filter((m) => m.rss).map((m) => `${m.n}: ${m.rss.toFixed(0)}/${m.hwm.toFixed(0)}`).join('  '))
  console.log('exit', JSON.stringify(res.exit))
  const el = res.stderr.split('\n').filter((x) => /failed|uncaught|unhandled|slow tick|error/i.test(x))
  console.log(`stderr: ${res.stderr.split('\n').length} lines, ${el.length} error/slow lines`)
  for (const x of el.slice(0, 12)) console.log('   ' + x.slice(0, 300))
  const tail = res.stderr.trim().split('\n').slice(-2)
  for (const x of tail) console.log('   tail: ' + x.slice(0, 300))
}

if (import.meta.main) {
  const stream = arg('--stream', null)
  if (stream) {
    const lines = readFileSync(stream, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    const hello = { ...lines[0], map: { dir: ARENA, files: ['v2/world.json', 'v2/terrain.i16'] } }
    const obs = lines.filter((l) => l.type === 'obs')
    const repeat = Number(arg('--repeat', '1'))
    const span = obs[obs.length - 1].tick - obs[0].tick + 2
    const total = obs.length * repeat
    const res = await drive({
      hello, total, label: `stream ${stream} x${repeat}`, actionsFile: arg('--actions', null), memLimitMb: Number(arg('--as-mb', '0')),
      nextObs: (n) => { const r = (n / obs.length) | 0, o = obs[n % obs.length]; return r === 0 ? o : { ...o, tick: o.tick + r * span, t: +(o.t + r * span / 20).toFixed(2) } },
    })
    report(res)
  }
}
