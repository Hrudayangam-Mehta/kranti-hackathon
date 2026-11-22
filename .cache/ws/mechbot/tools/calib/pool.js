#!/usr/bin/env bun
// DEV ONLY: runs a list of simulator matches on a few persistent workers.
//   bun tools/calib/pool.js --jobs-file jobs.jsonl --out results.jsonl [--workers 3] [--log-dir DIR] [--job-timeout-s 240]
// jobs.jsonl: one job per line (see worker.js). Results are appended to --out as they finish (a rerun skips the
// job ids already in the file). A worker that stops answering is killed and restarted; its job is recorded as failed.
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const arg = (name, def) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def }
const jobsFile = arg('--jobs-file'), out = arg('--out'), nWorkers = parseInt(arg('--workers', '3'), 10)
const logDir = arg('--log-dir', null), jobTimeout = parseFloat(arg('--job-timeout-s', '240')) * 1000
if (!jobsFile || !out) { console.error('usage: pool.js --jobs-file F --out F [--workers 3]'); process.exit(2) }

const done = new Set()
if (existsSync(out)) for (const l of readFileSync(out, 'utf8').split('\n')) if (l.trim()) { try { done.add(JSON.parse(l).id) } catch { /* partial line */ } }
const queue = readFileSync(jobsFile, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((j) => !done.has(j.id))
const total = queue.length
let finished = 0, failed = 0
const t0 = Date.now()
console.error(`pool: ${total} jobs to run (${done.size} already done), ${nWorkers} workers`)
if (!total) process.exit(0)

function startWorker(k) {
  const w = { k, child: null, job: null, timer: null, buf: '' }
  const launch = () => {
    const env = { ...process.env }
    if (logDir) env.CALIB_LOG_DIR = logDir
    w.child = spawn(process.execPath, [join(HERE, 'worker.js')], { stdio: ['pipe', 'pipe', 'inherit'], env })
    w.buf = ''
    w.child.stdout.setEncoding('utf8')
    w.child.stdout.on('data', (d) => {
      w.buf += d
      let i
      while ((i = w.buf.indexOf('\n')) >= 0) {
        const l = w.buf.slice(0, i); w.buf = w.buf.slice(i + 1)
        if (l.startsWith('@@R ')) finish(w, JSON.parse(l.slice(4)))
      }
    })
    w.child.on('exit', () => { if (w.job) { const j = w.job; finish(w, { id: j.id, bot: j.tag || j.bot, seed: j.seed, failed: 'worker exited' }, true) } })
  }
  w.launch = launch
  launch()
  return w
}
function finish(w, rec, dead) {
  if (!w.job) return
  clearTimeout(w.timer)
  w.job = null
  appendFileSync(out, JSON.stringify(rec) + '\n')
  finished++
  if (rec.failed) { failed++; console.error(`pool: job ${rec.id} failed: ${rec.failed}`) }
  if (finished % 50 === 0 || finished === total) console.error(`pool: ${finished}/${total} done, ${failed} failed, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  if (dead) w.launch()
  next(w)
}
function next(w) {
  const job = queue.shift()
  if (!job) { try { w.child.stdin.end() } catch { /* gone */ } ; if (finished === total) setTimeout(() => process.exit(0), 300); return }
  w.job = job
  w.timer = setTimeout(() => { console.error(`pool: job ${job.id} timed out, restarting worker ${w.k}`); try { w.child.kill('SIGKILL') } catch { /* gone */ } }, jobTimeout)
  w.child.stdin.write(JSON.stringify(job) + '\n')
}
for (let k = 0; k < Math.min(nWorkers, total); k++) next(startWorker(k))
