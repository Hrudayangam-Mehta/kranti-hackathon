use std::path::Path;

use super::id::{Domain, Key};
use super::parquet::{self, put_i32, put_i64, put_str, Column, Dictionary, Kind};
use crate::input::Result;

// Row ends are cumulative within a Part, with no u32 limit on the producer.
// A range can begin/end inside a run; dictionary ends are checked separately.
struct PersonRun {
    person: Key,
    end: usize,
}

#[derive(Default)]
pub struct Part {
    person_runs: Vec<PersonRun>,
    days: Vec<u32>,
    sessions: Vec<u64>,
    events: Vec<u64>,
    revenue: Vec<u64>,
    top: Vec<u8>,
    pub cells: Vec<[u64; 4]>,
}

// The canonical pipeline emits all days for each person together, processes each
// canonical partition once, and slices only contiguous output ranges. Thus
// each run here is one unique dictionary entry, including a sliced first/last
// run. This private helper relies on that producer invariant, not on duplicate
// dictionary values being accepted by every Parquet reader.
fn user_dictionary(runs: &[PersonRun], range: std::ops::Range<usize>, domain: &Domain) -> Option<Dictionary> {
    let rows = range.end.checked_sub(range.start)?;
    if rows < 32 || rows > u32::MAX as usize {
        return None;
    }
    if runs.is_empty() || runs.len() > rows / 2 || runs.len() > i32::MAX as usize {
        return None;
    }
    let mut values = Vec::with_capacity(runs.len().checked_mul(16)?);
    let mut run_ends = Vec::with_capacity(runs.len());
    for run in runs {
        let offset = values.len();
        values.extend_from_slice(&[0; 4]);
        domain.bytes_of(run.person, &mut values);
        let len = u32::try_from(values.len() - offset - 4).ok()?;
        values[offset..offset + 4].copy_from_slice(&len.to_le_bytes());
        if values.len() > i32::MAX as usize {
            return None;
        }
        let end = run.end.min(range.end).checked_sub(range.start)?;
        run_ends.push(u32::try_from(end).ok()?);
    }
    debug_assert_eq!(run_ends.last().copied().map(|end| end as usize), Some(rows));
    Some(Dictionary { values, run_ends })
}

fn append_plain_names(runs: &[PersonRun], range: std::ops::Range<usize>, out: &mut Vec<u8>, domain: &Domain) {
    if range.is_empty() {
        return;
    }
    let first = runs.partition_point(|run| run.end <= range.start);
    let mut at = range.start;
    for run in &runs[first..] {
        let end = run.end.min(range.end);
        debug_assert!(end > at);
        // Render once for this run's page fragment, then expand the exact
        // PLAIN bytes. The offsets remain valid if extend_from_within grows
        // the Vec; no pointer or mutable callback cursor is retained.
        let encoded_start = out.len();
        out.extend_from_slice(&[0; 4]);
        domain.bytes_of(run.person, out);
        let encoded_end = out.len();
        let len = (encoded_end - encoded_start - 4) as u32;
        out[encoded_start..encoded_start + 4].copy_from_slice(&len.to_le_bytes());
        for _ in 1..end - at {
            out.extend_from_within(encoded_start..encoded_end);
        }
        at = end;
        if at == range.end {
            break;
        }
    }
    debug_assert_eq!(at, range.end);
}

impl Part {
    pub fn len(&self) -> usize {
        self.days.len()
    }

    fn runs_for(&self, range: std::ops::Range<usize>) -> &[PersonRun] {
        assert!(range.start <= range.end && range.end <= self.len());
        if range.is_empty() {
            return &self.person_runs[..0];
        }
        // Include the first end strictly after start and the last end at or
        // after end. Exact run boundaries must not include an adjacent run.
        let first = self.person_runs.partition_point(|run| run.end <= range.start);
        let last = self.person_runs.partition_point(|run| run.end < range.end) + 1;
        &self.person_runs[first..last]
    }

    pub fn clear(&mut self) {
        self.person_runs.clear();
        self.days.clear();
        self.sessions.clear();
        self.events.clear();
        self.revenue.clear();
        self.top.clear();
    }

    pub fn totals(&self) -> [u64; 4] {
        [
            self.days.len() as u64,
            self.sessions.iter().sum(),
            self.events.iter().sum(),
            self.revenue.iter().sum(),
        ]
    }

