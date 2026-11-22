use std::fs::{self, File, Permissions};
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use crate::input::Result;

const PAGE_ROWS: usize = 1 << 16;

#[derive(Clone, Copy, PartialEq)]
pub enum Kind {
    Str,
    OptStr,
    Date,
    I32,
    I64,
}

pub struct Column<'a> {
    pub name: &'a str,
    pub kind: Kind,
    // Fill callbacks append to out, which may already contain file bytes.
    // Required numeric kinds append one plain value per row and no definitions.
    pub fill: &'a (dyn Fn(usize, usize, &mut Vec<u8>, &mut Vec<u8>) + Sync),
    pub dictionary: Option<&'a Dictionary>,
}

// One PLAIN value and cumulative row end per contiguous run. Entry i is used
// from run_ends[i - 1] (or zero) through run_ends[i], without a per-row index.
pub struct Dictionary {
    pub values: Vec<u8>,
    pub run_ends: Vec<u32>,
}

struct Thrift {
    out: Vec<u8>,
    last: Vec<i16>,
}

impl Thrift {
    fn new() -> Thrift {
        Thrift {
            out: Vec::with_capacity(4096),
            last: vec![0],
        }
    }

    fn varint(&mut self, mut v: u64) {
        while v >= 0x80 {
            self.out.push(v as u8 | 0x80);
            v >>= 7;
        }
        self.out.push(v as u8);
    }

    fn field(&mut self, id: i16, ty: u8) {
        let last = self.last.last_mut().unwrap();
        let delta = id - *last;
        *last = id;
        if delta > 0 && delta <= 15 {
            self.out.push((delta as u8) << 4 | ty);
        } else {
            self.out.push(ty);
            let z = ((i32::from(id) << 1) ^ (i32::from(id) >> 31)) as u32;
            self.varint(u64::from(z));
        }
    }

    fn i32(&mut self, id: i16, v: i32) {
        self.field(id, 5);
        self.varint(u64::from(((v << 1) ^ (v >> 31)) as u32));
    }

    fn i64(&mut self, id: i16, v: i64) {
        self.field(id, 6);
        self.varint(((v << 1) ^ (v >> 63)) as u64);
    }

    fn binary(&mut self, id: i16, b: &[u8]) {
        self.field(id, 8);
        self.varint(b.len() as u64);
        self.out.extend_from_slice(b);
    }

    fn begin(&mut self, id: i16) {
        self.field(id, 12);
        self.last.push(0);
    }

    fn open(&mut self) {
        self.last.push(0);
    }

    fn end(&mut self) {
        self.out.push(0);
        self.last.pop();
    }

    fn list(&mut self, id: i16, elem: u8, n: usize) {
        self.field(id, 9);
        if n < 15 {
            self.out.push((n as u8) << 4 | elem);
        } else {
            self.out.push(0xf0 | elem);
            self.varint(n as u64);
        }
    }

    fn list_i32(&mut self, v: i32) {
        self.varint(u64::from(((v << 1) ^ (v >> 31)) as u32));
    }

    fn list_binary(&mut self, b: &[u8]) {
        self.varint(b.len() as u64);
        self.out.extend_from_slice(b);
    }
}

struct Chunk {
    offset: usize,
    data_offset: usize,
    dictionary: bool,
    size: usize,
    values: usize,
}

fn physical(kind: Kind) -> i32 {
    match kind {
        Kind::Str | Kind::OptStr => 6,
        Kind::Date | Kind::I32 => 1,
        Kind::I64 => 2,
    }
}

fn bit_pack(defs: &[u8], out: &mut Vec<u8>) {
    for run in defs.chunks(8 * 1024) {
        let groups = run.len().div_ceil(8);
        let mut header = Thrift::new();
        header.varint(((groups as u64) << 1) | 1);
        out.extend_from_slice(&header.out);
        for group in run.chunks(8) {
            let mut byte = 0u8;
            for (i, &d) in group.iter().enumerate() {
                byte |= (d & 1) << i;
            }
            out.push(byte);
        }
    }
}

// Dictionary indices have a one-byte bit width followed directly by hybrid
// RLE data, without the four-byte byte-length prefix used for v1 levels.
// Runs are clipped at page boundaries; a split run retains its dictionary ID.
fn dictionary_runs(dictionary: &Dictionary, start: usize, end: usize, run: &mut usize, out: &mut Vec<u8>) {
    let count = dictionary.run_ends.len() as u32;
    let bits = (u32::BITS - (count - 1).leading_zeros()).max(1);
    let bytes = bits.div_ceil(8) as usize;
    out.push(bits as u8);
    let mut at = start;
    while at < end {
        let run_end = dictionary.run_ends[*run] as usize;
        let stop = run_end.min(end);
        debug_assert!(stop > at);
        // PAGE_ROWS bounds every emitted run below the signed-i32 limit.
        let mut header = ((stop - at) as u64) << 1;
        while header >= 0x80 {
            out.push(header as u8 | 0x80);
            header >>= 7;
        }
        out.push(header as u8);
        out.extend_from_slice(&(*run as u32).to_le_bytes()[..bytes]);
        at = stop;
        if stop == run_end {
            *run += 1;
        }
    }
}

