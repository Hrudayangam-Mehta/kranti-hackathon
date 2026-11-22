import { World } from './mechbot/bot/lib/world.js'
import { Nav } from './mechbot/bot/lib/nav.js'
const P = new URL('./mechbot/', import.meta.url).pathname
const w = World.loadSync(P + 'kit/arena')
for (let r = 0; r < 4; r++) { const t = performance.now(); const nav = new Nav(w); console.log('nav build', (performance.now() - t).toFixed(1)) }
// phase timing by monkeypatching: time ground calls
let t = performance.now(); let acc = 0
for (let k = 0; k < 1700000; k++) acc += w.ground(-500 + (k % 1000), -300 + ((k / 1000) | 0) * 0.3)
console.log('1.7M ground calls', (performance.now() - t).toFixed(1), 'ms')
