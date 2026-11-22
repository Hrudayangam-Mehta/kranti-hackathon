use crate::time::{days_from_civil, DAY_MS, HOUR_MS, MINUTE_MS, SECOND_MS};

const YEARS: usize = 16;

const CACHE: usize = 16;

pub struct Calendar {
    first_year: i64,
    month_start: [i64; YEARS * 12],
    month_len: [u8; YEARS * 12],
    multiplier: u64,
    words: [u64; CACHE],
    starts: [i64; CACHE],
    lengths: [i64; CACHE],
}

fn leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn month_length(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap(year) => 29,
        _ => 28,
    }
}

impl Calendar {
    pub fn around(millis: i64) -> Calendar {
        let days = millis.div_euclid(DAY_MS);
        let mut year = 1970 + days.div_euclid(366);
        while days_from_civil(year + 1, 1, 1) <= days {
            year += 1;
        }
        let first_year = (year - (YEARS as i64) / 2).max(0);
        let mut calendar = Calendar {
            first_year,
            month_start: [0; YEARS * 12],
            month_len: [0; YEARS * 12],
            multiplier: 0,
            words: [u64::MAX; CACHE],
            starts: [0; CACHE],
            lengths: [0; CACHE],
        };
        for i in 0..YEARS * 12 {
            let y = first_year + (i / 12) as i64;
            let m = (i % 12) as i64 + 1;
            calendar.month_start[i] = days_from_civil(y, m, 1);
            calendar.month_len[i] = month_length(y, m) as u8;
        }
        let month0 = {
            let mut m = 1;
            while days_from_civil(year, m + 1, 1) <= days && m < 12 {
                m += 1;
            }
            year * 12 + m - 1
        };
        let months: Vec<(u64, i64, i64)> = (month0 - 3..month0 + 6)
            .filter(|&k| (0..120_000).contains(&k))
            .map(|k| {
                let (y, m) = (k / 12, k % 12 + 1);
                let text = format!("{y:04}-{m:02}-");
                let word = u64::from_le_bytes(text.as_bytes().try_into().unwrap());
                (word, days_from_civil(y, m, 1), month_length(y, m))
            })
            .collect();
        let mut seed = 0x9e37_79b9_7f4a_7c15u64;
        for _ in 0..10_000 {
            seed = seed.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1_442_695_040_888_963_407) | 1;
            let mut used = [false; CACHE];
            let ok = months.iter().all(|&(w, _, _)| {
                let h = (w.wrapping_mul(seed) >> 60) as usize;
                !std::mem::replace(&mut used[h], true)
            });
            if ok {
                calendar.multiplier = seed;
                for &(w, start, len) in &months {
                    let h = (w.wrapping_mul(seed) >> 60) as usize;
                    calendar.words[h] = w;
                    calendar.starts[h] = start;
                    calendar.lengths[h] = len;
                }
                break;
            }
        }
        calendar
    }

    #[inline(always)]
    fn month(&self, year: i64, month: i64) -> (i64, i64) {
        let index = (year - self.first_year) * 12 + month - 1;
        if (0..(YEARS * 12) as i64).contains(&index) {
            let i = index as usize;
            (self.month_start[i], i64::from(self.month_len[i]))
        } else {
            (days_from_civil(year, month, 1), month_length(year, month))
        }
    }

    #[cold]
    #[inline(never)]
    fn month_slow(&self, a: u64) -> Option<(i64, i64)> {
        const SA: u64 = 0xff00_00ff_0000_0000;
        const EA: u64 = 0x2d00_002d_0000_0000;
        if (a & SA) != EA {
            return None;
        }
        let xa = a ^ ZEROS;
        if digit_fault(xa) & !SA != 0 {
            return None;
        }
        let byte = |i: u32| ((xa >> (8 * i)) & 0xff) as i64;
        let year = byte(0) * 1000 + byte(1) * 100 + byte(2) * 10 + byte(3);
        let month = byte(5) * 10 + byte(6);
        if !(1..=12).contains(&month) {
            return None;
        }
        Some(self.month(year, month))
    }

    #[inline(always)]
    unsafe fn date_time(&self, t: *const u8) -> Option<i64> {
        let a = (t as *const u64).read_unaligned();
        let h = (a.wrapping_mul(self.multiplier) >> 60) as usize;
        let (start, length) = if *self.words.get_unchecked(h) == a {
            (*self.starts.get_unchecked(h), *self.lengths.get_unchecked(h))
        } else {
            self.month_slow(a)?
        };
        let dd = u64::from((t.add(8) as *const u16).read_unaligned()) ^ 0x3030;
        let w = (t.add(11) as *const u64).read_unaligned();
        let x = w ^ ZEROS;
        const SEP: u64 = 0x0000_ff00_00ff_0000;
        const COLONS: u64 = 0x0000_3a00_003a_0000;
        let bad = (digit_fault(dd) & 0x8080) | (digit_fault(x) & !SEP) | u64::from(*t.add(10) != b'T') | ((w & SEP) ^ COLONS);
        if bad != 0 {
            return None;
        }
        let day = ((dd & 0xff) * 10 + (dd >> 8)) as i64;
        let pairs = x.wrapping_mul(10).wrapping_add(x >> 8);
        let hour = (pairs & 0xff) as i64;
        let minute = ((pairs >> 24) & 0xff) as i64;
        let second = ((pairs >> 48) & 0xff) as i64;
        if day < 1 || day > length || hour > 23 || minute > 59 || second > 59 {
            return None;
        }
        Some(((start + day - 1) * 86_400 + hour * 3_600 + minute * 60 + second) * SECOND_MS)
    }

    // The caller has parsed ingest with the same calendar. Reusing a date is
    // valid only after exact byte equality, including the capital T separator.
    // Every clock digit, colon and range of the event is still checked here.
    #[inline(always)]
    pub unsafe fn parse_after_ingest(&self, t: &[u8], ingest_text: &[u8], ingest: i64) -> Option<i64> {
        if t.len() == 20 && ingest_text.len() == 20
            && *t.as_ptr().add(19) == b'Z' && *ingest_text.as_ptr().add(19) == b'Z'
            && t[..11] == ingest_text[..11]
        {
            let w = (t.as_ptr().add(11) as *const u64).read_unaligned();
            let x = w ^ ZEROS;
            const SEP: u64 = 0x0000_ff00_00ff_0000;
            const COLONS: u64 = 0x0000_3a00_003a_0000;
            if (digit_fault(x) & !SEP) | ((w & SEP) ^ COLONS) != 0 {
                return None;
            }
            let pairs = x.wrapping_mul(10).wrapping_add(x >> 8);
            let hour = (pairs & 0xff) as i64;
            let minute = ((pairs >> 24) & 0xff) as i64;
            let second = ((pairs >> 48) & 0xff) as i64;
            if hour > 23 || minute > 59 || second > 59 {
                return None;
            }
            let day = ingest.div_euclid(DAY_MS) * DAY_MS;
            return Some(day + (hour * 3600 + minute * 60 + second) * SECOND_MS);
        }
        self.parse(t)
    }

    /// Ingest timestamps are guaranteed valid F1 by the Shopping Sessions rules.
    /// The common case therefore converts the clock without repeating digit,
    /// calendar-day, and clock-range validation. Non-F1 shapes retain the
    /// general parser. The event/click timestamp parsers remain fully checked.
    #[inline(always)]
    pub unsafe fn parse_ingest(&self, t: &[u8]) -> Option<i64> {
        if t.len() != 20 || *t.as_ptr().add(19) != b'Z' {
            return self.parse(t);
        }
        let p = t.as_ptr();
        let a = (p as *const u64).read_unaligned();
        let h = (a.wrapping_mul(self.multiplier) >> 60) as usize;
        let start = if *self.words.get_unchecked(h) == a {
            *self.starts.get_unchecked(h)
        } else {
            self.month_slow(a)?.0
        };
        let dd = u64::from((p.add(8) as *const u16).read_unaligned()) ^ 0x3030;
        let day = ((dd & 0xff) * 10 + (dd >> 8)) as i64;
        let x = (p.add(11) as *const u64).read_unaligned() ^ ZEROS;
        let pairs = x.wrapping_mul(10).wrapping_add(x >> 8);
        let hour = (pairs & 0xff) as i64;
        let minute = ((pairs >> 24) & 0xff) as i64;
        let second = ((pairs >> 48) & 0xff) as i64;
        Some(((start + day - 1) * 86_400 + hour * 3_600 + minute * 60 + second) * SECOND_MS)
    }

    #[inline(always)]
    pub unsafe fn parse(&self, t: &[u8]) -> Option<i64> {
        let n = t.len();
        let p = t.as_ptr();
        if n == 20 && *p.add(19) == b'Z' {
            return self.date_time(p);
        }
        if n == 25 && (*p.add(19) == b'+' || *p.add(19) == b'-') {
            let local = self.date_time(p)?;
            let h1 = (*p.add(20)).wrapping_sub(b'0');
            let h2 = (*p.add(21)).wrapping_sub(b'0');
            let m1 = (*p.add(23)).wrapping_sub(b'0');
            let m2 = (*p.add(24)).wrapping_sub(b'0');
            if *p.add(22) != b':' || h1 > 9 || h2 > 9 || m1 > 9 || m2 > 9 {
                return None;
            }
            let hours = i64::from(h1 * 10 + h2);
            let minutes = i64::from(m1 * 10 + m2);
            if hours > 23 || minutes > 59 {
                return None;
            }
            let offset = hours * HOUR_MS + minutes * MINUTE_MS;
            return Some(if *p.add(19) == b'+' { local - offset } else { local + offset });
        }
        if (1..=16).contains(&n) {
            return digits_padded(p, n);
        }
        epoch(t)
    }
}

