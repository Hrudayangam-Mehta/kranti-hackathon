import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
const out = (...a) => console.error(...a)
out('uid', process.getuid(), 'gid', process.getgid(), 'groups', process.getgroups?.())
const st = readFileSync('/proc/self/status', 'utf8')
for (const k of ['CapInh', 'CapPrm', 'CapEff', 'CapBnd', 'NoNewPrivs', 'Threads']) out(st.split('\n').find((l) => l.startsWith(k)))
out('cwd', process.cwd(), 'HOME', process.env.HOME, 'env keys', Object.keys(process.env).sort().join(','))
for (const p of ['/bot/x.tmp', '/x.tmp', '/arena/x.tmp', '/tmp/x.tmp', '/nonexistent/x', '/dev/shm/x']) {
  try { writeFileSync(p, 'x'); out('WRITE OK  ', p) } catch (e) { out('write fail', p, e.code) }
}
try { writeFileSync('/tmp/big', Buffer.alloc(70 * 1024 * 1024)); out('70MB in /tmp OK (limit not enforced)') } catch (e) { out('70MB in /tmp fails:', e.code) }
try { out('/arena:', readdirSync('/arena'), readdirSync('/arena/v2')) } catch (e) { out('/arena read fail', e.code) }
try { const r = await fetch('http://1.1.1.1/', { signal: AbortSignal.timeout(1500) }); out('NETWORK OK', r.status) } catch (e) { out('network fail:', e.code || e.name, String(e.message).slice(0, 60)) }
out('cgroup', readFileSync('/proc/self/cgroup', 'utf8').split('\n').filter((l) => /cpu|memory|pids/.test(l)).join(' | '))
out('cpus seen', navigator.hardwareConcurrency)
