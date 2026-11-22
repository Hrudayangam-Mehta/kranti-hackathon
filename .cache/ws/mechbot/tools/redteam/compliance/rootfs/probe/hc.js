import os from 'node:os'
import { readFileSync } from 'node:fs'
const st = readFileSync('/proc/self/status', 'utf8')
console.error('hardwareConcurrency', navigator.hardwareConcurrency, 'os.cpus', os.cpus().length, 'availableParallelism', os.availableParallelism?.(), 'totalmem MB', Math.round(os.totalmem() / 1048576), 'constrained MB', process.constrainedMemory ? Math.round(process.constrainedMemory() / 1048576) : 'n/a', st.split('\n').find((l) => l.startsWith('Threads')))