const ZEROS: u64 = 0x3030_3030_3030_3030;

#[inline(always)]
fn digit_fault(x: u64) -> u64 {
    (x | x.wrapping_add(0x7676_7676_7676_7676)) & 0x8080_8080_8080_8080
}

#[inline(always)]
fn eight(word: u64) -> Option<u64> {
    let x = word ^ ZEROS;
    if digit_fault(x) != 0 {
        return None;
    }
    let x = x.wrapping_mul(10).wrapping_add(x >> 8);
    const MASK: u64 = 0x0000_00ff_0000_00ff;
    const MUL1: u64 = 100 + (1_000_000 << 32);
    const MUL2: u64 = 1 + (10_000 << 32);
    Some(((x & MASK).wrapping_mul(MUL1).wrapping_add(((x >> 16) & MASK).wrapping_mul(MUL2))) >> 32)
}

#[inline(always)]
unsafe fn head(p: *const u8, k: usize) -> u64 {
    let w = (p as *const u64).read_unaligned();
    (w << (8 * (8 - k))) | ZEROS.checked_shr(8 * k as u32).unwrap_or(0)
}

#[inline(always)]
unsafe fn digits_padded(p: *const u8, n: usize) -> Option<i64> {
    if n <= 8 {
        return eight(head(p, n)).map(|v| v as i64);
    }
    let high = eight(head(p, n - 8))?;
    let low = eight((p.add(n - 8) as *const u64).read_unaligned())?;
    Some((high * 100_000_000 + low) as i64)
}

