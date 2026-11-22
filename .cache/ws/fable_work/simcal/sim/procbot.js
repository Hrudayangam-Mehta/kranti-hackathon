// DEV ONLY: runs an external bot process for the simulator and speaks protocol mechfight/1 with it over
// stdin / stdout (JSON lines), the way the match server does:
//   hello -> wait for {"type":"ready"} (hello budget, 20 s)
//   every decision: one obs line -> wait for the answer whose `tick` matches
//   no answer in time = the mech coasts (act() resolves to null); answers to older ticks are dropped
//   end -> the process is given a moment to exit, then killed
// The command is started exactly as given (through the shell); stderr goes to a per-bot log file.
// Locally the answer timeout defaults to 200 ms so CPU contention between parallel matches does not turn into
// missed decisions; answers slower than the real 50 ms budget are counted in `lates`.

import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export class ProcBot {
  /**
   * opts: { name, timeoutMs = 200, lateMs = 50, helloTimeoutMs = 20000, logFile, cwd, env }
   */
  constructor(command, opts = {}) {
    this.command = command
    this.name = opts.name || command.split(/\s+/).slice(-1)[0]
    this.async = true
    this.timeoutMs = opts.timeoutMs ?? 200
    this.lateMs = opts.lateMs ?? 50
    this.helloTimeoutMs = opts.helloTimeoutMs ?? 20000
    this.logFile = opts.logFile || null
    this.cwd = opts.cwd; this.env = opts.env
    this.lates = 0; this.missed = 0; this.badLines = 0; this.answers = 0
    this.maxMs = 0; this.sumMs = 0
    this.exited = false; this.exitCode = null
    this._buf = ''
    this._want = null            // { tick, resolve, t0, timer }
    this._ready = null
    this.child = null
  }

  _start() {
    const child = spawn(this.command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'], cwd: this.cwd, env: this.env || process.env, detached: true })
    this.child = child
    if (this.logFile) {
      try { mkdirSync(dirname(this.logFile), { recursive: true }) } catch { /* exists */ }
      this._log = createWriteStream(this.logFile, { flags: 'w' })
      this._log.on('error', () => {})
      child.stderr.on('data', (d) => { try { this._log.write(d) } catch { /* ignore */ } })
    } else child.stderr.on('data', () => {})
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => this._onData(chunk))
    child.on('exit', (code) => { this.exited = true; this.exitCode = code; this._settle(null); if (this._ready) { this._ready(null); this._ready = null } })
    child.on('error', () => { this.exited = true; this._settle(null); if (this._ready) { this._ready(null); this._ready = null } })
    child.stdin.on('error', () => {})
  }

  _onData(chunk) {
    this._buf += chunk
    let i
    while ((i = this._buf.indexOf('\n')) >= 0) {
      const line = this._buf.slice(0, i)
      this._buf = this._buf.slice(i + 1)
      if (!line.trim()) continue
      if (line.length > 65536) { this.badLines++; continue }
      let msg
      try { msg = JSON.parse(line) } catch { this.badLines++; continue }
      if (!msg || typeof msg !== 'object') { this.badLines++; continue }
      if (msg.type === 'ready') { if (this._ready) { const r = this._ready; this._ready = null; r(msg) } continue }
      const w = this._want
      if (w && msg.tick === w.tick) this._settle(msg)     // anything else (old tick, unknown) is dropped
    }
  }

  _settle(msg) {
    const w = this._want
    if (!w) return
    this._want = null
    clearTimeout(w.timer)
    const ms = performance.now() - w.t0
    if (msg) { this.answers++; this.sumMs += ms; if (ms > this.maxMs) this.maxMs = ms; if (ms > this.lateMs) this.lates++ } else { this.missed++; this.lates++ }
    w.resolve(msg)
  }

  _write(obj) {
    if (this.exited || !this.child) return false
    try { this.child.stdin.write(JSON.stringify(obj) + '\n'); return true } catch { return false }
  }

  hello(h) {
    this._start()
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this._ready = null; resolve(null) }, this.helloTimeoutMs)
      this._ready = (msg) => {
        clearTimeout(timer)
        if (msg && typeof msg.name === 'string') this.name = msg.name.replace(/[\x00-\x1f]/g, '').slice(0, 32) || this.name
        resolve(msg)
      }
      this._write(h)
    })
  }

  /** Sends the observation; resolves to the matching answer, or null when none came in time. */
  act(obs) {
    return new Promise((resolve) => {
      if (this.exited) { this.missed++; resolve(null); return }
      const w = { tick: obs.tick, resolve, t0: performance.now(), timer: null }
      w.timer = setTimeout(() => { if (this._want === w) this._settle(null) }, this.timeoutMs)
      this._want = w
      if (!this._write(obs)) this._settle(null)
    })
  }

  end(msg) {
    return new Promise((resolve) => {
      const child = this.child
      if (!child || this.exited) { this._close(); resolve(); return }
      const kill = () => {
        try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch { /* gone */ } }
      }
      const timer = setTimeout(() => { kill(); this._close(); resolve() }, 400)
      child.once('exit', () => { clearTimeout(timer); kill(); this._close(); resolve() })
      this._write(msg)
      try { child.stdin.end() } catch { /* ignore */ }
    })
  }

  _close() { if (this._log) { try { this._log.end() } catch { /* ignore */ } this._log = null } }
}