#[inline]
fn append_data_page_header(file: &mut Vec<u8>, rows: usize, size: usize, encoding: i32) {
    let mut header = Thrift::new();
    header.i32(1, 0);
    header.i32(2, size as i32);
    header.i32(3, size as i32);
    header.begin(5);
    header.i32(1, rows as i32);
    header.i32(2, encoding);
    header.i32(3, 3);
    header.i32(4, 3);
    header.end();
    header.out.push(0);
    file.extend_from_slice(&header.out);
}

pub fn encode(columns: &[Column], rows: usize) -> Vec<u8> {
    let mut file: Vec<u8> = Vec::with_capacity(rows * 48 + 4096);
    file.extend_from_slice(b"PAR1");
    let mut chunks: Vec<Chunk> = Vec::with_capacity(columns.len());
    let mut values: Vec<u8> = Vec::new();
    let mut defs: Vec<u8> = Vec::new();
    let mut levels: Vec<u8> = Vec::new();
    if rows > 0 {
        for column in columns {
            let offset = file.len();
            if let Some(dictionary) = column.dictionary {
                assert!(column.kind == Kind::Str && !dictionary.run_ends.is_empty());
                assert_eq!(dictionary.run_ends.last().copied().map(|end| end as usize), Some(rows));
                debug_assert!(dictionary.run_ends[0] > 0);
                debug_assert!(dictionary.run_ends.windows(2).all(|pair| pair[0] < pair[1]));
                let count = i32::try_from(dictionary.run_ends.len()).expect("dictionary entry count exceeds i32");
                let size = i32::try_from(dictionary.values.len()).expect("dictionary page exceeds i32");
                let mut header = Thrift::new();
                header.i32(1, 2);
                header.i32(2, size);
                header.i32(3, size);
                header.begin(7);
                header.i32(1, count);
                header.i32(2, 0);
                header.end();
                header.out.push(0);
                file.extend_from_slice(&header.out);
                file.extend_from_slice(&dictionary.values);
            }
            let data_offset = file.len();
            let fixed_width = match column.kind {
                Kind::Date | Kind::I32 => 4,
                Kind::I64 => 8,
                Kind::Str | Kind::OptStr => 0,
            };
            let mut start = 0;
            let mut dictionary_run = 0;
            while start < rows {
                let end = (start + PAGE_ROWS).min(rows);
                defs.clear();
                if fixed_width != 0 {
                    // C10a's required numeric path appends after its final page
                    // header. Dictionary strings use their separate branch.
                    // PAGE_ROWS bounds this body to 512 KiB; no levels apply.
                    let size = (end - start) * fixed_width;
                    append_data_page_header(&mut file, end - start, size, 0);
                    file.reserve(size);
                    let payload_start = file.len();
                    (column.fill)(start, end, &mut file, &mut defs);
                    debug_assert_eq!(file.len() - payload_start, size);
                    debug_assert!(defs.is_empty());
                } else {
                    values.clear();
                    if let Some(dictionary) = column.dictionary {
                        dictionary_runs(dictionary, start, end, &mut dictionary_run, &mut values);
                    } else {
                        (column.fill)(start, end, &mut values, &mut defs);
                    }
                    levels.clear();
                    if column.kind == Kind::OptStr {
                        let mut packed = Vec::with_capacity(defs.len() / 8 + 16);
                        bit_pack(&defs, &mut packed);
                        levels.extend_from_slice(&(packed.len() as u32).to_le_bytes());
                        levels.extend_from_slice(&packed);
                    }
                    let size = levels.len() + values.len();
                    let encoding = if column.dictionary.is_some() { 8 } else { 0 };
                    append_data_page_header(&mut file, end - start, size, encoding);
                    file.extend_from_slice(&levels);
                    file.extend_from_slice(&values);
                }
                start = end;
            }
            chunks.push(Chunk {
                offset,
                data_offset,
                dictionary: column.dictionary.is_some(),
                size: file.len() - offset,
                values: rows,
            });
        }
    }
    let mut meta = Thrift::new();
    meta.i32(1, 1);
    meta.list(2, 12, columns.len() + 1);
    meta.open();
    meta.binary(4, b"schema");
    meta.i32(5, columns.len() as i32);
    meta.end();
    for column in columns {
        meta.open();
        meta.i32(1, physical(column.kind));
        meta.i32(3, i32::from(column.kind == Kind::OptStr));
        meta.binary(4, column.name.as_bytes());
        match column.kind {
            Kind::Str | Kind::OptStr => {
                meta.i32(6, 0);
                meta.begin(10);
                meta.begin(1);
                meta.end();
                meta.end();
            }
            Kind::Date => {
                meta.i32(6, 6);
                meta.begin(10);
                meta.begin(6);
                meta.end();
                meta.end();
            }
            Kind::I32 | Kind::I64 => {}
        }
        meta.end();
    }
    meta.i64(3, rows as i64);
    if rows > 0 {
        let total: usize = chunks.iter().map(|c| c.size).sum();
        meta.list(4, 12, 1);
        meta.open();
        meta.list(1, 12, columns.len());
        for (column, chunk) in columns.iter().zip(&chunks) {
            meta.open();
            meta.i64(2, chunk.offset as i64);
            meta.begin(3);
            meta.i32(1, physical(column.kind));
            meta.list(2, 5, if chunk.dictionary { 3 } else { 2 });
            meta.list_i32(0);
            meta.list_i32(3);
            if chunk.dictionary {
                meta.list_i32(8);
            }
            meta.list(3, 8, 1);
            meta.list_binary(column.name.as_bytes());
            meta.i32(4, 0);
            meta.i64(5, chunk.values as i64);
            meta.i64(6, chunk.size as i64);
            meta.i64(7, chunk.size as i64);
            meta.i64(9, chunk.data_offset as i64);
            if chunk.dictionary {
                meta.i64(11, chunk.offset as i64);
            }
            meta.end();
            meta.end();
        }
        meta.i64(2, total as i64);
        meta.i64(3, rows as i64);
        meta.end();
    } else {
        meta.list(4, 12, 0);
    }
    meta.binary(6, b"sessions");
    meta.out.push(0);
    file.extend_from_slice(&meta.out);
    file.extend_from_slice(&(meta.out.len() as u32).to_le_bytes());
    file.extend_from_slice(b"PAR1");
    file
}