    #[inline]
    pub fn push(&mut self, person: Key, day: u32, row: [u64; 3], top: u8) {
        self.days.push(day);
        let end = self.days.len();
        match self.person_runs.last_mut() {
            Some(last) if last.person == person => last.end = end,
            _ => self.person_runs.push(PersonRun { person, end }),
        }
        self.sessions.push(row[0]);
        self.events.push(row[1]);
        self.revenue.push(row[2]);
        self.top.push(top);
    }
}

pub fn user_part(
    dir: &Path,
    id: usize,
    part: &Part,
    range: std::ops::Range<usize>,
    categories: &[&[u8]],
    first_day: i64,
    domain: &Domain,
) -> Result<()> {
    let base = range.start;
    let rows = range.len();
    let runs = part.runs_for(range.clone());
    let dictionary = user_dictionary(runs, range, domain);
    let names = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        append_plain_names(runs, base + a..base + b, out, domain);
    };
    let days = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &d in &part.days[base + a..base + b] {
            put_i32(out, (first_day + i64::from(d)) as i32);
        }
    };
    let sessions = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.sessions[base + a..base + b] {
            put_i32(out, v as i32);
        }
    };
    let events = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.events[base + a..base + b] {
            put_i32(out, v as i32);
        }
    };
    let revenue = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for &v in &part.revenue[base + a..base + b] {
            put_i64(out, v as i64);
        }
    };
    let top = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
        for &t in &part.top[base + a..base + b] {
            if t == u8::MAX {
                defs.push(0);
            } else {
                defs.push(1);
                put_str(out, categories[t as usize]);
            }
        }
    };
    let columns = [
        Column { name: "user_id", kind: Kind::Str, fill: &names, dictionary: dictionary.as_ref() },
        Column { name: "day", kind: Kind::Date, fill: &days, dictionary: None },
        Column { name: "sessions", kind: Kind::I32, fill: &sessions, dictionary: None },
        Column { name: "events", kind: Kind::I32, fill: &events, dictionary: None },
        Column { name: "revenue_cents", kind: Kind::I64, fill: &revenue, dictionary: None },
        Column { name: "top_category", kind: Kind::OptStr, fill: &top, dictionary: None },
    ];
    parquet::write(&dir.join(format!("part-{id:05}.parquet")), &columns, rows)
}

#[allow(clippy::too_many_arguments)]
pub fn campaign_table(
    dir: &Path,
    file: usize,
    parts: &[&[[u64; 4]]],
    campaigns: std::ops::Range<usize>,
    ids: &[&[u8]],
    channels: &[&[u8]],
    organic: &[u8],
    first_day: i64,
    days: usize,
) -> Result<[u64; 4]> {
    let from = campaigns.start * days;
    let to = campaigns.end * days;
    let mut total = vec![[0u64; 4]; to - from];
    for part in parts {
        for (t, c) in total.iter_mut().zip(part[from..to].iter()) {
            for k in 0..4 {
                t[k] += c[k];
            }
        }
    }
    let mut sums = [0u64; 4];
    for (i, cell) in total.iter().enumerate() {
        sums[0] += cell[0];
        sums[1] += cell[2];
        sums[2] += cell[3];
        if campaigns.start + i / days.max(1) != ids.len() {
            sums[3] += cell[0];
        }
    }
    let mut rows: Vec<(usize, usize, [u64; 4])> = Vec::new();
    for campaign in campaigns.clone() {
        for day in 0..days {
            let cell = total[(campaign - campaigns.start) * days + day];
            if cell[0] > 0 || cell[3] > 0 {
                rows.push((campaign, day, cell));
            }
        }
    }
    if rows.is_empty() && file > 0 {
        return Ok(sums);
    }
    let rows = &rows;
    let id = |c: usize| if c < ids.len() { ids[c] } else { organic };
    let channel = |c: usize| if c < ids.len() { channels[c] } else { organic };
    let ids_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_str(out, id(r.0));
        }
    };
    let channel_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_str(out, channel(r.0));
        }
    };
    let day_col = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_i32(out, (first_day + r.1 as i64) as i32);
        }
    };
    let count = |k: usize| {
        move |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for r in &rows[a..b] {
                put_i32(out, r.2[k] as i32);
            }
        }
    };
    let sessions = count(0);
    let purchasing = count(1);
    let assisted = count(3);
    let revenue = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
        for r in &rows[a..b] {
            put_i64(out, r.2[2] as i64);
        }
    };
    let columns = [
        Column { name: "campaign_id", kind: Kind::Str, fill: &ids_col, dictionary: None },
        Column { name: "channel", kind: Kind::Str, fill: &channel_col, dictionary: None },
        Column { name: "day", kind: Kind::Date, fill: &day_col, dictionary: None },
        Column { name: "sessions", kind: Kind::I32, fill: &sessions, dictionary: None },
        Column { name: "purchasing_sessions", kind: Kind::I32, fill: &purchasing, dictionary: None },
        Column { name: "revenue_cents", kind: Kind::I64, fill: &revenue, dictionary: None },
        Column { name: "assisted_sessions", kind: Kind::I32, fill: &assisted, dictionary: None },
    ];
    parquet::write(&dir.join(format!("part-{file:05}.parquet")), &columns, rows.len())?;
    Ok(sums)
}

