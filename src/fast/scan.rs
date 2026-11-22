#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::*;

use super::ident;
use super::keys;
use crate::csv;

pub const SLACK: usize = 16;
const PAD: usize = 64 + SLACK;
#[cfg(test)]
const SEGMENT: usize = 32 << 10;

pub trait Lines<const N: usize> {
    fn line(&mut self, fields: &[&[u8]; N]);
}

impl<const N: usize, F: FnMut(&[&[u8]; N])> Lines<N> for F {
    #[inline(always)]
    fn line(&mut self, fields: &[&[u8]; N]) {
        self(fields)
    }
}

pub trait Kernel {
    unsafe fn masks(p: *const u8) -> (u64, u64, u64);
    unsafe fn pack(p: *const u8, len: usize) -> Option<u64>;
    unsafe fn mixed(p: *const u8, len: usize) -> Option<u64>;
}

pub struct Scalar;

impl Kernel for Scalar {
    #[inline(always)]
    unsafe fn masks(p: *const u8) -> (u64, u64, u64) {
        let mut comma = 0u64;
        let mut nl = 0u64;
        let mut quote = 0u64;
        for i in 0..64 {
            let byte = *p.add(i);
            comma |= u64::from(byte == b',') << i;
            nl |= u64::from(byte == b'\n') << i;
            quote |= u64::from(byte == b'"') << i;
        }
        (comma, nl, quote)
    }

    #[inline(always)]
    unsafe fn pack(p: *const u8, len: usize) -> Option<u64> {
        keys::pack(std::slice::from_raw_parts(p, len))
    }

    #[inline(always)]
    unsafe fn mixed(p: *const u8, len: usize) -> Option<u64> {
        keys::pack(std::slice::from_raw_parts(p, len)).and_then(|k| ident::mixed_value(k, len))
    }
}

#[cfg(target_arch = "x86_64")]
pub struct Avx2;

#[cfg(target_arch = "x86_64")]
impl Kernel for Avx2 {
    #[inline(always)]
    unsafe fn masks(p: *const u8) -> (u64, u64, u64) {
        masks_avx2(p)
    }

    #[inline(always)]
    unsafe fn pack(p: *const u8, len: usize) -> Option<u64> {
        pack_avx2(p, len)
    }

    #[inline(always)]
    unsafe fn mixed(p: *const u8, len: usize) -> Option<u64> {
        mixed_avx2(p, len)
    }
}

const fn align_table() -> [[u8; 16]; 10] {
    let mut table = [[0x80u8; 16]; 10];
    let mut len = 2;
    while len < 10 {
        let mut j = 9 - len;
        while j < 8 {
            table[len][j] = (j + len - 8) as u8;
            j += 1;
        }
        len += 1;
    }
    table
}

