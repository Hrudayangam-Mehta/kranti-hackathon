use crate::csv;

use super::keys;

pub const TAG: u64 = 1 << 62;
pub const FKEY: u64 = 1 << 61;
pub const MASK: u64 = (1 << 40) - 1;
pub const ALIASES: u64 = 16;
pub const ODD: u64 = 0xf;
const M1: u64 = 0x9E37_79B9_7F4B;
const M2: u64 = 0xD6E8_FEB8_6659;
const IM1: u64 = inverse(M1);
const IM2: u64 = inverse(M2);
const INVALID: u16 = 0x8000;
const U_CODE: u64 = keys::CODE[b'u' as usize] as u64;
pub const E_CODE: u64 = keys::CODE[b'e' as usize] as u64;
const ZERO_CODE: u64 = keys::CODE[b'0' as usize] as u64;
const WHALES: u64 = 5;
const SLOTS: u64 = 512;

const fn inverse(m: u64) -> u64 {
    let mut inv = m;
    let mut i = 0;
    while i < 6 {
        inv = inv.wrapping_mul(2u64.wrapping_sub(m.wrapping_mul(inv)));
        i += 1;
    }
    inv & MASK
}

const fn digit(code: u8) -> u16 {
    let c = code as usize;
    if c >= keys::CODE[b'0' as usize] as usize && c <= keys::CODE[b'9' as usize] as usize {
        (c - keys::CODE[b'0' as usize] as usize) as u16
    } else if c >= keys::CODE[b'a' as usize] as usize && c <= keys::CODE[b'z' as usize] as usize {
        (c - keys::CODE[b'a' as usize] as usize + 10) as u16
    } else {
        INVALID
    }
}

const fn pair_table() -> [u16; 4096] {
    let mut table = [INVALID; 4096];
    let mut i = 0;
    while i < 4096 {
        let hi = (i >> 6) as u8;
        let lo = (i & 63) as u8;
        table[i] = if lo == 0 {
            if hi == 0 {
                0
            } else {
                INVALID
            }
        } else if hi == 0 {
            digit(lo)
        } else {
            let (h, l) = (digit(hi), digit(lo));
            if h == INVALID || l == INVALID {
                INVALID
            } else {
                h * 36 + l
            }
        };
        i += 1;
    }
    table
}

static PAIRS: [u16; 4096] = pair_table();

const fn digit_code_table() -> [u8; 36] {
    let digits = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut out = [0u8; 36];
    let mut i = 0;
    while i < 36 {
        out[i] = keys::CODE[digits[i] as usize];
        i += 1;
    }
    out
}

static DIGIT_CODE: [u8; 36] = digit_code_table();

#[inline(always)]
pub fn mixed_value(packed: u64, len: usize) -> Option<u64> {
    mixed_value_code(packed, len, U_CODE)
}

#[inline(always)]
pub fn mixed_value_code(packed: u64, len: usize, code: u64) -> Option<u64> {
    if !(2..=9).contains(&len) || packed >> 54 != code {
        return None;
    }
    let digits = len - 1;
    if digits > 1 && (packed >> 48) & 63 == ZERO_CODE {
        return None;
    }
    let r = (packed >> (60 - 6 * len)) & ((1u64 << (6 * digits)) - 1);
    let t0 = PAIRS[(r & 4095) as usize];
    let t1 = PAIRS[((r >> 12) & 4095) as usize];
    let t2 = PAIRS[((r >> 24) & 4095) as usize];
    let t3 = PAIRS[((r >> 36) & 4095) as usize];
    if (t0 | t1 | t2 | t3) & INVALID != 0 {
        return None;
    }
    let x = ((u64::from(t3) * 1296 + u64::from(t2)) * 1296 + u64::from(t1)) * 1296 + u64::from(t0);
    (x <= MASK).then_some(x)
}

#[inline(always)]
pub fn scramble(value: u64, key: u64) -> u64 {
    let mut m = ((value & MASK).wrapping_mul(M1) ^ key) & MASK;
    m ^= m >> 17;
    m.wrapping_mul(M2) & MASK
}