pub fn report(users: [u64; 4], campaigns: [u64; 4]) {
    let [rows, user_sessions, user_events, user_revenue] = users;
    let [sessions, revenue, assisted, credited] = campaigns;
    eprintln!("surviving events {user_events}, user_daily rows {rows}");
    eprintln!("sessions {user_sessions} / {sessions}, revenue {user_revenue} / {revenue}, assisted {assisted} >= {credited}");
    if user_sessions != sessions || user_revenue != revenue || assisted < credited {
        eprintln!("warning: self-check failed");
    }
}

#[cfg(test)]
mod dict8_tests {
    use super::*;
    use std::fs::{self, File};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use ::parquet::basic::Encoding;
    use ::parquet::file::reader::FileReader;
    use ::parquet::file::serialized_reader::SerializedFileReader;
    use ::parquet::record::Field;

    fn plain_names(dictionary: &Dictionary) -> Vec<Vec<u8>> {
        let mut at = 0;
        let mut names = Vec::new();
        while at < dictionary.values.len() {
            let len = u32::from_le_bytes(dictionary.values[at..at + 4].try_into().unwrap()) as usize;
            at += 4;
            names.push(dictionary.values[at..at + len].to_vec());
            at += len;
        }
        names
    }

    fn part_from_persons(persons: &[Key]) -> Part {
        let mut part = Part::default();
        for (i, &person) in persons.iter().enumerate() {
            part.push(person, i as u32, [1, 1, 0], u8::MAX);
        }
        part
    }

    fn dictionary_from_persons(persons: &[Key], domain: &Domain) -> Option<Dictionary> {
        let part = part_from_persons(persons);
        let range = 0..part.len();
        user_dictionary(part.runs_for(range.clone()), range, domain)
    }

    #[test]
    fn dict8_run_dictionary_heuristic_and_relative_ends() {
        let domain = Domain::with_prefix(b'u');
        let one = domain.encode(b"u1");
        for rows in [0, 1, 31] {
            assert!(dictionary_from_persons(&vec![one; rows], &domain).is_none());
        }
        let dictionary = dictionary_from_persons(&vec![one; 32], &domain).unwrap();
        assert_eq!(dictionary.run_ends, [32]);
        assert_eq!(plain_names(&dictionary), [b"u1".to_vec()]);
        let distinct: Vec<Key> = (0..32).map(|i| domain.encode(format!("u{i}").as_bytes())).collect();
        assert!(dictionary_from_persons(&distinct, &domain).is_none());
        let paired: Vec<Key> = distinct[..16].iter().flat_map(|&key| [key, key]).collect();
        let dictionary = dictionary_from_persons(&paired, &domain).unwrap();
        assert_eq!(dictionary.run_ends, (1..=16).map(|i| i * 2).collect::<Vec<u32>>());
        assert_eq!(plain_names(&dictionary), (0..16).map(|i| format!("u{i}").into_bytes()).collect::<Vec<_>>());
        let mut too_many = paired;
        too_many.push(distinct[16]);
        assert!(dictionary_from_persons(&too_many, &domain).is_none());

        let names: [&[u8]; 6] = [b"u0", b"u00", b"u0123456789abcdef0123456789abcdef", b"Upper Case", b" leading space", "用户".as_bytes()];
        let persons: Vec<Key> = names.iter().flat_map(|name| [domain.encode(name); 12]).collect();
        let part = part_from_persons(&persons);
        let dictionary = user_dictionary(part.runs_for(17..53), 17..53, &domain).unwrap();
        assert_eq!(dictionary.run_ends, [7, 19, 31, 36]);
        assert_eq!(plain_names(&dictionary), names[1..5].iter().map(|name| name.to_vec()).collect::<Vec<_>>());
    }

