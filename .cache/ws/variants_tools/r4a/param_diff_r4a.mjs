const S = process.argv[2], P = S + '/mechbot'
const load = async (p) => (await import(p + '/lib/params.js'))
const ser = (v) => JSON.stringify(v)
const diff = (a, b) => { const ks = new Set([...Object.keys(a), ...Object.keys(b)]); const o = []; for (const k of ks) if (k !== 'selected' && ser(a[k]) !== ser(b[k])) o.push(k); return o }
const base = await load(P + '/bot')
const V4 = (await load(S + '/variants/V4/bot')).resolveParams({})
const v1 = base.resolveParams({})
const v4now = base.resolveParams({ select: { retreat: 'd3' } })
console.log('bot/ default vs bot/ V1 SELECT written out: diffs', diff(v1, base.resolveParams({ select: { retreat: 'pulse', hunt: 'off', seek: 'off' } })).length)
const d4 = diff(v4now, V4)
console.log('bot/ + retreat d3 (hunt off) vs R3a2 V4 variant: changed', d4.filter((k) => k in V4).length, 'added', d4.filter((k) => !(k in V4)).length)
for (const [id, hunt] of [['H', 'h50'], ['HL', 'lite']]) {
  const p = (await load(S + '/variants/' + id + '/bot')).resolveParams({})
  const ref = base.resolveParams({ select: { retreat: 'd3', hunt } })
  const dv = diff(p, v4now)
  console.log(id, 'default vs bot/ select {retreat d3, hunt ' + hunt + '}:', diff(p, ref).length, 'diffs | vs bot/ V4 SELECT:', dv.map((k) => `${k}: ${ser(v4now[k])} -> ${ser(p[k])}`).join('; '), '| salt', p.salt, '| h50PulseGapS', p.h50PulseGapS, '| pulseRetreat', p.pulseRetreat)
}