static ALIGN: [[u8; 16]; 10] = align_table();

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[inline]
unsafe fn mixed_avx2(p: *const u8, len: usize) -> Option<u64> {
    if len.wrapping_sub(2) > 7 || *p != b'u' || (len > 2 && *p.add(1) == b'0') {
        return None;
    }
    let v = _mm_loadu_si128(p as *const __m128i);
    let iota = _mm_setr_epi8(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
    let inside = _mm_cmpgt_epi8(_mm_set1_epi8(len as i8), iota);
    let d = _mm_sub_epi8(v, _mm_set1_epi8(b'0' as i8));
    let is_d = _mm_cmpeq_epi8(_mm_min_epu8(d, _mm_set1_epi8(9)), d);
    let l = _mm_sub_epi8(v, _mm_set1_epi8(b'a' as i8));
    let is_l = _mm_cmpeq_epi8(_mm_min_epu8(l, _mm_set1_epi8(25)), l);
    let valid = _mm_or_si128(is_d, is_l);
    if _mm_movemask_epi8(_mm_andnot_si128(valid, inside)) != 0 {
        return None;
    }
    let value = _mm_or_si128(
        _mm_and_si128(is_d, d),
        _mm_and_si128(is_l, _mm_add_epi8(l, _mm_set1_epi8(10))),
    );
    let aligned = _mm_shuffle_epi8(value, _mm_loadu_si128(ALIGN[len].as_ptr() as *const __m128i));
    let pairs = _mm_maddubs_epi16(aligned, _mm_set1_epi16(0x0124));
    let quads = _mm_madd_epi16(pairs, _mm_set1_epi32(0x0001_0510));
    let q = _mm_cvtsi128_si64(quads) as u64;
    let x = (q & 0xffff_ffff) * 1_679_616 + (q >> 32);
    (x <= ident::MASK).then_some(x)
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[inline]
unsafe fn masks_avx2(p: *const u8) -> (u64, u64, u64) {
    {
        let lo = _mm256_loadu_si256(p as *const __m256i);
        let hi = _mm256_loadu_si256(p.add(32) as *const __m256i);
        let bits = |v: __m256i, c: u8| _mm256_movemask_epi8(_mm256_cmpeq_epi8(v, _mm256_set1_epi8(c as i8))) as u32 as u64;
        (
            bits(lo, b',') | bits(hi, b',') << 32,
            bits(lo, b'\n') | bits(hi, b'\n') << 32,
            bits(lo, b'"') | bits(hi, b'"') << 32,
        )
    }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[inline]
unsafe fn pack_avx2(p: *const u8, len: usize) -> Option<u64> {
    {
        if len > keys::MAX_PACKED {
            return None;
        }
        let v = _mm_loadu_si128(p as *const __m128i);
        let iota = _mm_setr_epi8(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
        let inside = _mm_cmpgt_epi8(_mm_set1_epi8(len as i8), iota);
        let range = |base: u8, span: u8| {
            let d = _mm_sub_epi8(v, _mm_set1_epi8(base as i8));
            let ok = _mm_cmpeq_epi8(_mm_min_epu8(d, _mm_set1_epi8(span as i8)), d);
            (d, ok)
        };
        let (d, is_d) = range(b'0', 9);
        let (u, is_u) = range(b'A', 25);
        let (l, is_l) = range(b'a', 25);
        let is_s = _mm_cmpeq_epi8(v, _mm_set1_epi8(b'_' as i8));
        let code = _mm_or_si128(
            _mm_or_si128(
                _mm_and_si128(is_d, _mm_add_epi8(d, _mm_set1_epi8(1))),
                _mm_and_si128(is_u, _mm_add_epi8(u, _mm_set1_epi8(11))),
            ),
            _mm_or_si128(
                _mm_and_si128(is_s, _mm_set1_epi8(37)),
                _mm_and_si128(is_l, _mm_add_epi8(l, _mm_set1_epi8(38))),
            ),
        );
        let valid = _mm_or_si128(_mm_or_si128(is_d, is_u), _mm_or_si128(is_l, is_s));
        if _mm_movemask_epi8(_mm_andnot_si128(valid, inside)) != 0 {
            return None;
        }
        let code = _mm_and_si128(code, inside);
        let pairs = _mm_maddubs_epi16(code, _mm_set1_epi16(0x0140));
        let quads = _mm_madd_epi16(pairs, _mm_set1_epi32(0x0001_1000));
        let d0 = _mm_cvtsi128_si32(quads) as u32 as u64;
        let d1 = _mm_extract_epi32::<1>(quads) as u32 as u64;
        let d2 = _mm_extract_epi32::<2>(quads) as u32 as u64;
        Some(d0 << 36 | d1 << 12 | d2 >> 12)
    }
}

#[cfg(test)]
pub struct Scratch {
    commas: Vec<u32>,
    lines: Vec<u32>,
    comma_rank: Vec<u32>,
    quote_rank: Vec<u32>,
}

#[cfg(test)]
impl Scratch {
    pub fn new() -> Scratch {
        Scratch {
            commas: vec![0; SEGMENT + 128],
            lines: vec![0; SEGMENT + 128],
            comma_rank: vec![0; SEGMENT + 128],
            quote_rank: vec![0; SEGMENT + 128],
        }
    }
}

#[cfg(test)]
impl Default for Scratch {
    fn default() -> Self {
        Scratch::new()
    }
}

#[cfg(test)]
#[inline(always)]
unsafe fn flatten(out: *mut u32, mut bits: u64, base: u32) -> usize {
    let count = bits.count_ones() as usize;
    for i in 0..8 {
        *out.add(i) = base + bits.trailing_zeros();
        bits &= bits.wrapping_sub(1);
    }
    if count > 8 {
        for i in 8..16 {
            *out.add(i) = base + bits.trailing_zeros();
            bits &= bits.wrapping_sub(1);
        }
        let mut i = 16;
        while bits != 0 {
            *out.add(i) = base + bits.trailing_zeros();
            bits &= bits.wrapping_sub(1);
            i += 1;
        }
    }
    count
}

#[cfg(test)]
#[inline(always)]
unsafe fn region<const N: usize, K: Kernel, F: Lines<N>>(
    p: *const u8,
    len: usize,
    scratch: &mut Scratch,
    on_line: &mut F,
) {
    let mut seg = 0usize;
    while seg < len {
        let seg_len = (len - seg).min(SEGMENT);
        let last = seg + seg_len == len;
        let q = p.add(seg);
        let commas = scratch.commas.as_mut_ptr();
        let lines = scratch.lines.as_mut_ptr();
        let comma_rank = scratch.comma_rank.as_mut_ptr();
        let quote_rank = scratch.quote_rank.as_mut_ptr();
        let mut nc = 0usize;
        let mut nq = 0u32;
        let mut nl = 0usize;
        let mut base = 0usize;
        while base < seg_len {
            let (mut c, mut l, mut qt) = K::masks(q.add(base));
            if base + 64 > seg_len {
                let keep = (1u64 << (seg_len - base)) - 1;
                c &= keep;
                l &= keep;
                qt &= keep;
            }
            let before = nc as u32;
            let mut lb = l;
            while lb != 0 {
                let o = lb.trailing_zeros();
                let below = (1u64 << o) - 1;
                *lines.add(nl) = (base as u32) + o;
                *comma_rank.add(nl) = before + (c & below).count_ones();
                *quote_rank.add(nl) = nq + (qt & below).count_ones();
                nl += 1;
                lb &= lb - 1;
            }
            nc += flatten(commas.add(nc), c, base as u32);
            nq += qt.count_ones();
            base += 64;
        }
        if last && (seg_len == 0 || *q.add(seg_len - 1) != b'\n') {
            *lines.add(nl) = seg_len as u32;
            *comma_rank.add(nl) = nc as u32;
            *quote_rank.add(nl) = nq;
            nl += 1;
        }
        if nl == 0 {
            let rest = std::slice::from_raw_parts(q, len - seg);
            let n = rest.iter().position(|&b| b == b'\n').unwrap_or(rest.len());
            long_line::<N, F>(&rest[..n], on_line);
            seg += n + 1;
            continue;
        }
        let mut start = 0u32;
        let mut c0 = 0u32;
        let mut q0 = 0u32;
        for k in 0..nl {
            let end = *lines.add(k);
            let c1 = *comma_rank.add(k);
            let q1 = *quote_rank.add(k);
            if c1 - c0 == (N - 1) as u32 && end > start {
                let mut bounds = [(0u32, 0u32); N];
                let mut s = start;
                for (i, b) in bounds.iter_mut().enumerate().take(N - 1) {
                    let e = *commas.add(c0 as usize + i);
                    *b = (s, e);
                    s = e + 1;
                }
                bounds[N - 1] = (s, end);
                let mut ok = true;
                if q1 != q0 {
                    let mut bracketed = 0u32;
                    for b in bounds.iter_mut() {
                        let (s, e) = *b;
                        let first = *q.add(s as usize) == b'"';
                        let last = *q.add((e as usize).saturating_sub(1)) == b'"';
                        let wrapped = (e >= s + 2) & first & last;
                        let w = u32::from(wrapped);
                        bracketed += w;
                        *b = (s + w, e - w);
                    }
                    ok = 2 * bracketed == q1 - q0;
                }
                if ok {
                    let mut fields: [&[u8]; N] = [&[]; N];
                    for (f, &(s, e)) in fields.iter_mut().zip(bounds.iter()) {
                        *f = std::slice::from_raw_parts(q.add(s as usize), (e - s) as usize);
                    }
                    on_line.line(&fields);
                }
            }
            start = end + 1;
            c0 = c1;
            q0 = q1;
        }
        seg += start as usize;
    }
}

#[cold]
#[inline(never)]
fn long_line<const N: usize, F: Lines<N>>(text: &[u8], on_line: &mut F) {
    if let Some(fields) = csv::fields::<N>(text) {
        let mut padded: Vec<u8> = Vec::with_capacity(text.len() + SLACK);
        padded.extend_from_slice(text);
        padded.resize(text.len() + SLACK, 0);
        let mut owned: [&[u8]; N] = [&[]; N];
        for (o, f) in owned.iter_mut().zip(fields.iter()) {
            let offset = f.as_ptr() as usize - text.as_ptr() as usize;
            *o = &padded[offset..offset + f.len()];
        }
        on_line.line(&owned);
    }
}

#[inline(always)]
unsafe fn window<K: Kernel, const WIDE: bool>(q: *const u8) -> (u128, u128, u128) {
    let (c0, n0, q0) = K::masks(q);
    if WIDE {
        let (c1, n1, q1) = K::masks(q.add(64));
        (
            u128::from(c0) | u128::from(c1) << 64,
            u128::from(n0) | u128::from(n1) << 64,
            u128::from(q0) | u128::from(q1) << 64,
        )
    } else {
        (u128::from(c0), u128::from(n0), u128::from(q0))
    }
}

#[cold]
#[inline(never)]
unsafe fn spill<const N: usize, F: Lines<N>>(p: *const u8, pos: usize, len: usize, on_line: &mut F) -> usize {
    let rest = std::slice::from_raw_parts(p.add(pos), len - pos);
    let n = rest.iter().position(|&b| b == b'\n').unwrap_or(rest.len());
    long_line::<N, F>(&rest[..n], on_line);
    pos + n + 1
}

#[inline(always)]
fn quotes(inner: u64, ends: u64, qt: u64) -> (u64, u64) {
    let qs = qt & ((inner << 1) | 1);
    let g = ends.wrapping_sub(qs) & !ends;
    let z = g & (ends >> 1);
    ((qt ^ (qs | z)) | (qs & z), qs)
}

#[inline(always)]
unsafe fn take(base: *const u8, inner: u64, end: u32, qs: u64, out: &mut [&[u8]]) {
    let k = out.len();
    let mut x = inner;
    let mut s = 0u32;
    for (i, f) in out.iter_mut().enumerate() {
        let e = if i + 1 < k { x.trailing_zeros() } else { end };
        x &= x.wrapping_sub(1);
        let w = (qs.wrapping_shr(s) & 1) as u32;
        *f = std::slice::from_raw_parts(base.add((s + w) as usize), e.wrapping_sub(s).wrapping_sub(2 * w) as usize);
        s = e + 1;
    }
}

#[cold]
#[inline(never)]
unsafe fn general<const N: usize, K: Kernel, F: Lines<N>>(p: *const u8, pos: usize, len: usize, on_line: &mut F) -> usize {
    let q = p.add(pos);
    let (c, nl, qt) = window::<K, true>(q);
    if nl == 0 {
        return spill::<N, F>(p, pos, len, on_line);
    }
    let l = nl.trailing_zeros();
    let m = (1u128 << l) - 1;
    let c = c & m;
    let qt = qt & m;
    let d = c | (1u128 << l);
    let qs = qt & ((c << 1) | 1);
    let g = d.wrapping_sub(qs) & !d;
    let z = g & (d >> 1);
    let bad = (qt ^ (qs | z)) | (qs & z);
    if (c.count_ones() == (N - 1) as u32) & (l > 0) & (bad == 0) {
        let mut fields: [&[u8]; N] = [&[]; N];
        let mut rest = c;
        let mut start = 0u32;
        for (i, f) in fields.iter_mut().enumerate() {
            let end = if i + 1 < N { rest.trailing_zeros() } else { l };
            rest &= rest.wrapping_sub(1);
            let w = u32::from(*q.add(start as usize) == b'"');
            *f = std::slice::from_raw_parts(q.add((start + w) as usize), (end - start - 2 * w) as usize);
            start = end + 1;
        }
        on_line.line(&fields);
    }
    pos + l as usize + 1
}

#[inline(always)]
unsafe fn fused_region<const N: usize, const SPLIT: usize, K: Kernel, F: Lines<N>>(p: *const u8, len: usize, on_line: &mut F) {
    let mut pos = 0usize;
    while pos < len {
        let q = p.add(pos);
        let (c0, n0, q0) = K::masks(q);
        if SPLIT >= N {
            if n0 == 0 {
                pos = general::<N, K, F>(p, pos, len, on_line);
                continue;
            }
            let l = n0.trailing_zeros();
            let m = (1u64 << l) - 1;
            let c = c0 & m;
            let qt = q0 & m;
            let (bad, qs) = quotes(c, c | (1u64 << l), qt);
            if (c.count_ones() == (N - 1) as u32) & (l > 0) & (bad == 0) {
                let mut fields: [&[u8]; N] = [&[]; N];
                take(q, c, l, qs, &mut fields);
                on_line.line(&fields);
            }
            pos += l as usize + 1;
            continue;
        }
        let (c1, n1, q1) = K::masks(q.add(64));
        let far = 0u64.wrapping_sub(u64::from(n0 == 0));
        let l = n0.trailing_zeros() + (n1.trailing_zeros() & far as u32);
        let lo_m = 1u64.wrapping_shl(l).wrapping_sub(1) | far;
        let hi_m = 1u64.wrapping_shl(l.wrapping_sub(64)).wrapping_sub(1) & far;
        let (cl, ch) = (c0 & lo_m, c1 & hi_m);
        let (ql, qh) = (q0 & lo_m, q1 & hi_m);
        let mut x = cl;
        for _ in 1..SPLIT {
            x &= x.wrapping_sub(1);
        }
        let cut = x.trailing_zeros();
        let below = 1u64.wrapping_shl(cut).wrapping_sub(1);
        let inner_a = cl & below;
        let s3 = cut.wrapping_add(1);
        let shift = |lo: u64, hi: u64| lo.wrapping_shr(cut).wrapping_shr(1) | hi.wrapping_shl(64u32.wrapping_sub(s3));
        let cb = shift(cl, ch);
        let qb = shift(ql, qh);
        let lb = l.wrapping_sub(s3);
        let shape = ((cl.count_ones() + ch.count_ones()) == (N - 1) as u32) & (cut < 64) & (s3 <= l) & (lb < 64);
        if !shape {
            pos = general::<N, K, F>(p, pos, len, on_line);
            continue;
        }
        let (bad_a, qsa) = quotes(inner_a, inner_a | (1u64 << cut), ql & below);
        let (bad_b, qsb) = quotes(cb, cb | (1u64 << lb), qb);
        if (bad_a | bad_b) == 0 {
            let mut fields: [&[u8]; N] = [&[]; N];
            let (head, tail) = fields.split_at_mut(SPLIT);
            take(q, inner_a, cut, qsa, head);
            take(q.add(s3 as usize), cb, lb, qsb, tail);
            on_line.line(&fields);
        }
        pos += l as usize + 1;
    }
}

#[inline(always)]
pub unsafe fn fused<const N: usize, const SPLIT: usize, K: Kernel, F: Lines<N>>(data: &[u8], on_line: &mut F) {
    let len = data.len();
    let safe = len.saturating_sub(2 * PAD);
    let cut = match data[..safe].iter().rposition(|&b| b == b'\n') {
        Some(i) => i + 1,
        None => 0,
    };
    if cut > 0 {
        fused_region::<N, SPLIT, K, F>(data.as_ptr(), cut, on_line);
    }
    if cut < len {
        let rest = &data[cut..];
        let mut tail: Vec<u8> = Vec::with_capacity(rest.len() + 2 * PAD);
        tail.extend_from_slice(rest);
        tail.resize(rest.len() + 2 * PAD, 0);
        fused_region::<N, SPLIT, K, F>(tail.as_ptr(), rest.len(), on_line);
    }
}

#[cfg(test)]
#[inline(always)]
pub unsafe fn scan<const N: usize, K: Kernel, F: Lines<N>>(data: &[u8], scratch: &mut Scratch, on_line: &mut F) {
    let len = data.len();
    let safe = len.saturating_sub(2 * PAD);
    let cut = match data[..safe].iter().rposition(|&b| b == b'\n') {
        Some(i) => i + 1,
        None => 0,
    };
    if cut > 0 {
        region::<N, K, F>(data.as_ptr(), cut, scratch, on_line);
    }
    if cut < len {
        let rest = &data[cut..];
        let mut tail: Vec<u8> = Vec::with_capacity(rest.len() + 2 * PAD);
        tail.extend_from_slice(rest);
        tail.resize(rest.len() + 2 * PAD, 0);
        region::<N, K, F>(tail.as_ptr(), rest.len(), scratch, on_line);
    }
}

#[cfg(target_arch = "x86_64")]
pub fn has_avx2() -> bool {
    use std::sync::OnceLock;
    static FLAG: OnceLock<bool> = OnceLock::new();
    *FLAG.get_or_init(|| {
        std::env::var_os("SESSIONS_SCALAR").is_none()
            && std::is_x86_feature_detected!("avx2")
            && std::is_x86_feature_detected!("bmi1")
            && std::is_x86_feature_detected!("bmi2")
            && std::is_x86_feature_detected!("popcnt")
    })
}

#[cfg(not(target_arch = "x86_64"))]
pub fn has_avx2() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reference<const N: usize>(data: &[u8]) -> Vec<Vec<Vec<u8>>> {
        let mut out = Vec::new();
        for line in csv::lines(data) {
            if let Some(fields) = csv::fields::<N>(line) {
                out.push(fields.iter().map(|f| f.to_vec()).collect());
            }
        }
        out
    }

    fn run<const N: usize, K: Kernel>(data: &[u8]) -> Vec<Vec<Vec<u8>>> {
        let mut out = Vec::new();
        unsafe {
            let mut scratch = Scratch::new();
            scan::<N, K, _>(data, &mut scratch, &mut |fields: &[&[u8]; N]| {
                out.push(fields.iter().map(|f| f.to_vec()).collect());
            });
        }
        out
    }

    fn run_fused<const N: usize, const SPLIT: usize, K: Kernel>(data: &[u8]) -> Vec<Vec<Vec<u8>>> {
        let mut out = Vec::new();
        unsafe {
            fused::<N, SPLIT, K, _>(data, &mut |fields: &[&[u8]; N]| {
                out.push(fields.iter().map(|f| f.to_vec()).collect());
            });
        }
        out
    }

    fn check<const N: usize>(data: &[u8]) {
        let expected = reference::<N>(data);
        assert_eq!(run::<N, Scalar>(data), expected, "{:?}", String::from_utf8_lossy(data));
        assert_eq!(run_fused::<N, 1, Scalar>(data), expected, "{:?}", String::from_utf8_lossy(data));
        assert_eq!(run_fused::<N, N, Scalar>(data), expected, "{:?}", String::from_utf8_lossy(data));
        assert_eq!(run_fused::<N, 3, Scalar>(data), expected, "{:?}", String::from_utf8_lossy(data));
        #[cfg(target_arch = "x86_64")]
        if std::is_x86_feature_detected!("avx2") {
            assert_eq!(run::<N, Avx2>(data), expected, "{:?}", String::from_utf8_lossy(data));
            assert_eq!(run_fused::<N, 1, Avx2>(data), expected, "{:?}", String::from_utf8_lossy(data));
            assert_eq!(run_fused::<N, N, Avx2>(data), expected, "{:?}", String::from_utf8_lossy(data));
            assert_eq!(run_fused::<N, 3, Avx2>(data), expected, "{:?}", String::from_utf8_lossy(data));
        }
    }

    fn diff_chunk<const N: usize>(chunk: &[u8]) -> usize {
        let old = run::<N, Scalar>(chunk);
        assert_eq!(run_fused::<N, 1, Scalar>(chunk), old);
        assert_eq!(run_fused::<N, N, Scalar>(chunk), old);
        assert_eq!(run_fused::<N, 3, Scalar>(chunk), old);
        #[cfg(target_arch = "x86_64")]
        if std::is_x86_feature_detected!("avx2") {
            assert_eq!(run::<N, Avx2>(chunk), old);
            assert_eq!(run_fused::<N, 1, Avx2>(chunk), old);
            assert_eq!(run_fused::<N, N, Avx2>(chunk), old);
            assert_eq!(run_fused::<N, 3, Avx2>(chunk), old);
        }
        old.len()
    }

    #[test]
    fn differential_files() {
        let Some(dir) = std::env::var_os("SCAN_DIFF") else { return };
        let dir = std::path::PathBuf::from(dir);
        let mut totals = [(0usize, 0usize); 3];
        for (k, (folder, n)) in [("events", 7), ("clicks", 4), ("links", 2)].into_iter().enumerate() {
            let mut files: Vec<_> = std::fs::read_dir(dir.join(folder))
                .unwrap()
                .map(|e| e.unwrap().path())
                .filter(|p| p.extension().is_some_and(|x| x == "csv"))
                .collect();
            files.sort();
            for path in files {
                let data = std::fs::read(&path).unwrap();
                totals[k].1 += data.iter().filter(|&&b| b == b'\n').count();
                let mut at = 0;
                while at < data.len() {
                    let mut end = (at + (1 << 20)).min(data.len());
                    while end < data.len() && data[end - 1] != b'\n' {
                        end += 1;
                    }
                    let chunk = &data[at..end];
                    totals[k].0 += match n {
                        7 => diff_chunk::<7>(chunk),
                        4 => diff_chunk::<4>(chunk),
                        _ => diff_chunk::<2>(chunk),
                    };
                    at = end;
                }
            }
        }
        eprintln!("SCAN_DIFF {} identical field streams: events {:?} clicks {:?} links {:?}", dir.display(), totals[0], totals[1], totals[2]);
    }

    #[test]
    fn fixed_cases() {
        let cases: Vec<&[u8]> = vec![
            b"a,b\n",
            b"a,b",
            b"\"a\",\"\"\n\"\",b\n",
            b"a,b,c\na,b\n",
            b"\n\n\na,b\n\n",
            b"a,\"b\nc\",d\n",
            b"\"\",\"\"\n\",\"\n\"\"\"\",x\n",
            b"a\r,b\r\n",
            b"x,\"",
            b"x,\"\"",
            b"x,y\"z\n",
            b"\"x\"y,z\n",
            b"\",x\n",
            b"\"\n",
            b"\"\"\n",
            b",\n",
            b"\",\"\n",
        ];
        for case in cases {
            check::<2>(case);
            check::<3>(case);
            check::<1>(case);
            let mut long = vec![b'z'; 300];
            long.push(b'\n');
            long.extend_from_slice(case);
            check::<2>(&long);
            let mut prefix = Vec::new();
            for _ in 0..5 {
                prefix.extend_from_slice(b"a,b\n");
            }
            prefix.extend_from_slice(case);
            check::<2>(&prefix);
        }
    }

    #[test]
    fn random_lines() {
        let mut state = 0x2545_f491_4f6c_dd1du64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let alphabet = b"ab,,\"\"\n\r x";
        for round in 0..4000 {
            let len = (next() % 700) as usize;
            let mut data: Vec<u8> = Vec::with_capacity(len);
            for _ in 0..len {
                let r = next();
                if r % 7 == 0 {
                    let long = (next() % 150) as usize;
                    let quoted = next() % 2 == 0;
                    if quoted {
                        data.push(b'"');
                    }
                    data.extend(std::iter::repeat(b'q').take(long));
                    if quoted {
                        data.push(b'"');
                    }
                } else {
                    data.push(alphabet[(r % alphabet.len() as u64) as usize]);
                }
            }
            check::<1>(&data);
            check::<2>(&data);
            check::<4>(&data);
            check::<7>(&data);
            if round % 2 == 0 {
                data.push(b'\n');
                check::<2>(&data);
            }
        }
    }

    #[test]
    fn large_buffers() {
        let mut state = 0x1234_5678_9abc_def1u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        for round in 0..12 {
            let mut data = Vec::new();
            let target = 50_000 + (next() % 150_000) as usize;
            while data.len() < target {
                let fields = 1 + (next() % 4) as usize;
                for f in 0..fields {
                    if f > 0 {
                        data.push(b',');
                    }
                    let quoted = next() % 5 == 0;
                    if quoted {
                        data.push(b'"');
                    }
                    let len = if next() % 997 == 0 { 40_000 } else { (next() % 12) as usize };
                    for _ in 0..len {
                        data.push(b"xyz\r \""[(next() % 6) as usize] as u8);
                    }
                    if quoted && next() % 50 != 0 {
                        data.push(b'"');
                    }
                }
                if next() % 300 == 0 {
                    data.push(b'\n');
                }
                data.push(b'\n');
            }
            if round % 3 == 0 {
                data.pop();
            }
            check::<2>(&data);
            check::<3>(&data);
        }
    }

    #[test]
    fn simd_pack_matches() {
        let mut state = 77u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        for _ in 0..200_000 {
            let len = (next() % 13) as usize;
            let mut buf = [0u8; 32];
            for b in buf.iter_mut() {
                *b = if next() % 4 == 0 {
                    (next() % 256) as u8
                } else {
                    b"09AZ_az"[(next() % 7) as usize]
                };
            }
            let expected = keys::pack(&buf[..len]);
            unsafe {
                assert_eq!(Scalar::pack(buf.as_ptr(), len), expected);
                #[cfg(target_arch = "x86_64")]
                if std::is_x86_feature_detected!("avx2") {
                    assert_eq!(Avx2::pack(buf.as_ptr(), len), expected, "{:?}", &buf[..len]);
                }
            }
        }
    }

    #[test]
    fn simd_mixed_matches() {
        let mut state = 91u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let alphabet = b"0123456789abcdefghijklmnopqrstuvwxyzAZ_u ";
        for round in 0..400_000 {
            let len = (next() % 12) as usize;
            let mut buf = [0u8; 32];
            for b in buf.iter_mut() {
                *b = alphabet[(next() % 36) as usize];
            }
            if round % 3 != 0 {
                buf[0] = b'u';
            }
            if round % 7 == 0 {
                buf[(next() % 12) as usize] = alphabet[36 + (next() % 5) as usize];
            }
            if round % 11 == 0 {
                buf[1] = b'0';
            }
            if round % 13 == 0 {
                buf[len.min(31)] = (next() % 256) as u8;
            }
            let expected = keys::pack(&buf[..len]).and_then(|k| ident::mixed_value(k, len));
            unsafe {
                assert_eq!(Scalar::mixed(buf.as_ptr(), len), expected);
                #[cfg(target_arch = "x86_64")]
                if std::is_x86_feature_detected!("avx2") {
                    assert_eq!(Avx2::mixed(buf.as_ptr(), len), expected, "{:?}", &buf[..len]);
                }
            }
        }
        let mut max = b"u".to_vec();
        let mut x = ident::MASK;
        let mut digits = Vec::new();
        while x > 0 {
            digits.push(b"0123456789abcdefghijklmnopqrstuvwxyz"[(x % 36) as usize]);
            x /= 36;
        }
        digits.reverse();
        max.extend_from_slice(&digits);
        max.resize(32, 0);
        unsafe {
            assert_eq!(Scalar::mixed(max.as_ptr(), 9), Some(ident::MASK));
            #[cfg(target_arch = "x86_64")]
            if std::is_x86_feature_detected!("avx2") {
                assert_eq!(Avx2::mixed(max.as_ptr(), 9), Some(ident::MASK));
                assert_eq!(Avx2::mixed(b"uzzzzzzzz\0\0\0\0\0\0\0".as_ptr(), 9), None);
                assert_eq!(Avx2::mixed(b"u0\0\0\0\0\0\0\0\0\0\0\0\0\0\0".as_ptr(), 2), Some(0));
                assert_eq!(Avx2::mixed(b"u00\0\0\0\0\0\0\0\0\0\0\0\0\0".as_ptr(), 3), None);
            }
        }
    }
}