pub fn write(path: &Path, columns: &[Column], rows: usize) -> Result<()> {
    let bytes = encode(columns, rows);
    let mut file = File::create(path).map_err(|e| format!("{}: {e}", path.display()))?;
    file.write_all(&bytes)?;
    let _ = fs::set_permissions(path, Permissions::from_mode(0o666));
    Ok(())
}

#[inline]
pub fn put_i32(out: &mut Vec<u8>, v: i32) {
    out.extend_from_slice(&v.to_le_bytes());
}

#[inline]
pub fn put_i64(out: &mut Vec<u8>, v: i64) {
    out.extend_from_slice(&v.to_le_bytes());
}

#[inline]
pub fn put_str(out: &mut Vec<u8>, s: &[u8]) {
    out.extend_from_slice(&(s.len() as u32).to_le_bytes());
    out.extend_from_slice(s);
}

#[cfg(test)]
mod dict8_tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use ::parquet::basic::Encoding;
    use ::parquet::column::page::{Page, PageReader};
    use ::parquet::file::reader::FileReader;
    use ::parquet::file::serialized_reader::{SerializedFileReader, SerializedPageReader};
    use ::parquet::record::Field;

    struct TestFile(std::path::PathBuf);

    impl TestFile {
        fn new(bytes: &[u8]) -> Self {
            static NEXT: AtomicUsize = AtomicUsize::new(0);
            let nonce = NEXT.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!("sessions-dict8-page-{}-{nonce}.parquet", std::process::id()));
            fs::write(&path, bytes).unwrap();
            Self(path)
        }

        fn reader(&self) -> SerializedFileReader<File> {
            SerializedFileReader::new(File::open(&self.0).unwrap()).unwrap()
        }
    }

    impl Drop for TestFile {
        fn drop(&mut self) { let _ = fs::remove_file(&self.0); }
    }

    fn dictionary(names: &[Vec<u8>], ends: Vec<u32>) -> Dictionary {
        assert_eq!(names.len(), ends.len());
        let mut values = Vec::new();
        for name in names { put_str(&mut values, name); }
        Dictionary { values, run_ends: ends }
    }

    fn encoded(dictionary: &Dictionary) -> Vec<u8> {
        let fill = |_: usize, _: usize, _: &mut Vec<u8>, _: &mut Vec<u8>| -> () { panic!("dictionary column invoked plain callback") };
        let columns = [Column { name: "name", kind: Kind::Str, fill: &fill, dictionary: Some(dictionary) }];
        encode(&columns, dictionary.run_ends.last().copied().unwrap_or(0) as usize)
    }

    fn check_dictionary(dictionary: &Dictionary, names: &[Vec<u8>]) {
        let bytes = encoded(dictionary);
        let file = TestFile::new(&bytes);
        let reader = file.reader();
        let rows = dictionary.run_ends.last().copied().unwrap() as usize;
        assert_eq!(reader.metadata().file_metadata().num_rows(), rows as i64);
        assert_eq!(reader.num_row_groups(), 1);
        let meta = reader.metadata().row_group(0).column(0);
        assert_eq!(meta.dictionary_page_offset(), Some(4));
        assert!(meta.data_page_offset() > 4 + dictionary.values.len() as i64);
        assert_eq!(meta.compressed_size(), meta.uncompressed_size());
        assert_eq!(meta.num_values(), rows as i64);
        assert!(meta.encodings().any(|e| e == Encoding::PLAIN));
        assert!(meta.encodings().any(|e| e == Encoding::RLE_DICTIONARY));
        let footer_len = u32::from_le_bytes(bytes[bytes.len() - 8..bytes.len() - 4].try_into().unwrap()) as usize;
        let footer_at = bytes.len() - 8 - footer_len;
        assert_eq!(meta.byte_range(), (4, (footer_at - 4) as u64));

        let row_group = reader.get_row_group(0).unwrap();
        let mut pages = row_group.get_column_page_reader(0).unwrap();
        match pages.get_next_page().unwrap().unwrap() {
            Page::DictionaryPage { buf, num_values, encoding, is_sorted } => {
                assert_eq!(buf.as_ref(), dictionary.values.as_slice());
                assert_eq!(num_values as usize, names.len());
                assert_eq!(encoding, Encoding::PLAIN);
                assert!(!is_sorted);
            }
            other => panic!("first page was not a dictionary: {other:?}"),
        }
        let width = (32 - ((names.len() - 1) as u32).leading_zeros()).max(1) as u8;
        let mut consumed = 0usize;
        while let Some(page) = pages.get_next_page().unwrap() {
            match page {
                Page::DataPage { buf, num_values, encoding, .. } => {
                    assert_eq!(encoding, Encoding::RLE_DICTIONARY);
                    assert_eq!(buf[0], width);
                    assert_eq!(num_values as usize, (rows - consumed).min(PAGE_ROWS));
                    consumed += num_values as usize;
                }
                other => panic!("unexpected extra page: {other:?}"),
            }
        }
        assert_eq!(consumed, rows);

        // Start an independent page reader exactly at metadata.data_page_offset.
        // This catches an offset that still points at the dictionary header.
        let data_bytes = footer_at as i64 - meta.data_page_offset();
        let data_meta = (*meta).clone().into_builder()
            .set_dictionary_page_offset(None)
            .set_total_compressed_size(data_bytes)
            .set_total_uncompressed_size(data_bytes)
            .build().unwrap();
        let mut data_pages = SerializedPageReader::new(Arc::new(File::open(&file.0).unwrap()), &data_meta, rows, None).unwrap();
        assert!(matches!(data_pages.get_next_page().unwrap(), Some(Page::DataPage { encoding: Encoding::RLE_DICTIONARY, .. })));

        let mut run = 0usize;
        let mut seen = 0usize;
        for (i, row) in reader.get_row_iter(None).unwrap().enumerate() {
            while i >= dictionary.run_ends[run] as usize { run += 1; }
            let columns = row.unwrap().into_columns();
            assert_eq!(columns.len(), 1);
            assert_eq!(columns[0].0, "name");
            assert_eq!(columns[0].1, Field::Str(String::from_utf8(names[run].clone()).unwrap()), "row {i}");
            seen += 1;
        }
        assert_eq!(seen, rows);
    }

    #[test]
    fn dict8_rle_bytes_have_no_length_prefix_and_split_runs() {
        let dict = Dictionary { values: Vec::new(), run_ends: vec![3, 5, 9] };
        let mut run = 0;
        let mut all = Vec::new();
        dictionary_runs(&dict, 0, 9, &mut run, &mut all);
        assert_eq!(all, [2, 6, 0, 4, 1, 8, 2]);
        assert_eq!(run, 3);
        let mut run = 0;
        let mut first = Vec::new();
        dictionary_runs(&dict, 0, 4, &mut run, &mut first);
        assert_eq!(first, [2, 6, 0, 2, 1]);
        assert_eq!(run, 1);
        let mut second = Vec::new();
        dictionary_runs(&dict, 4, 9, &mut run, &mut second);
        assert_eq!(second, [2, 2, 1, 8, 2]);
        assert_eq!(run, 3);
    }

    #[test]
    fn dict8_single_entry_rle_varint_boundaries() {
        for (length, header) in [
            (1, vec![2]), (63, vec![126]), (64, vec![128, 1]),
            (8191, vec![254, 127]), (8192, vec![128, 128, 1]),
            (PAGE_ROWS as u32, vec![128, 128, 8]),
        ] {
            let dict = Dictionary { values: Vec::new(), run_ends: vec![length] };
            let mut run = 0;
            let mut actual = Vec::new();
            dictionary_runs(&dict, 0, length as usize, &mut run, &mut actual);
            let mut expected = vec![1];
            expected.extend(header);
            expected.push(0);
            assert_eq!(actual, expected, "run length {length}");
            assert_eq!(run, 1);
        }
    }

    #[test]
    fn dict8_cardinality_bit_width_boundaries_reader_roundtrip() {
        for count in [1, 2, 3, 4, 7, 8, 9, 255, 256, 257, 65_535, 65_536, 65_537] {
            let names: Vec<Vec<u8>> = (0..count).map(|i| format!("value-{i:05}").into_bytes()).collect();
            let dict = dictionary(&names, (1..=count as u32).collect());
            check_dictionary(&dict, &names);
        }
    }

    #[test]
    fn dict8_page_boundaries_and_dictionary_data_offsets() {
        for rows in [1, PAGE_ROWS - 1, PAGE_ROWS, PAGE_ROWS + 1, 2 * PAGE_ROWS + 1] {
            let names = vec![b"only".to_vec()];
            check_dictionary(&dictionary(&names, vec![rows as u32]), &names);
        }
        let names = vec![b"before".to_vec(), b"crossing".to_vec(), b"after".to_vec()];
        check_dictionary(&dictionary(&names, vec![(PAGE_ROWS - 1) as u32, (PAGE_ROWS + 2) as u32, (2 * PAGE_ROWS + 1) as u32]), &names);
    }

    #[test]
    fn dict8_mixed_dictionary_plain_nullable_and_signed_reader_roundtrip() {
        let dates = [-20_000i32, -1, 0, 20_000];
        let ints = [i32::MIN, -1, 0, i32::MAX];
        let longs = [i64::MIN, -1, 0, i64::MAX];
        for rows in [0, 1, 9, PAGE_ROWS + 1] {
            let first = rows.div_ceil(2);
            let names = if rows <= 1 { vec![b"first".to_vec()] } else { vec![b"first".to_vec(), b"second".to_vec()] };
            let ends = if rows <= 1 { vec![rows as u32] } else { vec![first as u32, rows as u32] };
            let dict = dictionary(&names, ends);
            let name = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
                for i in a..b { put_str(out, if i < first { b"first" } else { b"second" }); }
            };
            let optional = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
                for i in a..b {
                    defs.push(u8::from(i % 3 != 0));
                    if i % 3 == 1 { put_str(out, b""); }
                    if i % 3 == 2 { put_str(out, "é".as_bytes()); }
                }
            };
            let date = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| { for i in a..b { put_i32(out, dates[i % 4]); } };
            let int = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| { for i in a..b { put_i32(out, ints[i % 4]); } };
            let long = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| { for i in a..b { put_i64(out, longs[i % 4]); } };
            let columns = [
                Column { name: "name", kind: Kind::Str, fill: &name, dictionary: (rows > 0).then_some(&dict) },
                Column { name: "optional", kind: Kind::OptStr, fill: &optional, dictionary: None },
                Column { name: "day", kind: Kind::Date, fill: &date, dictionary: None },
                Column { name: "int", kind: Kind::I32, fill: &int, dictionary: None },
                Column { name: "long", kind: Kind::I64, fill: &long, dictionary: None },
            ];
            let bytes = encode(&columns, rows);
            let file = TestFile::new(&bytes);
            let reader = file.reader();
            assert_eq!(reader.num_row_groups(), usize::from(rows > 0));
            assert_eq!(reader.metadata().file_metadata().num_rows(), rows as i64);
            if rows > 0 {
                let metadata = reader.metadata().row_group(0);
                for (index, column) in metadata.columns().iter().enumerate() {
                    assert_eq!(column.dictionary_page_offset().is_some(), index == 0);
                    assert_eq!(column.encodings().any(|e| e == Encoding::RLE_DICTIONARY), index == 0);
                    if index + 1 < metadata.num_columns() {
                        let next = metadata.column(index + 1).byte_range().0;
                        assert_eq!(column.byte_range().0 + column.byte_range().1, next);
                    }
                }
            }
            let mut seen = 0;
            for (i, row) in reader.get_row_iter(None).unwrap().enumerate() {
                let expected_optional = match i % 3 { 0 => Field::Null, 1 => Field::Str(String::new()), _ => Field::Str("é".to_owned()) };
                assert_eq!(row.unwrap().into_columns(), vec![
                    ("name".into(), Field::Str(if i < first { "first" } else { "second" }.into())),
                    ("optional".into(), expected_optional), ("day".into(), Field::Date(dates[i % 4])),
                    ("int".into(), Field::Int(ints[i % 4])), ("long".into(), Field::Long(longs[i % 4])),
                ], "row {i}");
                seen += 1;
            }
            assert_eq!(seen, rows);
        }
    }

    #[test]
    fn dict8_duplicate_dictionary_entries_reader_compatibility() {
        // Production uses the stronger unique-run invariant. This is a reader
        // compatibility check, not a claim that every implementation accepts
        // dictionaries with duplicate values.
        let names = vec![b"repeat".to_vec(), b"other".to_vec(), b"repeat".to_vec()];
        check_dictionary(&dictionary(&names, vec![2, 3, 5]), &names);
    }

    #[test]
    fn c10d_dictionary_keeps_numeric_callbacks_direct_across_pages() {
        let rows = PAGE_ROWS + 1;
        let names = vec![b"first".to_vec(), b"crossing".to_vec()];
        let dict = dictionary(&names, vec![(PAGE_ROWS - 1) as u32, rows as u32]);
        let plain_name = |_: usize, _: usize, _: &mut Vec<u8>, _: &mut Vec<u8>| -> () {
            panic!("dictionary-backed name invoked the plain callback");
        };
        let optional = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
            for i in a..b {
                defs.push(u8::from(i % 2 != 0));
                if i % 2 != 0 { put_str(out, b""); }
            }
        };
        let calls = AtomicUsize::new(0);
        let dates = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
            assert!(out.starts_with(b"PAR1"), "DATE callback must see the final file prefix");
            assert!(defs.is_empty(), "nullable definitions leaked into required DATE");
            calls.fetch_add(1, Ordering::Relaxed);
            for i in a..b { put_i32(out, i as i32 - 20_000); }
        };
        let ints = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
            assert!(out.starts_with(b"PAR1"), "I32 callback must see the final file prefix");
            assert!(defs.is_empty());
            calls.fetch_add(1, Ordering::Relaxed);
            for i in a..b { put_i32(out, -(i as i32)); }
        };
        let longs = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
            assert!(out.starts_with(b"PAR1"), "I64 callback must see the final file prefix");
            assert!(defs.is_empty());
            calls.fetch_add(1, Ordering::Relaxed);
            for i in a..b { put_i64(out, i64::MIN + i as i64); }
        };
        let columns = [
            Column { name: "name", kind: Kind::Str, fill: &plain_name, dictionary: Some(&dict) },
            Column { name: "optional", kind: Kind::OptStr, fill: &optional, dictionary: None },
            Column { name: "day", kind: Kind::Date, fill: &dates, dictionary: None },
            Column { name: "int", kind: Kind::I32, fill: &ints, dictionary: None },
            Column { name: "long", kind: Kind::I64, fill: &longs, dictionary: None },
        ];
        let bytes = encode(&columns, rows);
        assert_eq!(calls.load(Ordering::Relaxed), 6);
        let file = TestFile::new(&bytes);
        let reader = file.reader();
        assert_eq!(reader.metadata().file_metadata().num_rows(), rows as i64);
        for (index, column) in reader.metadata().row_group(0).columns().iter().enumerate() {
            assert_eq!(column.dictionary_page_offset().is_some(), index == 0);
            assert_eq!(column.encodings().any(|encoding| encoding == Encoding::RLE_DICTIONARY), index == 0);
        }
    }
}


