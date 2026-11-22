// Lists, for every official build folder, its resolved brain params as a diff against the 5.38 base (FNV_s1) and whether its code is the same.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const V = process.argv[2], base = 'FNV_s1'
const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
const load = async (n) => (await import(`${V}/${n}/bot/lib/params.js`)).resolveParams({})
const codeSig = (n) => readdirSync(`${V}/${n}/bot/lib`).filter((f) => f.endsWith('.js') && f !== 'params.js').sort().map((f) => f + ':' + h(`${V}/${n}/bot/lib/${f}`).slice(0, 8)).join(',') + '|' + h(`${V}/${n}/bot/bot.js`).slice(0, 8)
const P0 = await load(base), sig0 = codeSig(base), out = []
for (const n of readdirSync(V).sort()) {
  if (!existsSync(`${V}/${n}/bot/lib/params.js`)) continue
  const P = await load(n), d = {}
  for (const k of new Set([...Object.keys(P), ...Object.keys(P0)])) if (k !== 'selected' && JSON.stringify(P[k]) !== JSON.stringify(P0[k])) d[k] = P[k] === undefined ? null : P[k]
  out.push({ name: n, sameCode: codeSig(n) === sig0, ov: d })
}
console.log(JSON.stringify(out))