pub fn epoch(t: &[u8]) -> Option<i64> {
    if t.is_empty() {
        return None;
    }
    let mut value: u64 = 0;
    let mut significant = 0u32;
    let mut started = false;
    for &byte in t {
        let digit = byte.wrapping_sub(b'0');
        if digit > 9 {
            return None;
        }
        started |= digit != 0;
        significant += u32::from(started);
        value = value.wrapping_mul(10).wrapping_add(u64::from(digit));
    }
    if significant > 19 || value > i64::MAX as u64 {
        return None;
    }
    Some(value as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::time::parse_timestamp;

    fn padded(calendar: &Calendar, t: &[u8]) -> Option<i64> {
        let mut buf = t.to_vec();
        buf.extend_from_slice(&[b'7'; 16]);
        unsafe { calendar.parse(&buf[..t.len()]) }
    }

    #[test]
    fn digit_words() {
        let mut state = 99u64;
        for _ in 0..100_000 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let n = (state % 17) as usize;
            let mut text: Vec<u8> = (0..n).map(|i| b'0' + ((state >> (i * 3)) % 10) as u8).collect();
            if state % 5 == 0 && n > 0 {
                let i = (state >> 40) as usize % n;
                text[i] = (state >> 48) as u8;
            }
            let calendar = Calendar::around(0);
            assert_eq!(padded(&calendar, &text), parse_timestamp(&text), "{:?}", text);
        }
    }

    #[test]
    fn matches_reference() {
        let calendar = Calendar::around(1_791_071_890_000);
        let fixed: Vec<&[u8]> = vec![
            b"2026-10-03T23:58:10Z",
            b"2026-10-03T19:58:10-04:00",
            b"2026-10-03T19:58:10+23:59",
            b"2026-10-03T19:58:10+24:00",
            b"2026-10-03T19:58:10+05:60",
            b"2026-10-03T19:58:10-00:00",
            b"2026-10-03T19:58:10+0200",
            b"2028-02-29T00:00:00Z",
            b"2027-02-29T00:00:00Z",
            b"2100-02-29T00:00:00Z",
            b"2000-02-29T00:00:00Z",
            b"1970-01-01T00:00:00Z",
            b"0000-01-01T00:00:00Z",
            b"9999-12-31T23:59:59Z",
            b"2026-13-01T00:00:00Z",
            b"2026-00-01T00:00:00Z",
            b"2026-04-31T00:00:00Z",
            b"2026-04-30T24:00:00Z",
            b"2026-04-30T23:60:00Z",
            b"2026-04-30T23:59:60Z",
            b"2026-04-30t23:59:59Z",
            b"2026-04-30T23:59:59z",
            b"2026-04-30 23:59:59Z",
            b"2026-04-30T23:59:59",
            b"2026-04-30T23:59:59.000Z",
            b"1791071890000",
            b"0001791071890000",
            b"0000000000001791071890000",
            b"9223372036854775807",
            b"9223372036854775808",
            b"00000000000000000000000009223372036854775807",
            b"18446744073709551616",
            b"36893488147419103232",
            b"00018446744073709551615",
            b"99999999999999999999999",
            b"1791071890000.0",
            b"1.79e12",
            b"-5",
            b"+5",
            b"",
            b"0",
            b"1791071890000\r",
            b"2026-10-03T23:58:10Z\r",
            b"2026-1O-03T23:58:10Z",
        ];
        for t in fixed {
            assert_eq!(padded(&calendar, t), parse_timestamp(t), "{}", String::from_utf8_lossy(t));
        }
    }

    #[test]
    fn random_matches_reference() {
        let calendar = Calendar::around(1_830_000_000_000);
        let mut state = 0x9e37_79b9_7f4a_7c15u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        let base: &[&[u8]] = &[b"2027-12-31T23:59:59Z", b"2028-02-29T12:30:00+05:30", b"1830000000000", b"2024-02-29T00:00:00-11:59"];
        let alphabet = b"0123456789-+:TZ x";
        for _ in 0..200_000 {
            let mut t = base[(next() % base.len() as u64) as usize].to_vec();
            for _ in 0..(next() % 3) {
                let i = (next() % t.len() as u64) as usize;
                t[i] = alphabet[(next() % alphabet.len() as u64) as usize];
            }
            assert_eq!(padded(&calendar, &t), parse_timestamp(&t), "{}", String::from_utf8_lossy(&t));
        }
        for year in [1969i64, 1970, 1999, 2000, 2024, 2025, 2026, 2027, 2028, 2029, 2040, 2100, 2400] {
            for month in 1..=12 {
                for day in [1, 28, 29, 30, 31] {
                    let t = format!("{year:04}-{month:02}-{day:02}T01:02:03Z");
                    assert_eq!(padded(&calendar, t.as_bytes()), parse_timestamp(t.as_bytes()), "{t}");
                }
            }
        }
    }
    #[test]
    fn shared_date_matches_full_parser() {
        let calendar = Calendar::around(1_830_000_000_000);
        for ingest in [
            b"2028-02-29T23:59:59Z".as_slice(),
            b"1970-01-01T00:00:00Z",
            b"1969-12-31T23:59:59Z",
            b"0000-01-01T12:00:00Z",
            b"9999-12-31T12:00:00Z",
        ] {
            let mut padded_ingest = ingest.to_vec();
            padded_ingest.extend_from_slice(&[0;16]);
            let ingest_text = &padded_ingest[..20];
            let stamp = unsafe { calendar.parse(ingest_text).unwrap() };
            for position in 0..20 {
                for byte in 0..=255 {
                    let mut event = ingest.to_vec();
                    event[position] = byte;
                    let expected = parse_timestamp(&event);
                    event.extend_from_slice(&[0;16]);
                    let got = unsafe { calendar.parse_after_ingest(&event[..20], ingest_text, stamp) };
                    assert_eq!(got, expected, "position={position}, byte={byte}, ingest={ingest:?}");
                }
            }
            for event in [
                b"2028-02-28T23:59:59Z".as_slice(), b"2028-03-01T00:00:00Z",
                b"2028-02-29T00:00:00-00:00", b"2028-02-29T12:34:56+05:30",
                b"2028-02-29T12:34:56+24:00", b"0", b"0001830000000000",
                b"9223372036854775807", b"9223372036854775808", b"", b"2028-02-29T12:34:56Z\r",
            ] {
                let expected = parse_timestamp(event);
                let mut padded_event = event.to_vec();
                padded_event.extend_from_slice(&[0;16]);
                assert_eq!(unsafe { calendar.parse_after_ingest(&padded_event[..event.len()], ingest_text, stamp) }, expected);
            }
        }
    }

}

#[cfg(test)]
mod ingest_tests {
    use super::*;

    #[test]
    fn valid_f1_ingest_matches_checked_calendar_across_eras() {
        let calendar = Calendar::around(days_from_civil(2026, 11, 1) * DAY_MS);
        for year in [0, 1, 1600, 1900, 1969, 1970, 2000, 2024, 2025, 2026, 2400, 9999] {
            for month in 1..=12 {
                for day in [1, 28, month_length(year, month)] {
                    for (h, m, s) in [(0, 0, 0), (0, 0, 1), (1, 9, 11), (12, 34, 56), (23, 59, 59)] {
                        let text = format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}Z");
                        let mut buf = text.as_bytes().to_vec();
                        buf.extend_from_slice(&[0; 32]);
                        let t = &buf[..text.len()];
                        unsafe { assert_eq!(calendar.parse_ingest(t), calendar.parse(t), "{text}"); }
                    }
                }
            }
        }
    }
}