#[cfg(test)]
mod tests {
    // Keep the frozen buffered control independent of the production chunk's
    // dictionary-only bookkeeping; its emitted bytes remain the C8 control.
    struct BaselineChunk {
        offset: usize,
        size: usize,
        values: usize,
    }

    use super::*;

    // Frozen C8 buffered encode body. Keep this independent of the new page
    // header helper so the control detects byte, size, and offset changes.
    // Original parquet.rs SHA-256: 39380f94e5fdf1e9778a1afaef538f372487a9ce4e567fb8bf9bd5a7c3ff834c
    fn encode_buffered_c8(columns: &[Column], rows: usize) -> Vec<u8> {
        let mut file: Vec<u8> = Vec::with_capacity(rows * 48 + 4096);
        file.extend_from_slice(b"PAR1");
        let mut chunks: Vec<BaselineChunk> = Vec::with_capacity(columns.len());
        let mut values: Vec<u8> = Vec::new();
        let mut defs: Vec<u8> = Vec::new();
        let mut levels: Vec<u8> = Vec::new();
        if rows > 0 {
            for column in columns {
                let offset = file.len();
                let mut start = 0;
                while start < rows {
                    let end = (start + PAGE_ROWS).min(rows);
                    values.clear();
                    defs.clear();
                    (column.fill)(start, end, &mut values, &mut defs);
                    levels.clear();
                    if column.kind == Kind::OptStr {
                        let mut packed = Vec::with_capacity(defs.len() / 8 + 16);
                        bit_pack(&defs, &mut packed);
                        levels.extend_from_slice(&(packed.len() as u32).to_le_bytes());
                        levels.extend_from_slice(&packed);
                    }
                    let size = levels.len() + values.len();
                    let mut header = Thrift::new();
                    header.i32(1, 0);
                    header.i32(2, size as i32);
                    header.i32(3, size as i32);
                    header.begin(5);
                    header.i32(1, (end - start) as i32);
                    header.i32(2, 0);
                    header.i32(3, 3);
                    header.i32(4, 3);
                    header.end();
                    header.out.push(0);
                    file.extend_from_slice(&header.out);
                    file.extend_from_slice(&levels);
                    file.extend_from_slice(&values);
                    start = end;
                }
                chunks.push(BaselineChunk {
                    offset,
                    size: file.len() - offset,
                    values: rows,
                });
            }
        }
        let mut meta = Thrift::new();
        meta.i32(1, 1);
        meta.list(2, 12, columns.len() + 1);
        meta.open();
        meta.binary(4, b"schema");
        meta.i32(5, columns.len() as i32);
        meta.end();
        for column in columns {
            meta.open();
            meta.i32(1, physical(column.kind));
            meta.i32(3, i32::from(column.kind == Kind::OptStr));
            meta.binary(4, column.name.as_bytes());
            match column.kind {
                Kind::Str | Kind::OptStr => {
                    meta.i32(6, 0);
                    meta.begin(10);
                    meta.begin(1);
                    meta.end();
                    meta.end();
                }
                Kind::Date => {
                    meta.i32(6, 6);
                    meta.begin(10);
                    meta.begin(6);
                    meta.end();
                    meta.end();
                }
                Kind::I32 | Kind::I64 => {}
            }
            meta.end();
        }
        meta.i64(3, rows as i64);
        if rows > 0 {
            let total: usize = chunks.iter().map(|c| c.size).sum();
            meta.list(4, 12, 1);
            meta.open();
            meta.list(1, 12, columns.len());
            for (column, chunk) in columns.iter().zip(&chunks) {
                meta.open();
                meta.i64(2, chunk.offset as i64);
                meta.begin(3);
                meta.i32(1, physical(column.kind));
                meta.list(2, 5, 2);
                meta.list_i32(0);
                meta.list_i32(3);
                meta.list(3, 8, 1);
                meta.list_binary(column.name.as_bytes());
                meta.i32(4, 0);
                meta.i64(5, chunk.values as i64);
                meta.i64(6, chunk.size as i64);
                meta.i64(7, chunk.size as i64);
                meta.i64(9, chunk.offset as i64);
                meta.end();
                meta.end();
            }
            meta.i64(2, total as i64);
            meta.i64(3, rows as i64);
            meta.end();
        } else {
            meta.list(4, 12, 0);
        }
        meta.binary(6, b"sessions");
        meta.out.push(0);
        file.extend_from_slice(&meta.out);
        file.extend_from_slice(&(meta.out.len() as u32).to_le_bytes());
        file.extend_from_slice(b"PAR1");
        file
    }