    #[test]
    fn dict8_user_part_nonzero_slices_split_runs_reader_roundtrip() {
        struct OutputDir(std::path::PathBuf);
        impl Drop for OutputDir {
            fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); }
        }
        static NEXT: AtomicUsize = AtomicUsize::new(0);
        let nonce = NEXT.fetch_add(1, Ordering::Relaxed);
        let dir = OutputDir(std::env::temp_dir().join(format!("sessions-dict8-users-{}-{nonce}", std::process::id())));
        fs::create_dir(&dir.0).unwrap();
        let domain = Domain::with_prefix(b'u');
        let names: [&[u8]; 6] = [b"u0", b"u00", b"u0123456789abcdef0123456789abcdef", b"Upper Case", b" leading space", "用户".as_bytes()];
        let categories: [&[u8]; 2] = [b"", "é".as_bytes()];
        let first_day = -20i64;
        let mut part = Part::default();
        for i in 0..72usize {
            part.push(domain.encode(names[i / 12]), i as u32,
                [i as u64 + 1, i as u64 + 2, 9_000_000_000 + i as u64],
                if i % 3 == 0 { u8::MAX } else { (i % 2) as u8 });
        }
        for (file, (range, expect_dictionary)) in [
            (17..17, false), (17..18, false), (17..48, false),
            (17..49, true), (17..53, true), (5..69, true),
        ].into_iter().enumerate() {
            user_part(&dir.0, file, &part, range.clone(), &categories, first_day, &domain).unwrap();
            let reader = SerializedFileReader::new(File::open(dir.0.join(format!("part-{file:05}.parquet"))).unwrap()).unwrap();
            assert_eq!(reader.metadata().file_metadata().num_rows(), range.len() as i64);
            assert_eq!(reader.num_row_groups(), usize::from(!range.is_empty()));
            if !range.is_empty() {
                for (index, column) in reader.metadata().row_group(0).columns().iter().enumerate() {
                    let expected = index == 0 && expect_dictionary;
                    assert_eq!(column.dictionary_page_offset().is_some(), expected);
                    assert_eq!(column.encodings().any(|e| e == Encoding::RLE_DICTIONARY), expected);
                }
            }
            let mut rows = reader.get_row_iter(None).unwrap();
            for i in range {
                let top = if i % 3 == 0 { Field::Null }
                    else { Field::Str(std::str::from_utf8(categories[i % 2]).unwrap().to_owned()) };
                assert_eq!(rows.next().unwrap().unwrap().into_columns(), vec![
                    ("user_id".into(), Field::Str(std::str::from_utf8(names[i / 12]).unwrap().to_owned())),
                    ("day".into(), Field::Date((first_day + i as i64) as i32)),
                    ("sessions".into(), Field::Int(i as i32 + 1)),
                    ("events".into(), Field::Int(i as i32 + 2)),
                    ("revenue_cents".into(), Field::Long(9_000_000_000 + i as i64)),
                    ("top_category".into(), top),
                ], "source row {i}");
            }
            assert!(rows.next().is_none());
        }
    }

    #[test]
    fn c10d_run_dictionary_renders_raw_extended_hex_and_opaque_ids() {
        let domain = Domain::with_prefix(b'u');
        let names: [&[u8]; 11] = [
            b"u", b"u0", b"u12345678", b"u123456789", b"u123456789ab",
            b"uABCDEFGH", "u猫猫".as_bytes(), b"uabc\0def",
            b"u00000000000000000000000000000001",
            b"uffffffffffffffffffffffffffffffff", b"Opaque Name",
        ];
        let persons: Vec<Key> = names.iter().flat_map(|name| [domain.encode(name); 20]).collect();
        let slice = &persons[3..persons.len() - 5];
        let part = part_from_persons(&persons);
        let range = 3..persons.len() - 5;
        let dictionary = user_dictionary(part.runs_for(range.clone()), range, &domain).unwrap();
        assert_eq!(plain_names(&dictionary), names.iter().map(|name| name.to_vec()).collect::<Vec<_>>());
        assert_eq!(dictionary.run_ends[0], 17);
        assert_eq!(dictionary.run_ends.last().copied(), Some(slice.len() as u32));
        assert!(dictionary.run_ends.windows(2).all(|ends| ends[0] < ends[1]));
    }
}