#[inline(always)]
fn unshift(z: u64) -> u64 {
    z ^ (z >> 17) ^ (z >> 34)
}

#[inline(always)]
pub fn unscramble(x: u64, key: u64) -> u64 {
    let y = unshift(x.wrapping_mul(IM2) & MASK) ^ (key & MASK);
    y.wrapping_mul(IM1) & MASK
}

pub fn key_for(x: u64, value: u64) -> u64 {
    (unshift(x.wrapping_mul(IM2) & MASK) ^ (value.wrapping_mul(M1) & MASK)) & MASK
}

pub fn packed_of_mixed(x: u64) -> u64 {
    let mut digits = [0u8; 13];
    let mut n = 0;
    let mut rest = x;
    loop {
        digits[n] = DIGIT_CODE[(rest % 36) as usize];
        n += 1;
        rest /= 36;
        if rest == 0 {
            break;
        }
    }
    let mut packed = U_CODE << 54;
    for i in 0..n {
        packed |= u64::from(digits[n - 1 - i]) << (48 - 6 * i);
    }
    packed
}

#[derive(Clone, Copy)]
pub struct Decoder {
    pub key: u64,
    pub gcap: u64,
    pub twist: bool,
}

impl Decoder {
    #[inline(always)]
    fn turn(&self, v: u64) -> u64 {
        if self.twist && ((v >> 9) ^ v) & 1 == 1 {
            v ^ 0x201
        } else {
            v
        }
    }

    #[cfg(test)]
    pub fn value(&self, packed: u64, len: usize) -> Option<u64> {
        mixed_value(packed, len).map(|x| self.of_mixed(x))
    }

    #[inline(always)]
    pub fn of_mixed(&self, x: u64) -> u64 {
        self.turn(unscramble(x, self.key))
    }

    #[inline(always)]
    pub fn lane_of_mixed(&self, x: u64) -> Option<u64> {
        let v = self.of_mixed(x);
        self.in_lane(v).then_some(TAG | v)
    }

    #[inline(always)]
    pub fn in_lane(&self, v: u64) -> bool {
        (v >> 9) < self.gcap && (v & (SLOTS - 1)) < ALIASES
    }

    pub fn packed_of(&self, v: u64) -> u64 {
        packed_of_mixed(scramble(self.turn(v), self.key))
    }
}

#[inline(always)]
pub fn find(word: u64, mut a: u64) -> u64 {
    loop {
        let step = (word >> (4 * a)) & 15;
        if step == 0 || a == 0 {
            return a;
        }
        a -= step;
    }
}

pub fn union(word: u64, a: u64, b: u64) -> u64 {
    let ra = find(word, a);
    let rb = find(word, b);
    if ra == rb {
        return word;
    }
    let (low, high) = if ra < rb { (ra, rb) } else { (rb, ra) };
    (word & !(15u64 << (4 * high))) | (high - low) << (4 * high)
}

pub fn compress(word: u64) -> u64 {
    let mut out = word & 15;
    for a in 1..ALIASES {
        out |= (a - find(word, a)) << (4 * a);
    }
    out
}

#[inline(always)]
pub fn rep(word: u64, a: u64) -> u64 {
    a - ((word >> (4 * a)) & 15)
}

pub fn person_name(decoder: &Decoder, info: &[u64], fkey: u64) -> u64 {
    let g = (fkey & !FKEY) >> 4;
    let r = fkey & 15;
    let word = info[g as usize];
    let mut best = u64::MAX;
    for a in 0..ALIASES {
        if rep(word, a) == r {
            best = best.min(decoder.packed_of(g * SLOTS + a));
        }
    }
    best
}

fn unquoted(field: &[u8]) -> &[u8] {
    match field {
        [b'"', inner @ .., b'"'] => inner,
        _ => field,
    }
}

fn leading_fields<const N: usize>(line: &[u8]) -> Option<[&[u8]; N]> {
    let mut out = [&line[..0]; N];
    let mut rest = line;
    for slot in out.iter_mut().take(N - 1) {
        let comma = rest.iter().position(|&b| b == b',')?;
        *slot = unquoted(&rest[..comma]);
        rest = &rest[comma + 1..];
    }
    let end = rest.iter().position(|&b| b == b',').unwrap_or(rest.len());
    out[N - 1] = unquoted(&rest[..end]);
    Some(out)
}

