// Simulator module bot: the V4 brain exactly as bot/bot.js runs it when the map fails to load (world = nav = null).
import { createBrain as cb } from '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/variants/V4/bot/lib/brain.js'
export function createBrain(hello, ctx, ov) { return cb(hello, { world: null, nav: null, log: ctx && ctx.log }, ov) }