#[cfg(test)]
mod runpart_tests {
    use super::*;
    use std::fs::{self, File};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use ::parquet::basic::Encoding;
    use ::parquet::file::reader::FileReader;
    use ::parquet::file::serialized_reader::SerializedFileReader;
    use ::parquet::record::Field;

    // This oracle stores one independent identity and numeric tuple per row.
    // It never reads Part's runs or numeric arrays to reconstruct expectations.
    struct OracleRow {
        name: usize,
        day: u32,
        counts: [u64; 3],
        top: u8,
    }

    fn expanded_part(names: &[Vec<u8>], ids: impl IntoIterator<Item = usize>, domain: &Domain)
        -> (Part, Vec<OracleRow>, Vec<Key>)
    {
        let mut part = Part::default();
        let mut rows = Vec::new();
        let mut keys = Vec::new();
        for (i, name) in ids.into_iter().enumerate() {
            let row = OracleRow {
                name, day: i as u32,
                counts: [i as u64 % 5 + 1, i as u64 % 23 + 13, 9_000_000_000 + i as u64 * 17],
                top: if i % 3 == 0 { u8::MAX } else { (i % 2) as u8 },
            };
            let key = domain.encode(&names[name]);
            part.push(key, row.day, row.counts, row.top);
            rows.push(row);
            keys.push(key);
        }
        (part, rows, keys)
    }

    // Frozen C10d's expanded-key dictionary algorithm is a test-only control.
    // Keep its two row scans independent of the run-based implementation.
    fn expanded_dictionary_oracle(persons: &[Key], domain: &Domain) -> Option<Dictionary> {
        if persons.len() < 32 || persons.len() > u32::MAX as usize {
            return None;
        }
        let runs = 1 + persons.windows(2).filter(|pair| pair[0] != pair[1]).count();
        if runs > persons.len() / 2 || runs > i32::MAX as usize {
            return None;
        }
        let mut values = Vec::with_capacity(runs.checked_mul(16)?);
        let mut run_ends = Vec::with_capacity(runs);
        let mut at = 0;
        while at < persons.len() {
            let person = persons[at];
            let mut end = at + 1;
            while end < persons.len() && persons[end] == person {
                end += 1;
            }
            let offset = values.len();
            values.extend_from_slice(&[0; 4]);
            domain.bytes_of(person, &mut values);
            let len = u32::try_from(values.len() - offset - 4).ok()?;
            values[offset..offset + 4].copy_from_slice(&len.to_le_bytes());
            if values.len() > i32::MAX as usize {
                return None;
            }
            run_ends.push(end as u32);
            at = end;
        }
        Some(Dictionary { values, run_ends })
    }

    struct OutputDir(std::path::PathBuf);

    impl OutputDir {
        fn new() -> Self {
            static NEXT: AtomicUsize = AtomicUsize::new(0);
            let nonce = NEXT.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!("sessions-runpart-{}-{nonce}", std::process::id()));
            fs::create_dir(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for OutputDir {
        fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); }
    }