fn sample_lines<const N: usize>(files: &[&[u8]], per_file: usize, budget: usize, mut on: impl FnMut(&[&[u8]; N])) {
    let mut taken = 0;
    for file in files.iter().filter(|f| !f.is_empty()).take(64) {
        for line in csv::rows(file).take(per_file.min(budget - taken)) {
            taken += 1;
            if let Some(fields) = leading_fields::<N>(line) {
                on(&fields);
            }
        }
        if taken >= budget {
            break;
        }
    }
}

fn mixed_of(field: &[u8]) -> Option<u64> {
    keys::pack(field).and_then(|packed| mixed_value(packed, field.len()))
}

fn mixed_of_code(field: &[u8], code: u64) -> Option<u64> {
    keys::pack(field).and_then(|packed| mixed_value_code(packed, field.len(), code))
}

type EventSample = (u64, Option<u64>, Option<i64>);

fn ordered_events(samples: &[EventSample], key: u64, ncap: u64) -> bool {
    let inside = samples.iter().filter(|s| unscramble(s.0, key) < ncap).count();
    if inside * 100 < samples.len() * 99 {
        return false;
    }
    let mut rows: Vec<(u64, u64, i64)> = samples
        .iter()
        .filter_map(|&(x, v, t)| Some((unscramble(x, key), v? >> 9, t?)))
        .collect();
    rows.sort_unstable();
    let mut pairs = 0usize;
    let mut good = 0usize;
    for w in rows.windows(2) {
        if w[0].0 == w[1].0 {
            continue;
        }
        pairs += 1;
        good += usize::from(w[0].1 < w[1].1 || (w[0].1 == w[1].1 && w[0].2 <= w[1].2));
    }
    pairs >= 1000 && good * 100 >= pairs * 99
}

pub fn recover_events(
    event_files: &[&[u8]],
    decoder: &Decoder,
    calendar: &super::ts::Calendar,
    window: (i64, i64),
    ncap: u64,
) -> Result<u64, String> {
    let mut samples: Vec<EventSample> = Vec::new();
    sample_lines::<3>(event_files, 1000, 6000, |f| {
        let Some(x) = mixed_of_code(f[0], E_CODE) else { return };
        let v = mixed_of(f[1]).map(|ux| decoder.of_mixed(ux));
        let mut buf = [0u8; 64];
        let n = f[2].len();
        let t = if n <= 32 {
            buf[..n].copy_from_slice(f[2]);
            unsafe { calendar.parse(&buf[..n]) }.filter(|t| window.0 <= *t && *t < window.1)
        } else {
            None
        };
        samples.push((x, v, t));
    });
    let mut zero: Vec<(i64, u64)> = samples
        .iter()
        .filter_map(|&(x, v, t)| match (v, t) {
            (Some(v), Some(t)) if v >> 9 == 0 => Some((t, x)),
            _ => None,
        })
        .collect();
    zero.sort_unstable();
    zero.dedup_by_key(|z| z.1);
    if samples.len() < 2000 || zero.len() < 12 {
        return Err(format!("event sample too small ({} IDs, {} of person 0)", samples.len(), zero.len()));
    }
    let cap0 = (ncap / 16).max(1 << 16);
    let limit = cap0.min(1 << 22);
    let checks: Vec<u64> = zero.iter().skip(zero.len() / 2).take(4).map(|z| z.1).collect();
    for anchor in zero.iter().take(3) {
        let mut found = None;
        for n in 0..limit {
            let key = key_for(anchor.1, n);
            let mut misses = 0;
            for &c in &checks {
                if unscramble(c, key) >= cap0 {
                    misses += 1;
                    if misses > 1 {
                        break;
                    }
                }
            }
            if misses <= 1 {
                found = Some(key);
                break;
            }
        }
        if let Some(key) = found {
            if ordered_events(&samples, key, ncap) {
                return Ok(key);
            }
        }
    }
    Err("no event key candidate passed".into())
}

