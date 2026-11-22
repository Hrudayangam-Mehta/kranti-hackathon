// Deterministic random numbers for the dev simulator (xoshiro128** state, splitmix-style seeding).
// makeRng(seed) returns a function () -> float in [0,1) with helpers:
//   .int(n)        integer in [0,n)
//   .range(a,b)    float in [a,b)
//   .gauss()       standard normal (polar Box-Muller, one spare cached)
//   .pick(arr)     random element
//   .fork(salt)    independent stream derived from this seed and a salt (does not advance this stream)

function mix32(h) {
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad)
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97)
  return (h ^ (h >>> 15)) >>> 0
}

export function hashSeed(a, b = 0) {
  return mix32((mix32(a >>> 0) + Math.imul(b >>> 0, 0x9e3779b1) + 0x7f4a7c15) >>> 0)
}

export function makeRng(seed) {
  const base = seed >>> 0
  let s0 = mix32(base + 0x9e3779b9), s1 = mix32(s0 + 0x9e3779b9), s2 = mix32(s1 + 0x9e3779b9), s3 = mix32(s2 + 0x9e3779b9)
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1
  const next = () => {
    const r = Math.imul(s1, 5)
    const out = Math.imul((r << 7) | (r >>> 25), 9) >>> 0
    const t = s1 << 9
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t
    s3 = (s3 << 11) | (s3 >>> 21)
    return out
  }
  const f = () => next() / 4294967296
  let spare = null
  f.int = (n) => Math.floor(f() * n)
  f.range = (a, b) => a + (b - a) * f()
  f.gauss = () => {
    if (spare !== null) { const v = spare; spare = null; return v }
    let u, v, s
    do { u = 2 * f() - 1; v = 2 * f() - 1; s = u * u + v * v } while (s >= 1 || s === 0)
    const k = Math.sqrt(-2 * Math.log(s) / s)
    spare = v * k
    return u * k
  }
  f.pick = (arr) => arr[Math.floor(f() * arr.length)]
  f.fork = (salt) => makeRng(hashSeed(base, salt))
  f.seed = base
  return f
}
