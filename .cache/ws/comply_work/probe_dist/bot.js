import fs from 'fs'; import os from 'os'; import net from 'net'
const r = { uid: process.getuid(), gid: process.getgid(), groups: process.getgroups(), cwd: process.cwd(), home: process.env.HOME ?? null, homedir: (() => { try { return os.homedir() } catch (e) { return 'ERR ' + e.code } })(), cpus: os.cpus().length, arena: fs.existsSync('/arena/v2/world.json'), writes: {} }
for (const p of ['/x', '/bot/x', '/usr/x', '/etc/x', '/tmp/x', '/dev/shm/x', '/arena/x']) { try { fs.writeFileSync(p, 'x'); r.writes[p] = 'OK'; fs.unlinkSync(p) } catch (e) { r.writes[p] = e.code } }
try { fs.writeFileSync('/tmp/big', Buffer.alloc(70 * 1024 * 1024)); r.tmp70mb = 'OK' } catch (e) { r.tmp70mb = e.code } finally { try { fs.unlinkSync('/tmp/big') } catch {} }
const s = net.connect({ host: '1.1.1.1', port: 443 }); s.on('connect', () => { r.net = 'CONNECTED'; done() }); s.on('error', (e) => { r.net = e.code; done() })
setTimeout(() => { r.net = r.net || 'TIMEOUT'; done() }, 3000)
let fin = false; function done() { if (fin) return; fin = true; console.error(JSON.stringify(r)); process.exit(0) }
