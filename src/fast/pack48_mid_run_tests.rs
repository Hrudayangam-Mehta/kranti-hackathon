use super::*;
use super::raw48_tests::context;
use ::parquet::basic::Encoding;
use ::parquet::file::reader::FileReader;
use ::parquet::file::serialized_reader::SerializedFileReader;
use ::parquet::record::Field;
use std::collections::BTreeMap;
use std::fs::{self, File};

#[test]
fn restored_person_ids_reach_dictionary_and_plain_output_without_hash_leakage() {
    struct OutputDir(PathBuf);
    impl Drop for OutputDir {
        fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); }
    }
    static NEXT: AtomicUsize = AtomicUsize::new(0);
    let nonce = NEXT.fetch_add(1, Ordering::Relaxed);
    let dir = OutputDir(std::env::temp_dir().join(format!(
        "sessions-pack48-mid-run-{}-{nonce}", std::process::id()
    )));
    fs::create_dir(&dir.0).unwrap();

    let mut ctx = context();
    ctx.p2_bits = 5;
    let names: [&[u8]; 12] = [
        b"u0", b"u00", b"u12345678", b"u000000001", b"u123456789ab",
        b"u0123456789abcdef0123456789abcdef",
        b"uffffffffffffffffffffffffffffffff", b"uABCDEFGH", b"uabc\0def",
        "u猫猫".as_bytes(), b"Opaque Name", b"u?`~",
    ];
    let keys: Vec<_> = names.iter().map(|name| ctx.users.encode(name)).collect();
    let alias = ctx.users.encode(b"uzzzzzzzzz");
    let people = People::build(&[(keys[0], alias)], &ctx.users);
    assert_eq!(people.name_of(alias), keys[0]);
    let mut arena = Arena::new();
    let parts = 1 << ctx.p2_bits;
    let mut events: Persons = Pair::new(parts, ctx.p2_block * 2, ctx.p2_block * 2 / 3);
    let mut emit = Emit {
        people: &people, bits: ctx.p2_bits, layout: PersonLayout::new(ctx.p2_bits),
        ring: [(Key::default(), 0, 0); RING], head: 0, len: 0, winners: 0,
    };
    // Input order differs from output partition/person order. Every canonical
    // person has three separate daily sessions, each joining a zero-payload
    // event with an exact purchase. The linked alias must restore the root ID.
    for day in (0..3u32).rev() {
        for (i, &key) in keys.iter().enumerate().rev() {
            let ts = WEEK_MS as u32 + day * DAY_MS as u32;
            emit.push(if i == 0 { alias } else { key }, ts, 0, &mut events, &mut arena);
            emit.push(key, ts + 1000, i as u32 + 1, &mut events, &mut arena);
        }
    }
    emit.flush(&mut events, &mut arena);
    assert_eq!(emit.winners, 72);
    events.finish(&mut arena);
    assert_eq!((0..parts).map(|p| events.a.len(p)).sum::<usize>(), 12);
    assert_eq!((0..parts).map(|p| events.b.len(p)).sum::<usize>(), 60);
    let mut clicks: Clicks = Pair::new(parts, ctx.click_block, ctx.click_block / 2);
    clicks.finish(&mut arena);
    let mut worker = Worker::new(&ctx);
    for p in 0..parts {
        if events.len(p) > 0 { worker.partition(&ctx, &[&events], &[&clicks], p); }
    }
    assert_eq!(worker.rows.totals(), [36, 36, 72, 234]);

    let categories: [&[u8]; 1] = [b"category"];
    write::user_part(&dir.0, 0, &worker.rows, 0..36, &categories, ctx.first_day, &ctx.users).unwrap();
    let reader = SerializedFileReader::new(File::open(dir.0.join("part-00000.parquet")).unwrap()).unwrap();
    assert!(reader.metadata().row_group(0).column(0).dictionary_page_offset().is_some());
    let actual: Vec<_> = reader.get_row_iter(None).unwrap()
        .map(|row| row.unwrap().into_columns()).collect();
    let mut expected = BTreeMap::new();
    for (i, name) in names.iter().enumerate() {
        for day in 0..3i32 {
            expected.insert((std::str::from_utf8(name).unwrap().to_owned(), ctx.first_day as i32 + day), i as i64 + 1);
        }
    }
    for row in &actual {
        let name = match &row[0].1 { Field::Str(value) => value.clone(), _ => panic!("user_id must be text") };
        let day = match &row[1].1 { Field::Date(value) => *value, _ => panic!("day must be DATE") };
        let revenue = expected.remove(&(name.clone(), day)).expect("exactly one row per original ID and day");
        assert_eq!(row, &vec![
            ("user_id".into(), Field::Str(name)), ("day".into(), Field::Date(day)),
            ("sessions".into(), Field::Int(1)), ("events".into(), Field::Int(2)),
            ("revenue_cents".into(), Field::Long(revenue)),
            ("top_category".into(), Field::Str("category".into())),
        ]);
    }
    assert!(expected.is_empty());

    // Slice endpoints cut existing runs. Both dictionary and PLAIN paths must
    // use immutable absolute row positions, including a zero-row job.
    for (file, (range, dictionary)) in [
        (2..35, true), (2..31, false), (3..3, false),
    ].into_iter().enumerate() {
        let file = file + 1;
        write::user_part(&dir.0, file, &worker.rows, range.clone(), &categories, ctx.first_day, &ctx.users).unwrap();
        let reader = SerializedFileReader::new(File::open(dir.0.join(format!("part-{file:05}.parquet"))).unwrap()).unwrap();
        assert_eq!(reader.metadata().file_metadata().num_rows(), range.len() as i64);
        if !range.is_empty() {
            let column = reader.metadata().row_group(0).column(0);
            assert_eq!(column.dictionary_page_offset().is_some(), dictionary);
            assert_eq!(column.encodings().any(|encoding| encoding == Encoding::RLE_DICTIONARY), dictionary);
        }
        let rows: Vec<_> = reader.get_row_iter(None).unwrap()
            .map(|row| row.unwrap().into_columns()).collect();
        assert_eq!(rows.as_slice(), &actual[range]);
    }
    arena.release();
}
