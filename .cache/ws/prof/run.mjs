
import { World } from '../mechbot/bot/lib/world.js'
import { Nav } from './nav_prof.js'
const P = new URL('../mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
const t = performance.now(); const nav = new Nav(w); console.log('total', (performance.now()-t).toFixed(1))
console.log(globalThis.__prof.map(p=>p.join(' ')).join(' | '))
