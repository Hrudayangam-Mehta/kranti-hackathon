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

#[inline]
fn append_data_page_header(file: &mut Vec<u8>, rows: usize, size: usize) {
    let mut header = Thrift::new();
    header.i32(1, 0);
    header.i32(2, size as i32);
    header.i32(3, size as i32);
    header.begin(5);
    header.i32(1, rows as i32);
    header.i32(2, 0);
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
            let fixed_width = match column.kind {
                Kind::Date | Kind::I32 => 4,
                Kind::I64 => 8,
                Kind::Str | Kind::OptStr => 0,
            };
            let mut start = 0;
            while start < rows {
                let end = (start + PAGE_ROWS).min(rows);
                defs.clear();
                if fixed_width != 0 {
                    // These kinds are required, so their V1 pages have no
                    // definition/repetition levels. PAGE_ROWS bounds size at
                    // 512 KiB, safely inside the signed i32 page-size fields.
                    let size = (end - start) * fixed_width;
                    append_data_page_header(&mut file, end - start, size);
                    file.reserve(size);
                    let payload_start = file.len();
                    (column.fill)(start, end, &mut file, &mut defs);
                    debug_assert_eq!(file.len() - payload_start, size);
                    debug_assert!(defs.is_empty());
                } else {
                    values.clear();
                    (column.fill)(start, end, &mut values, &mut defs);
                    levels.clear();
                    if column.kind == Kind::OptStr {
                        let mut packed = Vec::with_capacity(defs.len() / 8 + 16);
                        bit_pack(&defs, &mut packed);
                        levels.extend_from_slice(&(packed.len() as u32).to_le_bytes());
                        levels.extend_from_slice(&packed);
                    }
                    let size = levels.len() + values.len();
                    append_data_page_header(&mut file, end - start, size);
                    file.extend_from_slice(&levels);
                    file.extend_from_slice(&values);
                }
                start = end;
            }
            chunks.push(Chunk {
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
mod tests {
    use super::*;

    // Frozen C8 buffered encode body. Keep this independent of the new page
    // header helper so the control detects byte, size, and offset changes.
    // Original parquet.rs SHA-256: 39380f94e5fdf1e9778a1afaef538f372487a9ce4e567fb8bf9bd5a7c3ff834c
    fn encode_buffered_c8(columns: &[Column], rows: usize) -> Vec<u8> {
        let mut file: Vec<u8> = Vec::with_capacity(rows * 48 + 4096);
        file.extend_from_slice(b"PAR1");
        let mut chunks: Vec<Chunk> = Vec::with_capacity(columns.len());
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
                chunks.push(Chunk {
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
            Column { name: "label", kind: Kind::Str, fill: &names },
            Column { name: "signed32", kind: Kind::I32, fill: &signed32 },
            Column { name: "nullable", kind: Kind::OptStr, fill: &optional },
            Column { name: "day", kind: Kind::Date, fill: &dates },
            Column { name: "signed64", kind: Kind::I64, fill: &signed64 },
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
                Column { name: columns[1].name, kind: columns[1].kind, fill: columns[1].fill },
                Column { name: columns[3].name, kind: columns[3].kind, fill: columns[3].fill },
                Column { name: columns[4].name, kind: columns[4].kind, fill: columns[4].fill },
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
