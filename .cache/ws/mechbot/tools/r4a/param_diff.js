// R4a: resolved PARAMS of snapshots/bot_r3a2 vs bot/lib for one SELECT (OVR): every key that differs or is new.
const S = '/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad'
const a = (await import(S + '/snapshots/bot_r3a2/lib/params.js')).resolveParams(JSON.parse(process.env.OLD || '{}'))
const b = (await import(S + '/mechbot/bot/lib/params.js')).resolveParams(JSON.parse(process.env.OVR || '{}'))
const out = { changed: [], added: [], removed: [] }
for (const k of Object.keys(b)) { if (k === 'selected') continue; if (!(k in a)) out.added.push(k); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.changed.push(`${k}: ${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])}`) }
for (const k of Object.keys(a)) if (!(k in b)) out.removed.push(k)
const offAdded = out.added.filter((k) => ['hunt50', 'h50Pulse', 'seekOn'].includes(k)).map((k) => `${k}=${b[k]}`)
console.log(JSON.stringify({ changed: out.changed, removed: out.removed, addedN: out.added.length, switches: offAdded, selectedNew: Object.keys(b.selected).filter((k) => !(k in a.selected)) }))