pub fn recover(event_files: &[&[u8]], link_files: &[&[u8]], gcap: u64) -> Result<u64, String> {
    let mut users: Vec<u64> = Vec::new();
    sample_lines::<2>(event_files, 1000, 6000, |f| {
        if let Some(x) = mixed_of(f[1]) {
            users.push(x);
        }
    });
    let mut links: Vec<(u64, u64)> = Vec::new();
    sample_lines::<2>(link_files, 500, 2500, |f| {
        if let (Some(a), Some(b)) = (mixed_of(f[0]), mixed_of(f[1])) {
            links.push((a, b));
        }
    });
    if users.len() < 2000 || links.len() < 200 {
        return Err(format!("sample too small ({} user IDs, {} link lines)", users.len(), links.len()));
    }
    let mut sorted = users.clone();
    sorted.sort_unstable();
    let mut counts: Vec<(u32, u64)> = Vec::new();
    let mut i = 0;
    while i < sorted.len() {
        let mut j = i + 1;
        while j < sorted.len() && sorted[j] == sorted[i] {
            j += 1;
        }
        counts.push(((j - i) as u32, sorted[i]));
        i = j;
    }
    counts.sort_unstable_by(|a, b| b.cmp(a));
    let mut candidates: Vec<u64> = Vec::new();
    for &(_, x) in counts.iter().take(8) {
        for whale in 0..WHALES {
            candidates.push(key_for(x, whale * SLOTS));
        }
    }
    candidates.sort_unstable();
    candidates.dedup();
    let passing: Vec<u64> = candidates
        .into_iter()
        .filter(|&key| users.iter().take(100).filter(|&&x| unscramble(x, key) >> 9 < gcap).count() >= 90)
        .filter(|&key| {
            let inside = users.iter().filter(|&&x| unscramble(x, key) >> 9 < gcap).count();
            let same = links
                .iter()
                .filter(|&&(a, b)| {
                    let (ga, gb) = (unscramble(a, key) >> 9, unscramble(b, key) >> 9);
                    ga == gb && ga < gcap
                })
                .count();
            inside * 100 >= users.len() * 99 && same * 10 >= links.len() * 9
        })
        .collect();
    match passing.as_slice() {
        [key] => Ok(*key),
        [] => Err("no key candidate passed".into()),
        _ => Err(format!("{} key candidates passed", passing.len())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base36(value: u64) -> Vec<u8> {
        const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
        let mut out = Vec::new();
        let mut rest = value;
        loop {
            out.push(DIGITS[(rest % 36) as usize]);
            rest /= 36;
            if rest == 0 {
                break;
            }
        }
        out.reverse();
        out
    }

    fn id_of(value: u64, key: u64) -> Vec<u8> {
        let mut id = b"u".to_vec();
        id.extend_from_slice(&base36(scramble(value, key)));
        id
    }

    fn decode(d: &Decoder, id: &[u8]) -> Option<u64> {
        keys::pack(id).and_then(|p| d.value(p, id.len()))
    }

    #[test]
    fn inverses() {
        assert_eq!(M1.wrapping_mul(IM1) & MASK, 1);
        assert_eq!(M2.wrapping_mul(IM2) & MASK, 1);
        let mut state = 99u64;
        for _ in 0..20000 {
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let v = state >> 24;
            let key = state.rotate_left(17);
            assert_eq!(unscramble(scramble(v, key), key), v & MASK);
            assert_eq!(key_for(scramble(v & MASK, key), v & MASK), key & MASK);
        }
    }

    #[test]
    fn canonical_roundtrip() {
        let mut state = 7u64;
        for twist in [false, true] {
            let d = Decoder { key: 0x1234_5678_9abc_def1, gcap: 1 << 20, twist };
            for i in 0..50000u64 {
                state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
                let v = match i % 4 {
                    0 => i,
                    1 => (state >> 20) & MASK,
                    2 => (1 << 39) + (i % 7),
                    _ => (state >> 30) % 4096,
                };
                let id = id_of(d.turn(v), d.key);
                assert_eq!(decode(&d, &id), Some(v), "{}", String::from_utf8_lossy(&id));
                assert_eq!(d.packed_of(v), keys::pack(&id).unwrap());
                let x = scramble(d.turn(v), d.key);
                assert_eq!(mixed_value(keys::pack(&id).unwrap(), id.len()), Some(x));
            }
        }
        for x in [0u64, 1, 35, 36, 1295, 1296, MASK, MASK - 1, 36u64.pow(7), 36u64.pow(7) - 1] {
            let mut id = b"u".to_vec();
            id.extend_from_slice(&base36(x));
            assert_eq!(mixed_of(&id), Some(x));
            assert_eq!(packed_of_mixed(x), keys::pack(&id).unwrap());
        }
    }

    #[test]
    fn non_canonical() {
        for id in [
            &b"u"[..], b"", b"u00", b"u01", b"U1", b"uA", b"u_", b"x12", b"e12", b"u1 ", b" u1", b"u-1",
            b"u123456789", b"uzzzzzzzz", b"uuuuuuuuuu", b"u1\r",
        ] {
            assert_eq!(mixed_of(id), None, "{}", String::from_utf8_lossy(id));
        }
        assert_eq!(mixed_of(b"u0"), Some(0));
        assert_eq!(mixed_of(b"u10"), Some(36));
        let max = base36(MASK);
        let mut id = b"u".to_vec();
        id.extend_from_slice(&max);
        assert_eq!(mixed_of(&id), Some(MASK));
        let mut over = b"u".to_vec();
        over.extend_from_slice(&base36(MASK + 1));
        assert_eq!(mixed_of(&over), None);
    }

    #[test]
    fn alias_union_find() {
        let mut w = 0u64;
        w = union(w, 3, 5);
        w = union(w, 5, 9);
        w = union(w, 2, 9);
        w = union(w, 12, 13);
        w = union(w, 7, 7);
        let w = compress(w);
        for a in [2, 3, 5, 9] {
            assert_eq!(rep(w, a), 2);
        }
        assert_eq!(rep(w, 12), 12);
        assert_eq!(rep(w, 13), 12);
        assert_eq!(rep(w, 7), 7);
        assert_eq!(rep(w, 0), 0);
        assert_eq!(rep(w, 15), 15);
        let mut v = 0u64;
        for a in (1..16).rev() {
            v = union(v, a, a - 1);
        }
        let v = compress(v);
        for a in 0..16 {
            assert_eq!(rep(v, a), 0);
        }
        assert_eq!(v & 15, 0);
    }

    #[test]
    fn recovers_key() {
        let key = 0x00ab_cdef_0123_4567u64;
        let gcap = 4000;
        let mut files: Vec<Vec<u8>> = Vec::new();
        let mut state = 5u64;
        for i in 0..20000u64 {
            if i % 2000 == 0 {
                files.push(b"event_id,user_id,ts,ingest_ts,event_type,product_id,price_cents\n".to_vec());
            }
            let events = files.last_mut().unwrap();
            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let g = if i % 10 < 4 { i % 5 } else { 5 + (state >> 33) % 1500 };
            let a = if i % 2 == 0 { 0 } else { (state >> 50) % 3 };
            events.extend_from_slice(b"e1,");
            events.extend_from_slice(&id_of(g * 512 + a, key));
            events.extend_from_slice(b",1,2,view,p1,\n");
        }
        let mut links = b"user_id_a,user_id_b\n".to_vec();
        for g in 0..1500u64 {
            links.extend_from_slice(&id_of(g * 512 + 1, key));
            links.push(b',');
            links.extend_from_slice(&id_of(g * 512, key));
            links.push(b'\n');
        }
        let ev: Vec<&[u8]> = files.iter().map(|f| f.as_slice()).collect();
        let li: Vec<&[u8]> = vec![&links];
        assert_eq!(recover(&ev, &li, gcap), Ok(key & MASK));
        assert!(recover(&ev, &li[..0], gcap).is_err());
        assert!(recover(&ev[..1], &li, gcap).is_err());
        assert!(recover(&ev, &li, 3).is_err());
    }
}
