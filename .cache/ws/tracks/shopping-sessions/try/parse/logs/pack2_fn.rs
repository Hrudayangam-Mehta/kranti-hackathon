/// Two `pack_avx2` computations in the two 128-bit lanes of one AVX2 register.
#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2,bmi1,bmi2,popcnt")]
#[inline]
unsafe fn pack2_avx2(p0: *const u8, l0: usize, p1: *const u8, l1: usize) -> (Option<u64>, Option<u64>) {
    let n0 = l0.min(keys::MAX_PACKED + 1) as i8;
    let n1 = l1.min(keys::MAX_PACKED + 1) as i8;
    let v = _mm256_inserti128_si256::<1>(
        _mm256_castsi128_si256(_mm_loadu_si128(p0 as *const __m128i)),
        _mm_loadu_si128(p1 as *const __m128i),
    );
    let iota = _mm256_setr_epi8(
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    );
    let lens = _mm256_inserti128_si256::<1>(_mm256_castsi128_si256(_mm_set1_epi8(n0)), _mm_set1_epi8(n1));
    let inside = _mm256_cmpgt_epi8(lens, iota);
    let range = |base: u8, span: u8| {
        let d = _mm256_sub_epi8(v, _mm256_set1_epi8(base as i8));
        let ok = _mm256_cmpeq_epi8(_mm256_min_epu8(d, _mm256_set1_epi8(span as i8)), d);
        (d, ok)
    };
    let (d, is_d) = range(b'0', 9);
    let (u, is_u) = range(b'A', 25);
    let (l, is_l) = range(b'a', 25);
    let is_s = _mm256_cmpeq_epi8(v, _mm256_set1_epi8(b'_' as i8));
    let code = _mm256_or_si256(
        _mm256_or_si256(
            _mm256_and_si256(is_d, _mm256_add_epi8(d, _mm256_set1_epi8(1))),
            _mm256_and_si256(is_u, _mm256_add_epi8(u, _mm256_set1_epi8(11))),
        ),
        _mm256_or_si256(
            _mm256_and_si256(is_s, _mm256_set1_epi8(37)),
            _mm256_and_si256(is_l, _mm256_add_epi8(l, _mm256_set1_epi8(38))),
        ),
    );
    let valid = _mm256_or_si256(_mm256_or_si256(is_d, is_u), _mm256_or_si256(is_l, is_s));
    let fault = _mm256_movemask_epi8(_mm256_andnot_si256(valid, inside)) as u32;
    let code = _mm256_and_si256(code, inside);
    let pairs = _mm256_maddubs_epi16(code, _mm256_set1_epi16(0x0140));
    let quads = _mm256_madd_epi16(pairs, _mm256_set1_epi32(0x0001_1000));
    let word = |q: __m128i| {
        let d0 = _mm_cvtsi128_si32(q) as u32 as u64;
        let d1 = _mm_extract_epi32::<1>(q) as u32 as u64;
        let d2 = _mm_extract_epi32::<2>(q) as u32 as u64;
        d0 << 36 | d1 << 12 | d2 >> 12
    };
    let k0 = word(_mm256_castsi256_si128(quads));
    let k1 = word(_mm256_extracti128_si256::<1>(quads));
    let ok0 = l0 <= keys::MAX_PACKED && fault & 0xffff == 0;
    let ok1 = l1 <= keys::MAX_PACKED && fault >> 16 == 0;
    (ok0.then_some(k0), ok1.then_some(k1))
}