    #[derive(Clone, Copy, Debug)]
    enum Nulls {
        All,
        None,
        Mixed,
    }

    const I32_VALUES: [i32; 7] = [i32::MIN, i32::MIN + 1, -1, 0, 1, i32::MAX - 1, i32::MAX];
    const I64_VALUES: [i64; 7] = [i64::MIN, i64::MIN + 1, -1, 0, 1, i64::MAX - 1, i64::MAX];
    const DATE_VALUES: [i32; 7] = [-719_528, -1, 0, 1, 11_016, 20_454, 2_932_896];
    const STRINGS: [&[u8]; 6] = [b"", b"ascii", b"UTF-8 \xc3\xa9", b" space ", b"\r", b"last"];

    fn with_columns<R>(nulls: Nulls, run: impl FnOnce(&[Column]) -> R) -> R {
        let names = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for i in a..b {
                put_str(out, STRINGS[i % STRINGS.len()]);
            }
        };
        let signed32 = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for i in a..b {
                put_i32(out, I32_VALUES[i % I32_VALUES.len()]);
            }
        };
        let optional = |a: usize, b: usize, out: &mut Vec<u8>, defs: &mut Vec<u8>| {
            for i in a..b {
                let present = match nulls {
                    Nulls::All => false,
                    Nulls::None => true,
                    Nulls::Mixed => i % 3 != 0,
                };
                defs.push(u8::from(present));
                if present {
                    put_str(out, STRINGS[i % STRINGS.len()]);
                }
            }
        };
        let dates = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for i in a..b {
                put_i32(out, DATE_VALUES[i % DATE_VALUES.len()]);
            }
        };
        let signed64 = |a: usize, b: usize, out: &mut Vec<u8>, _: &mut Vec<u8>| {
            for i in a..b {
                put_i64(out, I64_VALUES[i % I64_VALUES.len()]);
            }
        };
        // Interleave fixed-width pages with both string paths. In particular,
        // the date callback follows a nullable column with nonempty defs.
        let columns = [
            Column { name: "label", kind: Kind::Str, fill: &names, dictionary: None },
            Column { name: "signed32", kind: Kind::I32, fill: &signed32, dictionary: None },
            Column { name: "nullable", kind: Kind::OptStr, fill: &optional, dictionary: None },
            Column { name: "day", kind: Kind::Date, fill: &dates, dictionary: None },
            Column { name: "signed64", kind: Kind::I64, fill: &signed64, dictionary: None },
        ];
        run(&columns)
    }

    fn assert_same_bytes(actual: &[u8], expected: &[u8], rows: usize, nulls: Nulls) {
        assert_eq!(actual.len(), expected.len(), "rows={rows}, nulls={nulls:?}: file size");
        assert!(
            actual == expected,
            "rows={rows}, nulls={nulls:?}: first differing byte {:?}",
            actual.iter().zip(expected).position(|(a, b)| a != b),
        );
    }

    #[test]
    fn direct_numeric_pages_are_byte_identical_to_frozen_c8() {
        for nulls in [Nulls::All, Nulls::None, Nulls::Mixed] {
            with_columns(nulls, |columns| {
                for rows in [0, 1, 2, 7, 8, 9, PAGE_ROWS - 1, PAGE_ROWS, PAGE_ROWS + 1, 2 * PAGE_ROWS + 1] {
                    let actual = encode(columns, rows);
                    let expected = encode_buffered_c8(columns, rows);
                    assert_same_bytes(&actual, &expected, rows, nulls);
                }
            });
        }
    }

    #[test]
    fn direct_numeric_pages_preserve_numeric_only_column_chunks() {
        with_columns(Nulls::Mixed, |columns| {
            let numeric = [
                Column { name: columns[1].name, kind: columns[1].kind, fill: columns[1].fill, dictionary: None },
                Column { name: columns[3].name, kind: columns[3].kind, fill: columns[3].fill, dictionary: None },
                Column { name: columns[4].name, kind: columns[4].kind, fill: columns[4].fill, dictionary: None },
            ];
            for rows in [0, 1, 7, PAGE_ROWS, PAGE_ROWS + 1] {
                let actual = encode(&numeric, rows);
                let expected = encode_buffered_c8(&numeric, rows);
                assert_same_bytes(&actual, &expected, rows, Nulls::Mixed);
            }
        });
    }

    #[test]
    fn user_writer_nonzero_ranges_roundtrip_through_parquet_reader() {
        use ::parquet::file::reader::FileReader;
        use ::parquet::file::serialized_reader::SerializedFileReader;
        use ::parquet::record::Field;
        use super::super::id::Domain;
        use super::super::write::{user_part, Part};

        struct OutputDir(std::path::PathBuf);
        impl Drop for OutputDir {
            fn drop(&mut self) {
                let _ = fs::remove_dir_all(&self.0);
            }
        }
        let nonce = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let dir = OutputDir(std::env::temp_dir().join(format!("sessions-output8-{}-{nonce}", std::process::id())));
        fs::create_dir(&dir.0).unwrap();

        let domain = Domain::with_prefix(b'u');
        let categories: [&[u8]; 2] = [b"", b"UTF-8 \xc3\xa9"];
        let first_day = -20i64;
        let mut part = Part::default();
        for i in 0..32usize {
            let name = format!("u{i:02}");
            let top = if i % 3 == 0 { u8::MAX } else { (i % 2) as u8 };
            part.push(domain.encode(name.as_bytes()), i as u32, [i as u64 + 1, i as u64 * 2 + 3, i as u64 * 1_000_000_000], top);
        }
        for (file, range) in [17..17, 17..18, 17..24].into_iter().enumerate() {
            user_part(&dir.0, file, &part, range.clone(), &categories, first_day, &domain).unwrap();
            let path = dir.0.join(format!("part-{file:05}.parquet"));
            let reader = SerializedFileReader::new(File::open(path).unwrap()).unwrap();
            assert_eq!(reader.metadata().file_metadata().num_rows(), range.len() as i64);
            assert_eq!(reader.num_row_groups(), usize::from(!range.is_empty()));
            let mut rows = reader.get_row_iter(None).unwrap();
            for i in range {
                let fields = rows.next().unwrap().unwrap().into_columns();
                let expected_top = if i % 3 == 0 {
                    Field::Null
                } else {
                    Field::Str(std::str::from_utf8(categories[i % 2]).unwrap().to_owned())
                };
                assert_eq!(fields, vec![
                    ("user_id".to_owned(), Field::Str(format!("u{i:02}"))),
                    ("day".to_owned(), Field::Date((first_day + i as i64) as i32)),
                    ("sessions".to_owned(), Field::Int(i as i32 + 1)),
                    ("events".to_owned(), Field::Int(i as i32 * 2 + 3)),
                    ("revenue_cents".to_owned(), Field::Long(i as i64 * 1_000_000_000)),
                    ("top_category".to_owned(), expected_top),
                ]);
            }
            assert!(rows.next().is_none());
        }
    }
}
