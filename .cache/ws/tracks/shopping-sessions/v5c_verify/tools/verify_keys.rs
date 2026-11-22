
#[cfg(test)]
mod verify_keys {
    use super::*;
    use super::scan::{Avx2, Scalar};

    fn domains() -> Vec<Domain> {
        let mut v = vec![Domain::bare()];
        for &p in b"u0afzU\" \xff\r_" {
            v.push(Domain::with_prefix(p));
        }
        v
    }

    fn base_samples() -> Vec<Vec<u8>> {
        let h32: &[u8] = b"0123456789abcdef0123456789abcdef";
        let mut out: Vec<Vec<u8>> = Vec::new();
        let fixed: Vec<Vec<u8>> = vec![
            b"".to_vec(), b"1".to_vec(), b"01".to_vec(), b"001".to_vec(), b"10".to_vec(), b"100".to_vec(), b"0".to_vec(), b"00".to_vec(),
            b"z".to_vec(), b"zz".to_vec(), b"a".to_vec(), b"f".to_vec(), b"g".to_vec(), b"fg".to_vec(), b"gf".to_vec(), b"0g".to_vec(), b"g0".to_vec(),
            h32.to_vec(), h32[..31].to_vec(), [h32, b"0"].concat(), [h32, b"g"].concat(), h32.to_ascii_uppercase(),
            [&h32[..16], &h32[..16].to_ascii_uppercase()[..]].concat(), [&h32[..31], b"g"].concat(), [b"g", &h32[1..]].concat(),
            [&h32[..15], b"G", &h32[16..]].concat(), [&b"0".repeat(16)[..], &b"f".repeat(16)[..]].concat(),
            [&b"0".repeat(15)[..], b"1", &b"f".repeat(16)[..]].concat(), [&b"f".repeat(16)[..], &b"0".repeat(16)[..]].concat(),
            [&b"f".repeat(15)[..], b"e", &b"0".repeat(16)[..]].concat(), b"f".repeat(32), b"0".repeat(32), [&b"0".repeat(31)[..], b"1"].concat(),
            [b"1", &b"0".repeat(31)[..]].concat(), [&b"f".repeat(31)[..], b"e"].concat(),
            b"0123".to_vec(), b"0124".to_vec(), b"0123456789ab".to_vec(), b"0123456789a".to_vec(), b"0123456789abc".to_vec(), b"0123456789abcdef".to_vec(),
            b"0123456789abcdef0123456789abcde".to_vec(), b"0123456789abcdef0123456789abcdeg".to_vec(), b"0123456789abcdef0123456789abcdef0".to_vec(),
            b"0123456789abcdef0123456789abcdefg".to_vec(), b"0123456789abcdeg0123456789abcdef".to_vec(), b"0123456789abcdefg".to_vec(),
            b"1 ".to_vec(), b" 1".to_vec(), b"1\r".to_vec(), b" ".to_vec(), b"\r".to_vec(), b"1\t".to_vec(), b"\x01".to_vec(), b"\x7f".to_vec(),
            b"\xc3\xa9".to_vec(), b"\xff".to_vec(), b"A".to_vec(), b"Z".to_vec(), b"_".to_vec(), b"-".to_vec(), b"a-b".to_vec(), b"a_b".to_vec(),
            b"A1".to_vec(), b"1A".to_vec(), b"u1".to_vec(), b"uu1".to_vec(), b"x1".to_vec(), b"k1".to_vec(), b"e1".to_vec(), b"U1".to_vec(),
            b"1".repeat(300), b"f".repeat(200), b"f".repeat(33), b"f".repeat(31), b"z".repeat(11), b"z".repeat(12), b"z".repeat(10),
            b"aaaaaaaaaaa".to_vec(), b"aaaaaaaaaaaa".to_vec(), b"a".repeat(10), [&b"0".repeat(10)[..], b"1"].concat(), [b"1", &b"0".repeat(10)[..]].concat(),
            [b"1", &b"0".repeat(11)[..]].concat(), b"\"".to_vec(), b"\"1\"".to_vec(), b",".to_vec(), b"\n".to_vec(), b"\0".to_vec(), b"1\0".to_vec(),
            b"\xa5\xa5".to_vec(), b"zzzzzzzzzzz\xa5".to_vec(),
        ];
        out.extend(fixed);
        for n in 1..=40 {
            out.push(b"0".repeat(n));
            out.push(b"z".repeat(n));
            out.push(b"f".repeat(n));
            out.push(b"9".repeat(n));
            out.push(b"0123456789abcdefghijklmnopqrstuvwxyz01230123456789abcdefghijklmnopqrstuvwxyz0123"[..n].to_vec());
            out.push(b"fedcba9876543210fedcba9876543210fedcba9876543210"[..n].to_vec());
            out.push(b"0000000000000000ffffffffffffffff0000000000000000"[..n].to_vec());
        }
        let mut state = 0x1234_5678_9abc_def1u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let b36 = b"0123456789abcdefghijklmnopqrstuvwxyz";
        let hex = b"0123456789abcdef";
        let wide = b"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ _-\"\r\t\xc3\xff\x00";
        for i in 0..1400 {
            let (len, set): (usize, &[u8]) = match i % 7 {
                0 => ((next() % 13) as usize, b36),
                1 => (31 + (next() % 3) as usize, hex),
                2 => ((next() % 14) as usize, wide),
                3 => (32, if next() % 4 == 0 { wide } else { hex }),
                4 => ((next() % 41) as usize, b36),
                5 => (32, b36),
                _ => (1 + (next() % 12) as usize, hex),
            };
            let mut s: Vec<u8> = (0..len).map(|_| set[(next() >> 11) as usize % set.len()]).collect();
            if i % 9 == 0 && !s.is_empty() {
                let at = (next() as usize) % s.len();
                s[at] = b'0';
            }
            if i % 11 == 0 && s.len() > 1 {
                s[0] = b'0';
            }
            out.push(s.clone());
            if !s.is_empty() && next() % 2 == 0 {
                let mut t = s.clone();
                t.truncate((next() as usize) % s.len());
                out.push(t);
                let mut t = s.clone();
                let at = (next() as usize) % s.len();
                t[at] = wide[(next() as usize) % wide.len()];
                out.push(t);
                let mut t = s.clone();
                t.push(b36[(next() as usize) % 36]);
                out.push(t);
            }
        }
        out.sort();
        out.dedup();
        out
    }