    fn check_file(dir: &OutputDir, file: usize, part: &Part, rows: &[OracleRow], names: &[Vec<u8>],
                  range: std::ops::Range<usize>, dictionary: bool, domain: &Domain) {
        let categories: [&[u8]; 2] = [b"", "é".as_bytes()];
        let first_day = -20_000i64;
        user_part(&dir.0, file, part, range.clone(), &categories, first_day, domain).unwrap();
        let reader = SerializedFileReader::new(File::open(dir.0.join(format!("part-{file:05}.parquet"))).unwrap()).unwrap();
        assert_eq!(reader.metadata().file_metadata().num_rows(), range.len() as i64);
        assert_eq!(reader.num_row_groups(), usize::from(!range.is_empty()));
        if !range.is_empty() {
            for (index, column) in reader.metadata().row_group(0).columns().iter().enumerate() {
                let expected = index == 0 && dictionary;
                assert_eq!(column.dictionary_page_offset().is_some(), expected);
                assert_eq!(column.encodings().any(|encoding| encoding == Encoding::RLE_DICTIONARY), expected);
            }
        }
        let mut actual = reader.get_row_iter(None).unwrap();
        for (index, row) in rows[range.clone()].iter().enumerate() {
            let top = if row.top == u8::MAX { Field::Null }
                else { Field::Str(std::str::from_utf8(categories[row.top as usize]).unwrap().to_owned()) };
            assert_eq!(actual.next().unwrap().unwrap().into_columns(), vec![
                ("user_id".into(), Field::Str(std::str::from_utf8(&names[row.name]).unwrap().to_owned())),
                ("day".into(), Field::Date((first_day + i64::from(row.day)) as i32)),
                ("sessions".into(), Field::Int(row.counts[0] as i32)),
                ("events".into(), Field::Int(row.counts[1] as i32)),
                ("revenue_cents".into(), Field::Long(row.counts[2] as i64)),
                ("top_category".into(), top),
            ], "file {file}, source row {}", range.start + index);
        }
        assert!(actual.next().is_none());
    }

    #[test]
    fn runpart_push_clear_and_totals_match_expanded_rows() {
        let domain = Domain::with_prefix(b'u');
        let names = vec![b"u1".to_vec(), b"u2".to_vec()];
        let (mut part, rows, keys) = expanded_part(&names, [0, 0, 1, 1, 1, 0], &domain);
        assert_eq!(part.len(), rows.len());
        assert_eq!(part.person_runs.iter().map(|run| run.end).collect::<Vec<_>>(), [2, 5, 6]);
        assert_eq!(part.person_runs.iter().map(|run| run.person).collect::<Vec<_>>(), [keys[0], keys[2], keys[5]]);
        assert_eq!(part.totals(), [rows.len() as u64,
            rows.iter().map(|row| row.counts[0]).sum(),
            rows.iter().map(|row| row.counts[1]).sum(),
            rows.iter().map(|row| row.counts[2]).sum()]);
        // The preexisting clear contract intentionally leaves campaign cells.
        part.cells.push([1, 2, 3, 4]);
        part.clear();
        assert_eq!(part.len(), 0);
        assert_eq!(part.totals(), [0; 4]);
        assert!(part.person_runs.is_empty());
        assert_eq!(part.cells, [[1, 2, 3, 4]]);
        part.push(keys[5], 9, [2, 3, 4], u8::MAX);
        part.push(keys[5], 10, [5, 6, 7], 0);
        assert_eq!(part.person_runs.len(), 1);
        assert_eq!(part.person_runs[0].end, 2);
        assert_eq!(part.totals(), [2, 7, 9, 11]);
    }

    #[test]
    fn runpart_all_small_slices_match_expanded_plain_name_oracle() {
        let domain = Domain::with_prefix(b'u');
        let names = vec![b"u".to_vec(), b"u00".to_vec(), b"u12345678".to_vec(),
            b"u123456789ab".to_vec(), "用户".as_bytes().to_vec(), b"uabc\0def".to_vec(),
            b"u00000000000000000000000000000001".to_vec(), vec![b'L'; 1025]];
        let ids = [0, 0, 1, 1, 1, 2, 0, 3, 3, 4, 4, 4, 4, 5, 6, 6, 7, 7];
        let (part, rows, _) = expanded_part(&names, ids, &domain);
        for start in 0..=rows.len() {
            for end in start..=rows.len() {
                let range = start..end;
                let selected = part.runs_for(range.clone());
                let mut expected = b"prefix".to_vec();
                for row in &rows[range.clone()] {
                    let name = &names[row.name];
                    expected.extend_from_slice(&(name.len() as u32).to_le_bytes());
                    expected.extend_from_slice(name);
                }
                for page in [1, 2, 5, 7, 65_536] {
                    let mut actual = b"prefix".to_vec();
                    let mut at = start;
                    while at < end {
                        let stop = (at + page).min(end);
                        append_plain_names(selected, at..stop, &mut actual, &domain);
                        at = stop;
                    }
                    append_plain_names(selected, end..end, &mut actual, &domain);
                    assert_eq!(actual, expected, "slice {range:?}, page {page}");
                }
            }
        }
    }

