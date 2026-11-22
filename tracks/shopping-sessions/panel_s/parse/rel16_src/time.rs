pub const SECOND_MS: i64 = 1_000;
pub const MINUTE_MS: i64 = 60 * SECOND_MS;
pub const HOUR_MS: i64 = 60 * MINUTE_MS;
pub const DAY_MS: i64 = 24 * HOUR_MS;

pub fn parse_timestamp(text: &[u8]) -> Option<i64> {
    if !text.is_empty() && text.iter().all(u8::is_ascii_digit) {
        return parse_epoch_millis(text);
    }
    match text.len() {
        20 if text[19] == b'Z' => parse_date_time(&text[..19]),
        25 => {
            let local = parse_date_time(&text[..19])?;
            let sign = match text[19] {
                b'+' => 1,
                b'-' => -1,
                _ => return None,
            };
            if text[22] != b':' {
                return None;
            }
            let hours = digits(&text[20..22])?;
            let minutes = digits(&text[23..25])?;
            if hours > 23 || minutes > 59 {
                return None;
            }
            Some(local - sign * (hours * HOUR_MS + minutes * MINUTE_MS))
        }
        _ => None,
    }
}

fn parse_epoch_millis(text: &[u8]) -> Option<i64> {
    let mut value: i64 = 0;
    for &byte in text {
        value = value.checked_mul(10)?.checked_add(i64::from(byte - b'0'))?;
    }
    Some(value)
}

fn parse_date_time(text: &[u8]) -> Option<i64> {
    if text[4] != b'-' || text[7] != b'-' || text[10] != b'T' || text[13] != b':' || text[16] != b':' {
        return None;
    }
    let year = digits(&text[0..4])?;
    let month = digits(&text[5..7])?;
    let day = digits(&text[8..10])?;
    let hour = digits(&text[11..13])?;
    let minute = digits(&text[14..16])?;
    let second = digits(&text[17..19])?;
    if !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) {
        return None;
    }
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let days = days_from_civil(year, month, day);
    Some(days * DAY_MS + hour * HOUR_MS + minute * MINUTE_MS + second * SECOND_MS)
}

fn digits(text: &[u8]) -> Option<i64> {
    let mut value = 0;
    for &byte in text {
        if !byte.is_ascii_digit() {
            return None;
        }
        value = value * 10 + i64::from(byte - b'0');
    }
    Some(value)
}

fn is_leap_year(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if is_leap_year(year) => 29,
        _ => 28,
    }
}

pub fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let month_from_march = (month + 9) % 12;
    let day_of_year = (153 * month_from_march + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

pub fn day_of(millis: i64) -> i64 {
    millis.div_euclid(DAY_MS)
}

#[cfg(test)]
mod tests {
    use super::*;

    const F1: i64 = 1_791_071_890_000;

    #[test]
    fn forms() {
        assert_eq!(parse_timestamp(b"2026-10-03T23:58:10Z"), Some(F1));
        assert_eq!(parse_timestamp(b"2026-10-03T19:58:10-04:00"), Some(F1));
        assert_eq!(parse_timestamp(b"2026-10-04T01:58:10+02:00"), Some(F1));
        assert_eq!(parse_timestamp(b"1791071890000"), Some(F1));
        assert_eq!(parse_timestamp(b"0001791071890000"), Some(F1));
        assert_eq!(parse_timestamp(b"00000000000000000000001791071890000"), Some(F1));
        assert_eq!(parse_timestamp(b"2026-10-03T23:58:10-00:00"), Some(F1));
        assert_eq!(parse_timestamp(b"2026-10-03T23:58:10+00:00"), Some(F1));
        assert_eq!(parse_timestamp(b"86400000"), Some(DAY_MS));
        assert_eq!(parse_timestamp(b"0"), Some(0));
        assert_eq!(parse_timestamp(b"1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(
            parse_timestamp(b"2028-02-29T00:00:00Z"),
            Some(days_from_civil(2028, 2, 29) * DAY_MS)
        );
        assert_eq!(
            parse_timestamp(b"2026-10-03T23:58:10+23:59"),
            Some(F1 - 23 * HOUR_MS - 59 * MINUTE_MS)
        );
    }

    #[test]
    fn bad_forms() {
        for bad in [
            &b""[..],
            b"2026-10-03T23:58:10z",
            b"2026-10-03t23:58:10Z",
            b"2026-10-03 23:58:10Z",
            b"2026-10-03T23:58:10",
            b"2026-10-03T23:58:10.000Z",
            b"2026-10-03T23:58:10+0200",
            b"2026-10-03T23:58:10+24:00",
            b"2026-10-03T23:58:10+05:60",
            b"2026-13-03T23:58:10Z",
            b"2026-00-03T23:58:10Z",
            b"2026-02-29T23:58:10Z",
            b"2100-02-29T23:58:10Z",
            b"2026-02-30T23:58:10Z",
            b"2026-04-31T23:58:10Z",
            b"2026-10-00T23:58:10Z",
            b"2026-10-03T24:00:00Z",
            b"2026-10-03T23:60:10Z",
            b"2026-10-03T23:58:60Z",
            b"1791071890000.0",
            b"1.79e12",
            b"-5",
            b"+5",
            b" 1791071890000",
            b"1791071890000\r",
            b"2026-10-03T23:58:10Z\r",
            b"99999999999999999999999",
            "\u{0662}\u{0665}\u{0660}".as_bytes(),
            "２026-10-03T23:58:10Z".as_bytes(),
            b"2026-10-03T23:58:1OZ",
            b"2026/10/03T23:58:10Z",
        ] {
            assert_eq!(parse_timestamp(bad), None, "{}", String::from_utf8_lossy(bad));
        }
        assert_eq!(
            parse_timestamp(b"2000-02-29T00:00:00Z"),
            Some(days_from_civil(2000, 2, 29) * DAY_MS)
        );
    }

    #[test]
    fn civil_days() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(1969, 12, 31), -1);
        assert_eq!(days_from_civil(2000, 3, 1), 11_017);
        assert_eq!(day_of(-1), -1);
    }
}