    fn samples_for(d: &Domain) -> Vec<Vec<u8>> {
        let base = base_samples();
        let mut out: Vec<Vec<u8>> = Vec::new();
        for s in &base {
            out.push(s.clone());
            if d.plen == 1 {
                out.push([&[d.prefix][..], s].concat());
                out.push([&[d.prefix, d.prefix][..], s].concat());
            }
            out.push([b"x", &s[..]].concat());
            out.push([b"u", &s[..]].concat());
        }
        out.sort();
        out.dedup();
        out
    }

    fn enc<K: Kernel>(d: &Domain, s: &[u8]) -> Key {
        let mut p = s.to_vec();
        p.resize(s.len() + 96, 0xa5);
        unsafe { encode_k::<K>(d, &p[..s.len()]) }
    }

    fn enc_junk<K: Kernel>(d: &Domain, s: &[u8], junk: u8) -> Key {
        let mut p = s.to_vec();
        p.resize(s.len() + 96, junk);
        unsafe { encode_k::<K>(d, &p[..s.len()]) }
    }

    #[test]
    fn production_keys_match_byte_order() {
        assert!(scan::has_avx2(), "avx2 required for this check");
        for d in domains() {
            let all = samples_for(&d);
            let n = all.len();
            let keys: Vec<Key> = all.iter().map(|s| enc::<Avx2>(&d, s)).collect();
            let mut shorts = 0usize;
            let mut longs = 0usize;
            let mut odds = 0usize;
            for (s, &k) in all.iter().zip(&keys) {
                let ks = enc::<Scalar>(&d, s);
                assert_eq!(k, ks, "{d:?} avx2 vs scalar {:?}", String::from_utf8_lossy(s));
                for junk in [0u8, b'0', b'f', b'z', b',', b'\n', 0xff] {
                    assert_eq!(enc_junk::<Avx2>(&d, s, junk), k, "{d:?} junk {junk} {:?}", String::from_utf8_lossy(s));
                    assert_eq!(enc_junk::<Scalar>(&d, s, junk), k, "{d:?} junk {junk} {:?}", String::from_utf8_lossy(s));
                }
                assert_eq!(d.lookup(s), Some(k), "{d:?} lookup {:?}", String::from_utf8_lossy(s));
                let exact = d.exact(s);
                if k.hi == id::ODD {
                    odds += 1;
                    assert_eq!(exact, None, "{d:?} odd but exact {:?}", String::from_utf8_lossy(s));
                } else {
                    assert_eq!(exact, Some(k));
                    if k.hi == 0 {
                        shorts += 1;
                        let rest = &s[d.plen..];
                        assert!(rest.len() >= 1 && rest.len() <= id::SHORT_MAX);
                        assert!(rest.iter().all(|b| b.is_ascii_digit() || b.is_ascii_lowercase()));
                        assert_eq!(id::short_len(k.lo), rest.len());
                    } else {
                        longs += 1;
                        let rest = &s[d.plen..];
                        assert_eq!(rest.len(), 32);
                        assert!(rest.iter().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(b)));
                        assert_ne!(k.hi, 0);
                        assert_ne!(k.hi, id::ODD);
                    }
                }
                assert_ne!(k, Key::default());
                let mut back = Vec::new();
                d.bytes_of(k, &mut back);
                assert_eq!(&back, s, "{d:?} roundtrip {:?}", String::from_utf8_lossy(s));
            }
            for i in 0..n {
                for j in 0..n {
                    let (a, b) = (&all[i], &all[j]);
                    let c = d.cmp(keys[i], keys[j]);
                    assert_eq!(c, a.cmp(b), "{d:?} cmp {:?} {:?} keys {:?} {:?}", String::from_utf8_lossy(a), String::from_utf8_lossy(b), keys[i], keys[j]);
                    assert_eq!(keys[i] == keys[j], a == b, "{d:?} eq {:?} {:?}", String::from_utf8_lossy(a), String::from_utf8_lossy(b));
                    assert_eq!(keys[i].hash() == keys[j].hash() && keys[i] != keys[j], false);
                }
            }
            let mut order: Vec<usize> = (0..n).collect();
            order.sort_by(|&x, &y| d.cmp(keys[x], keys[y]));
            for w in order.windows(2) {
                assert!(all[w[0]] < all[w[1]]);
            }
            eprintln!("domain {d:?}: {n} samples, {shorts} short, {longs} long, {odds} odd: ok");
        }
    }

    #[test]
    fn people_names_across_classes() {
        let d = Domain::with_prefix(b'u');
        let ids: Vec<&[u8]> = vec![
            b"u0124", b"u0123456789abcdef0123456789abcdef", b"u0123", b"u0123g", b"U0123", b" u0123", b"u0123\r",
            b"u00000000000000000000000000000001", b"u0", b"u00", b"u000000000000", b"uffffffffffffffff0000000000000000", b"uz",
            b"uzzzzzzzzzzz", b"uzzzzzzzzzzzz", b"x0", b"", b"u", b"uu",
        ];
        for pivot in 0..ids.len() {
            let pairs: Vec<(Key, Key)> = ids.iter().map(|&s| (d.encode(ids[pivot]), d.encode(s))).collect();
            let people = People::build(&pairs, &d);
            let smallest = ids.iter().min().unwrap();
            for &s in &ids {
                let mut out = Vec::new();
                d.bytes_of(people.name_of(d.encode(s)), &mut out);
                assert_eq!(&out[..], *smallest, "pivot {:?} member {:?}", String::from_utf8_lossy(ids[pivot]), String::from_utf8_lossy(s));
            }
        }
        let a: &[u8] = b"u0123456789abcdef0123456789abcdef";
        let b: &[u8] = b"u0123456789abcdef0123456789abcdee";
        let people = People::build(&[(d.encode(a), d.encode(b))], &d);
        let mut out = Vec::new();
        d.bytes_of(people.name_of(d.encode(a)), &mut out);
        assert_eq!(&out[..], b);
        let mut out = Vec::new();
        d.bytes_of(people.name_of(d.encode(b"u1")), &mut out);
        assert_eq!(&out[..], b"u1");
    }
}