    #[test]
    fn runpart_dictionary_matches_frozen_expanded_row_oracle() {
        let domain = Domain::with_prefix(b'u');
        let names: Vec<Vec<u8>> = (0..18).map(|i| format!("u{i}").into_bytes()).collect();
        for lengths in [vec![1; names.len()], vec![2; names.len()],
                        vec![1, 31, 2, 12, 67, 3, 9, 1, 4, 5, 6, 2, 3, 4, 7, 8, 9, 10]] {
            let ids = lengths.iter().enumerate().flat_map(|(i, &length)| std::iter::repeat_n(i, length));
            let (part, rows, keys) = expanded_part(&names, ids, &domain);
            let mut cuts = vec![0, 1, 2, 15, 16, 17, 30, 31, 32, 33, 47, 48, rows.len() - 1, rows.len()];
            cuts.retain(|&cut| cut <= rows.len());
            cuts.sort_unstable();
            cuts.dedup();
            for &start in &cuts {
                for &end in cuts.iter().filter(|&&end| end >= start) {
                    let range = start..end;
                    let expected = expanded_dictionary_oracle(&keys[range.clone()], &domain);
                    let actual = user_dictionary(part.runs_for(range.clone()), range.clone(), &domain);
                    match (actual, expected) {
                        (None, None) => {}
                        (Some(actual), Some(expected)) => {
                            assert_eq!(actual.values, expected.values, "dictionary bytes for {range:?}");
                            assert_eq!(actual.run_ends, expected.run_ends, "dictionary ends for {range:?}");
                        }
                        _ => panic!("dictionary heuristic differs for {range:?}"),
                    }
                }
            }
        }
    }

    #[test]
    fn runpart_nonzero_slices_and_page_boundaries_reader_oracle() {
        const PAGE: usize = 65_536;
        let domain = Domain::with_prefix(b'u');
        let dir = OutputDir::new();
        let names = vec![b"u12345678".to_vec(), vec![b'L'; 4097], "用户".as_bytes().to_vec(), b"u0".to_vec()];
        let lengths = [17, PAGE - 17, PAGE + 3, 5];
        let ids = lengths.iter().enumerate().flat_map(|(i, &length)| std::iter::repeat_n(i, length));
        let (part, rows, _) = expanded_part(&names, ids, &domain);
        let end = rows.len();
        let cases = [(0..0, false), (0..1, false), (17..17, false), (17..48, false),
                     (17..49, true), (PAGE - 2..PAGE + 3, false), (3..end - 2, true), (end..end, false)];
        for (file, (range, dictionary)) in cases.into_iter().enumerate() {
            check_file(&dir, file, &part, &rows, &names, range, dictionary, &domain);
        }
        // One run per row forces the original PLAIN fallback across a page.
        let mut unique: Vec<Vec<u8>> = (0..PAGE + 5).map(|i| format!("uplain-{i:08}").into_bytes()).collect();
        unique[PAGE - 1].extend(std::iter::repeat_n(b'Z', 4097));
        let (part, rows, _) = expanded_part(&unique, 0..unique.len(), &domain);
        for (offset, range) in [0..0, 0..1, 3..rows.len(), PAGE - 2..rows.len(), 17..48, 17..49].into_iter().enumerate() {
            check_file(&dir, 20 + offset, &part, &rows, &unique, range, false, &domain);
        }
    }

    #[test]
    fn runpart_dictionary_endpoints_are_relative_and_checked_u32() {
        let domain = Domain::with_prefix(b'u');
        let Some(base) = (u32::MAX as usize).checked_add(17) else { return };
        let runs = [PersonRun { person: domain.encode(b"u0"), end: base + 17 },
                    PersonRun { person: domain.encode(b"u1"), end: base + 32 }];
        let dict = user_dictionary(&runs, base..base + 32, &domain).unwrap();
        assert_eq!(dict.run_ends, [17, 32]);
        let too_long = [PersonRun { person: domain.encode(b"u0"), end: base }];
        assert!(user_dictionary(&too_long, 0..base, &domain).is_none());
        assert!(user_dictionary(&[], base..base, &domain).is_none());
    }
}
