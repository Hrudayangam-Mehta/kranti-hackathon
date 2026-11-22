//! Original coverage-guided test selector; public sample answers are never loaded.

mod diff {
//! Unified diff parsing with a fail-safe error on formats we cannot reason about.

#[derive(Debug, Clone)]
pub struct Hunk {
    pub old_start: usize,
    pub old_count: usize,
    pub new_start: usize,
    pub new_count: usize,
    pub lines: Vec<(u8, String)>,
}

#[derive(Debug, Clone, Default)]
pub struct FileChange {
    pub old_path: String,
    pub new_path: String,
    pub hunks: Vec<Hunk>,
    pub structural: bool,
}

impl FileChange {
    pub fn path(&self) -> &str {
        if self.old_path == "/dev/null" { &self.new_path } else { &self.old_path }
    }

    /// Removed/replaced old lines and insertion anchors in the OLD source coordinate system.
    pub fn edits(&self) -> (Vec<usize>, Vec<usize>) {
        let mut removed = Vec::new();
        let mut insertions = Vec::new();
        for hunk in &self.hunks {
            // A zero-length range names the line before the insertion.
            let mut old = hunk.old_start + usize::from(hunk.old_count == 0);
            let mut deleted_in_group = false;
            let mut added_in_group = false;
            for (kind, _) in &hunk.lines {
                match kind {
                    b'-' => { removed.push(old); old += 1; deleted_in_group = true; }
                    b'+' => {
                        // Replacements are already represented by deleted lines. Pure
                        // insertions need neighbors and possibly an enclosing function.
                        if !deleted_in_group && !added_in_group { insertions.push(old); }
                        added_in_group = true;
                    }
                    b' ' => { old += 1; deleted_in_group = false; added_in_group = false; }
                    _ => unreachable!(),
                }
            }
        }
        removed.sort_unstable(); removed.dedup();
        insertions.sort_unstable(); insertions.dedup();
        (removed, insertions)
    }

    pub fn matches_source(&self, source: &str) -> bool {
        let source_lines: Vec<_> = source.split_terminator('\n').collect();
        let mut previous_end = 0;
        for hunk in &self.hunks {
            let mut old = if hunk.old_count == 0 { hunk.old_start } else { hunk.old_start.saturating_sub(1) };
            if old < previous_end || old > source_lines.len() { return false; }
            for (kind, text) in &hunk.lines {
                if *kind == b' ' || *kind == b'-' {
                    if source_lines.get(old).copied() != Some(text.as_str()) { return false; }
                    old += 1;
                }
            }
            previous_end = old;
        }
        true
    }
}

pub fn parse(patch: &str) -> Result<Vec<FileChange>, String> {
    if patch.contains('\0') { return Err("binary patch".into()); }
    let lines: Vec<&str> = patch.split_terminator('\n').collect();
    let mut changes = Vec::new();
    let mut file: Option<FileChange> = None;
    let mut cursor = 0;
    while cursor < lines.len() {
        let line = lines[cursor];
        if let Some(paths) = line.strip_prefix("diff --git ") {
            finish_file(&mut changes, file.take())?;
            let (old, new) = git_paths(paths)?;
            file = Some(FileChange { old_path: strip_side(&old), new_path: strip_side(&new), ..FileChange::default() });
            cursor += 1;
        } else if let Some(old) = line.strip_prefix("--- ") {
            if file.as_ref().is_some_and(|f| !f.hunks.is_empty()) { finish_file(&mut changes, file.take())?; }
            let next = lines.get(cursor + 1).and_then(|s| s.strip_prefix("+++ ")).ok_or("missing +++ header")?;
            let current = file.get_or_insert_with(FileChange::default);
            current.old_path = header_path(old)?;
            current.new_path = header_path(next)?;
            current.structural |= current.old_path != current.new_path;
            cursor += 2;
        } else if line.starts_with("@@ ") {
            let current = file.as_mut().ok_or("hunk before file header")?;
            let mut hunk = parse_header(line)?;
            cursor += 1;
            let mut old_count = 0;
            let mut new_count = 0;
            while old_count < hunk.old_count || new_count < hunk.new_count {
                let line = lines.get(cursor).ok_or("truncated hunk")?;
                if line.starts_with("\\ No newline at end of file") { cursor += 1; continue; }
                let kind = *line.as_bytes().first().ok_or("empty unmarked hunk line")?;
                match kind {
                    b' ' => { old_count += 1; new_count += 1; }
                    b'-' => old_count += 1,
                    b'+' => new_count += 1,
                    _ => return Err("invalid hunk line prefix".into()),
                }
                if old_count > hunk.old_count || new_count > hunk.new_count { return Err("hunk count mismatch".into()); }
                hunk.lines.push((kind, line[1..].to_owned()));
                cursor += 1;
            }
            if let Some(previous) = current.hunks.last() {
                if hunk.old_start < previous.old_start + previous.old_count { return Err("overlapping hunks".into()); }
                if hunk.new_start < previous.new_start + previous.new_count { return Err("overlapping target hunks".into()); }
            }
            current.hunks.push(hunk);
        } else if line.starts_with("Binary files ") || line.starts_with("GIT binary patch") || line.starts_with("diff --cc ") || line.starts_with("@@@") {
            return Err("unsupported binary or combined diff".into());
        } else if let Some(path) = line.strip_prefix("rename from ") {
            let current = file.as_mut().ok_or("rename before file")?;
            current.old_path = plain_path(path)?;
            current.structural = true;
            cursor += 1;
        } else if let Some(path) = line.strip_prefix("rename to ") {
            let current = file.as_mut().ok_or("rename before file")?;
            current.new_path = plain_path(path)?;
            current.structural = true;
            cursor += 1;
        } else if line.starts_with("copy from ") || line.starts_with("copy to ") {
            return Err("copy metadata requires global fallback".into());
        } else if line.starts_with("new file mode ") || line.starts_with("deleted file mode ") || line.starts_with("old mode ") || line.starts_with("new mode ") {
            file.as_mut().ok_or("mode before file")?.structural = true;
            cursor += 1;
        } else if line.starts_with("index ") || line.starts_with("similarity index ") || line.starts_with("dissimilarity index ") || line.starts_with("\\ No newline at end of file") || line.is_empty() {
            cursor += 1;
        } else {
            return Err("unsupported patch metadata or trailing content".into());
        }
    }
    finish_file(&mut changes, file)?;
    if changes.is_empty() && !patch.trim().is_empty() { return Err("no recognized diff".into()); }
    Ok(changes)
}

fn finish_file(changes: &mut Vec<FileChange>, file: Option<FileChange>) -> Result<(), String> {
    if let Some(file) = file {
        if file.old_path.is_empty() || file.new_path.is_empty() { return Err("incomplete file headers".into()); }
        if file.hunks.is_empty() && !file.structural { return Err("file has no diff or recognized metadata change".into()); }
        if !valid_path(&file.old_path) || !valid_path(&file.new_path) { return Err("unsafe or unsupported path".into()); }
        changes.push(file);
    }
    Ok(())
}

fn valid_path(path: &str) -> bool {
    path == "/dev/null" || (!path.starts_with('/') && !path.contains('\0') && !path.split('/').any(|p| p == ".." || p.is_empty()))
}

fn parse_header(line: &str) -> Result<Hunk, String> {
    let body = line.strip_prefix("@@ ").ok_or("invalid hunk header")?;
    let close = body.find(" @@").ok_or("unterminated hunk header")?;
    let mut ranges = body[..close].split_whitespace();
    let old = ranges.next().and_then(|v| v.strip_prefix('-')).ok_or("missing old range")?;
    let new = ranges.next().and_then(|v| v.strip_prefix('+')).ok_or("missing new range")?;
    if ranges.next().is_some() { return Err("extra hunk ranges".into()); }
    let (old_start, old_count) = range(old)?;
    let (new_start, new_count) = range(new)?;
    if (old_count > 0 && old_start == 0) || (new_count > 0 && new_start == 0) { return Err("zero line with nonempty range".into()); }
    old_start.checked_add(old_count.max(1)).ok_or("old hunk overflow")?;
    new_start.checked_add(new_count).ok_or("new hunk overflow")?;
    Ok(Hunk { old_start, old_count, new_start, new_count, lines: Vec::new() })
}

fn range(value: &str) -> Result<(usize, usize), String> {
    let (start, count) = value.split_once(',').unwrap_or((value, "1"));
    let start: usize = start.parse().map_err(|_| "invalid hunk start")?;
    let count: usize = count.parse().map_err(|_| "invalid hunk count")?;
    Ok((start, count))
}

fn strip_side(path: &str) -> String {
    path.strip_prefix("a/").or_else(|| path.strip_prefix("b/")).unwrap_or(path).to_owned()
}

fn header_path(input: &str) -> Result<String, String> {
    Ok(strip_side(&plain_path(input.split('\t').next().unwrap_or(input))?))
}

fn plain_path(input: &str) -> Result<String, String> {
    if input.starts_with('"') {
        let (value, rest) = quoted(input)?;
        if !rest.trim().is_empty() { return Err("extra quoted path data".into()); }
        Ok(value)
    } else { Ok(input.to_owned()) }
}

fn git_paths(input: &str) -> Result<(String, String), String> {
    let (old, rest) = token(input)?;
    let (new, rest) = token(rest.trim_start())?;
    if !rest.trim().is_empty() { return Err("ambiguous unquoted git paths".into()); }
    Ok((old, new))
}

fn token(input: &str) -> Result<(String, &str), String> {
    if input.starts_with('"') { return quoted(input); }
    let split = input.find(' ').unwrap_or(input.len());
    if split == 0 { return Err("empty path".into()); }
    Ok((input[..split].to_owned(), &input[split..]))
}

fn quoted(input: &str) -> Result<(String, &str), String> {
    let bytes = input.as_bytes();
    let mut out = Vec::new();
    let mut p = 1;
    while p < bytes.len() {
        let byte = bytes[p]; p += 1;
        if byte == b'"' { return Ok((String::from_utf8(out).map_err(|_| "non-UTF8 path")?, &input[p..])); }
        if byte != b'\\' { out.push(byte); continue; }
        let escape = *bytes.get(p).ok_or("short path escape")?; p += 1;
        match escape {
            b'\\' | b'"' => out.push(escape),
            b't' => out.push(b'\t'), b'n' => out.push(b'\n'), b'r' => out.push(b'\r'),
            b'a' => out.push(7), b'b' => out.push(8), b'f' => out.push(12), b'v' => out.push(11),
            b'0'..=b'7' => {
                let mut octal = (escape - b'0') as u16;
                for _ in 0..2 {
                    if let Some(v @ b'0'..=b'7') = bytes.get(p) { octal = octal * 8 + (v - b'0') as u16; p += 1; } else { break; }
                }
                if octal > 255 { return Err("path octal overflow".into()); }
                out.push(octal as u8);
            }
            _ => return Err("unsupported path escape".into()),
        }
    }
    Err("unterminated quoted path".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn replacement_and_added_branch() {
        let p = "diff --git a/x.py b/x.py\nindex 12..34 100644\n--- a/x.py\n+++ b/x.py\n@@ -1,3 +1,4 @@\n a\n-b\n+B\n c\n+d\n";
        let files = parse(p).unwrap();
        assert_eq!(files[0].edits(), (vec![2], vec![4]));
        assert!(files[0].matches_source("a\nb\nc\n"));
        assert!(!files[0].matches_source("wrong\nb\nc\n"));
    }
    #[test] fn pure_insertion_coordinates() {
        let p = "--- a/x.py\n+++ b/x.py\n@@ -3,0 +4,1 @@\n+new\n";
        assert_eq!(parse(p).unwrap()[0].edits(), (vec![],vec![4]));
    }
    #[test] fn omitted_single_line_count() {
        let p = "--- a/x.py\n+++ b/x.py\n@@ -2 +2 @@ anything\n-a\n+b\n\\ No newline at end of file\n";
        assert_eq!(parse(p).unwrap()[0].edits(), (vec![2],vec![]));
    }
    #[test] fn rename_without_hunks() {
        let p = "diff --git a/old.py b/new.py\nsimilarity index 100%\nrename from old.py\nrename to new.py\n";
        let f = parse(p).unwrap().remove(0);
        assert!(f.structural);
        assert_eq!(f.new_path,"new.py");
    }
    #[test] fn quoted_git_paths() {
        let p = "diff --git \"a/my\\040file.py\" \"b/my\\040file.py\"\n--- \"a/my\\040file.py\"\n+++ \"b/my\\040file.py\"\n@@ -1 +1 @@\n-a\n+b\n";
        assert_eq!(parse(p).unwrap()[0].path(), "my file.py");
    }
    #[test] fn rejects_malformed_and_unsafe() {
        for p in ["--- a/x\n+++ b/x\n@@ -1,2 +1 @@\n-a\n+b\n", "GIT binary patch\n", "--- a/../x\n+++ b/../x\n@@ -1 +1 @@\n-a\n+b\n", "--- a/x\n+++ b/x\n@@ -0 +1 @@\n-a\n+b\n"] {
            assert!(parse(p).is_err(), "accepted {p:?}");
        }
    }
}

}
mod json {
//! A deliberately small, strict JSON reader. No network dependencies are needed.

use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(String),
    String(String),
    Array(Vec<Value>),
    Object(BTreeMap<String, Value>),
}

impl Value {
    pub fn object(&self) -> Result<&BTreeMap<String, Value>, String> {
        match self { Self::Object(v) => Ok(v), _ => Err("expected JSON object".into()) }
    }
    pub fn array(&self) -> Result<&[Value], String> {
        match self { Self::Array(v) => Ok(v), _ => Err("expected JSON array".into()) }
    }
    pub fn string(&self) -> Result<&str, String> {
        match self { Self::String(v) => Ok(v), _ => Err("expected JSON string".into()) }
    }
    pub fn u64(&self) -> Result<u64, String> {
        match self {
            Self::Number(v) if v.bytes().all(|b| b.is_ascii_digit()) =>
                v.parse().map_err(|_| "integer overflow".into()),
            _ => Err("expected nonnegative JSON integer".into()),
        }
    }
    pub fn get(&self, key: &str) -> Result<&Value, String> {
        self.object()?.get(key).ok_or_else(|| format!("missing field: {key}"))
    }
}

pub fn parse(input: &str) -> Result<Value, String> {
    let mut parser = Parser { bytes: input.as_bytes(), cursor: 0 };
    let result = parser.value(0)?;
    parser.whitespace();
    if parser.cursor != parser.bytes.len() { return Err(parser.error("trailing JSON content")); }
    Ok(result)
}

struct Parser<'a> { bytes: &'a [u8], cursor: usize }
impl Parser<'_> {
    fn error(&self, message: &str) -> String { format!("{message} at byte {}", self.cursor) }
    fn whitespace(&mut self) {
        while matches!(self.bytes.get(self.cursor), Some(b' ' | b'\n' | b'\t' | b'\r')) { self.cursor += 1; }
    }
    fn eat(&mut self, byte: u8) -> bool {
        if self.bytes.get(self.cursor) == Some(&byte) { self.cursor += 1; true } else { false }
    }
    fn value(&mut self, depth: usize) -> Result<Value, String> {
        if depth > 128 { return Err(self.error("JSON nesting limit exceeded")); }
        self.whitespace();
        match self.bytes.get(self.cursor).copied() {
            Some(b'n') => { self.literal(b"null")?; Ok(Value::Null) }
            Some(b't') => { self.literal(b"true")?; Ok(Value::Bool(true)) }
            Some(b'f') => { self.literal(b"false")?; Ok(Value::Bool(false)) }
            Some(b'"') => self.string().map(Value::String),
            Some(b'[') => {
                self.cursor += 1;
                let mut values = Vec::new();
                self.whitespace();
                if self.eat(b']') { return Ok(Value::Array(values)); }
                loop {
                    values.push(self.value(depth + 1)?);
                    self.whitespace();
                    if self.eat(b']') { break; }
                    if !self.eat(b',') { return Err(self.error("expected array comma")); }
                }
                Ok(Value::Array(values))
            }
            Some(b'{') => {
                self.cursor += 1;
                let mut values = BTreeMap::new();
                self.whitespace();
                if self.eat(b'}') { return Ok(Value::Object(values)); }
                loop {
                    self.whitespace();
                    let key = self.string()?;
                    self.whitespace();
                    if !self.eat(b':') { return Err(self.error("expected object colon")); }
                    let value = self.value(depth + 1)?;
                    if values.insert(key, value).is_some() { return Err(self.error("duplicate object key")); }
                    self.whitespace();
                    if self.eat(b'}') { break; }
                    if !self.eat(b',') { return Err(self.error("expected object comma")); }
                }
                Ok(Value::Object(values))
            }
            Some(b'-' | b'0'..=b'9') => self.number().map(Value::Number),
            _ => Err(self.error("invalid JSON value")),
        }
    }
    fn literal(&mut self, literal: &[u8]) -> Result<(), String> {
        if self.bytes.get(self.cursor..self.cursor + literal.len()) != Some(literal) {
            return Err(self.error("invalid JSON literal"));
        }
        self.cursor += literal.len();
        Ok(())
    }
    fn number(&mut self) -> Result<String, String> {
        let start = self.cursor;
        self.eat(b'-');
        if !self.eat(b'0') {
            if !matches!(self.bytes.get(self.cursor), Some(b'1'..=b'9')) { return Err(self.error("invalid number")); }
            while matches!(self.bytes.get(self.cursor), Some(b'0'..=b'9')) { self.cursor += 1; }
        }
        if self.eat(b'.') {
            let fraction_start = self.cursor;
            while matches!(self.bytes.get(self.cursor), Some(b'0'..=b'9')) { self.cursor += 1; }
            if fraction_start == self.cursor { return Err(self.error("missing fraction digits")); }
        }
        if self.eat(b'e') || self.eat(b'E') {
            if !self.eat(b'+') { self.eat(b'-'); }
            let exponent_start = self.cursor;
            while matches!(self.bytes.get(self.cursor), Some(b'0'..=b'9')) { self.cursor += 1; }
            if exponent_start == self.cursor { return Err(self.error("missing exponent digits")); }
        }
        Ok(std::str::from_utf8(&self.bytes[start..self.cursor]).unwrap().to_owned())
    }
    fn hex4(&mut self) -> Result<u32, String> {
        let mut value = 0u32;
        for _ in 0..4 {
            let b = self.bytes.get(self.cursor).copied().ok_or_else(|| self.error("short unicode escape"))?;
            self.cursor += 1;
            value = value * 16 + match b {
                b'0'..=b'9' => (b - b'0') as u32,
                b'a'..=b'f' => (b - b'a' + 10) as u32,
                b'A'..=b'F' => (b - b'A' + 10) as u32,
                _ => return Err(self.error("invalid unicode escape")),
            };
        }
        Ok(value)
    }
    fn string(&mut self) -> Result<String, String> {
        if !self.eat(b'"') { return Err(self.error("expected string")); }
        let mut out = Vec::new();
        loop {
            let byte = self.bytes.get(self.cursor).copied().ok_or_else(|| self.error("unterminated string"))?;
            self.cursor += 1;
            match byte {
                b'"' => return String::from_utf8(out).map_err(|_| self.error("invalid string UTF-8")),
                b'\\' => {
                    let escaped = self.bytes.get(self.cursor).copied().ok_or_else(|| self.error("short escape"))?;
                    self.cursor += 1;
                    match escaped {
                        b'"' | b'\\' | b'/' => out.push(escaped),
                        b'b' => out.push(8), b'f' => out.push(12), b'n' => out.push(b'\n'),
                        b'r' => out.push(b'\r'), b't' => out.push(b'\t'),
                        b'u' => {
                            let mut scalar = self.hex4()?;
                            if (0xd800..=0xdbff).contains(&scalar) {
                                if !self.eat(b'\\') || !self.eat(b'u') { return Err(self.error("unpaired high surrogate")); }
                                let low = self.hex4()?;
                                if !(0xdc00..=0xdfff).contains(&low) { return Err(self.error("invalid low surrogate")); }
                                scalar = 0x10000 + ((scalar - 0xd800) << 10) + low - 0xdc00;
                            }
                            let c = char::from_u32(scalar).ok_or_else(|| self.error("invalid unicode scalar"))?;
                            let mut buf = [0u8; 4];
                            out.extend_from_slice(c.encode_utf8(&mut buf).as_bytes());
                        }
                        _ => return Err(self.error("invalid escape")),
                    }
                }
                0..=31 => return Err(self.error("unescaped control character")),
                _ => out.push(byte),
            }
        }
    }
}

pub fn quote(value: &str) -> String {
    let mut result = String::with_capacity(value.len() + 2);
    result.push('"');
    for c in value.chars() {
        match c {
            '"' => result.push_str("\\\""), '\\' => result.push_str("\\\\"),
            '\n' => result.push_str("\\n"), '\r' => result.push_str("\\r"), '\t' => result.push_str("\\t"),
            c if c <= '\u{1f}' => result.push_str(&format!("\\u{:04x}", c as u32)),
            c => result.push(c),
        }
    }
    result.push('"');
    result
}

/// Tests have at most three decimal places. Parse them without floating-point rounding.
pub fn milliseconds(value: &Value) -> Result<u64, String> {
    let Value::Number(raw) = value else { return Err("seconds must be a JSON number".into()); };
    if raw.starts_with('-') { return Err("negative test duration".into()); }
    let (mantissa, exponent) = if let Some(p) = raw.find(['e', 'E']) {
        (&raw[..p], raw[p + 1..].parse::<i32>().map_err(|_| "duration exponent overflow")?)
    } else { (raw.as_str(), 0) };
    let (whole, fractional) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let digits = format!("{whole}{fractional}");
    let mut n: u64 = digits.parse().map_err(|_| "duration overflow")?;
    let scale = 3i32.checked_add(exponent).and_then(|v| v.checked_sub(fractional.len() as i32)).ok_or("duration scale overflow")?;
    if scale >= 0 {
        if scale > 18 { return Err("duration overflow".into()); }
        n = n.checked_mul(10u64.pow(scale as u32)).ok_or("duration overflow")?;
    } else {
        if scale < -18 { return Ok(0); }
        let denominator = 10u64.pow((-scale) as u32);
        let q = n / denominator;
        let remainder = n % denominator;
        // Match the supplied scorer's floor(seconds * 1000 + 0.5).
        n = q + u64::from(remainder >= denominator / 2);
    }
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn unicode_and_escape_roundtrip() {
        let s = "a\n\t\0\"\\🦀é";
        assert_eq!(parse(&quote(s)).unwrap(), Value::String(s.into()));
        assert_eq!(parse(r#""\ud83e\udd80""#).unwrap(), Value::String("🦀".into()));
    }
    #[test] fn rejects_nonstandard_json() {
        for s in ["NaN", "Infinity", "01", "[1,]", "{\"x\":1,}", "{\"x\":1,\"x\":2}", "\u{feff}{}", "\"\n\"", r#""\ud800""#] {
            assert!(parse(s).is_err(), "accepted {s:?}");
        }
    }
    #[test] fn duration_is_exact() {
        for (s, ms) in [("0.031",31),("2",2000),("0",0),("1.999",1999),("3.1e-2",31),("0.0005",1),("0.0015",2)] {
            assert_eq!(milliseconds(&parse(s).unwrap()).unwrap(),ms);
        }
        assert!(milliseconds(&parse("-1").unwrap()).is_err());
    }
    #[test] fn nested_values() {
        let v = parse(r#"{"tests":[{"number":0}],"skip":null,"ok":true}"#).unwrap();
        assert_eq!(v.get("tests").unwrap().array().unwrap()[0].get("number").unwrap().u64().unwrap(), 0);
    }
}

}
mod schedule {
//! Deterministic integer-millisecond scheduling, including worker startup costs.

pub const WORKER_MS: u64 = 2_000;

pub fn cost(workers: &[Vec<usize>], durations: &[u64]) -> u64 {
    let loads: Vec<_> = workers.iter().filter(|w| !w.is_empty()).map(|w| w.iter().map(|i| durations[*i]).sum::<u64>()).collect();
    loads.iter().copied().max().unwrap_or(0) + WORKER_MS * loads.len() as u64
}

pub fn schedule(selected: &[bool], durations: &[u64]) -> Vec<Vec<usize>> {
    let mut order: Vec<_> = selected.iter().enumerate().filter_map(|(i, s)| if *s {Some(i)} else {None}).collect();
    if order.is_empty() { return Vec::new(); }
    // Positive selections can include free additional recall without an extra worker.
    for (i, duration) in durations.iter().enumerate() {
        if *duration == 0 && !selected[i] { order.push(i); }
    }
    order.sort_unstable_by(|a, b| durations[*b].cmp(&durations[*a]).then_with(|| a.cmp(b)));
    let sum: u64 = order.iter().map(|i| durations[*i]).sum();
    let largest = durations[order[0]];
    let mut best = vec![order.clone()];
    let mut best_cost = sum + WORKER_MS;
    for k in 2..=8.min(order.len()) {
        let lower_bound = largest.max(sum.div_ceil(k as u64)) + WORKER_MS * k as u64;
        if lower_bound >= best_cost { continue; }
        let mut bins = vec![Vec::new(); k];
        let mut loads = vec![0u64; k];
        for &test in &order {
            let target = (0..k).min_by_key(|i| (loads[*i], bins[*i].len(), *i)).unwrap();
            bins[target].push(test);
            loads[target] += durations[test];
        }
        improve(&mut bins, &mut loads, durations);
        bins.retain(|w| !w.is_empty());
        let candidate_cost = cost(&bins, durations);
        if candidate_cost < best_cost { best_cost = candidate_cost; best = bins; }
    }
    for worker in &mut best { worker.sort_unstable(); }
    best
}

/// Add lower-confidence impacted tests only inside already paid-for worker slack.
/// This never creates a worker or increases the current makespan.
pub fn augment_headroom(workers: &mut [Vec<usize>], reserves: &[bool], durations: &[u64]) {
    if workers.is_empty() { return; }
    let mut present = vec![false;durations.len()];
    let mut loads = Vec::with_capacity(workers.len());
    for worker in workers.iter() {
        let mut load = 0;
        for &test in worker { present[test] = true; load += durations[test]; }
        loads.push(load);
    }
    let makespan = *loads.iter().max().unwrap();
    let mut candidates: Vec<_> = reserves.iter().enumerate().filter_map(|(i,reserve)|if *reserve && !present[i] {Some(i)} else {None}).collect();
    // Shortest-first admits as many reserve tests as possible; best-fit keeps
    // the largest remaining pocket available for later tests.
    candidates.sort_unstable_by_key(|i| (durations[*i],*i));
    for test in candidates {
        let duration = durations[test];
        let target = (0..workers.len()).filter(|i| duration <= makespan-loads[*i]).min_by_key(|i|(makespan-loads[*i]-duration,*i));
        if let Some(target) = target {
            workers[target].push(test);
            loads[target] += duration;
        }
    }
    for worker in workers.iter_mut() { worker.sort_unstable(); }
}

/// A bounded exchange pass repairs simple LPT imbalance without expensive search.
fn improve(bins: &mut [Vec<usize>], loads: &mut [u64], durations: &[u64]) {
    for _ in 0..8 {
        let old_max = *loads.iter().max().unwrap();
        let high = (0..loads.len()).max_by_key(|i| (loads[*i], std::cmp::Reverse(*i))).unwrap();
        let mut action: Option<(usize, usize, Option<usize>, u64)> = None;
        let mut examined = 0usize;
        'search: for low in 0..loads.len() {
            if low == high || loads[low] >= loads[high] { continue; }
            for (hi_idx, test) in bins[high].iter().enumerate() {
                let d = durations[*test];
                if d == 0 { continue; }
                let target_max = loads[high].saturating_sub(d).max(loads[low] + d);
                if target_max < old_max && bins[high].len() > 1 && action.as_ref().is_none_or(|x| target_max < x.3) {
                    action = Some((low, hi_idx, None, target_max));
                }
                for (lo_idx, other) in bins[low].iter().enumerate() {
                    examined += 1;
                    if examined > 4096 { break 'search; }
                    let other_d = durations[*other];
                    if d <= other_d { continue; }
                    let delta = d - other_d;
                    let target_max = (loads[high] - delta).max(loads[low] + delta);
                    if target_max < old_max && action.as_ref().is_none_or(|x| target_max < x.3) {
                        action = Some((low, hi_idx, Some(lo_idx), target_max));
                    }
                }
            }
        }
        let Some((low, hi_idx, lo_idx, _)) = action else { break; };
        if let Some(lo_idx) = lo_idx {
            let a = bins[high][hi_idx]; let b = bins[low][lo_idx];
            bins[high][hi_idx] = b; bins[low][lo_idx] = a;
            loads[high] = loads[high] - durations[a] + durations[b];
            loads[low] = loads[low] - durations[b] + durations[a];
        } else {
            let test = bins[high].remove(hi_idx);
            bins[low].push(test);
            loads[high] -= durations[test]; loads[low] += durations[test];
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn small_workload_prefers_one_worker() {
        assert_eq!(schedule(&[true,true], &[100,100]).len(),1);
    }
    #[test] fn worker_count_accounts_for_overhead() {
        let durations = [4_000;8];
        let workers = schedule(&[true;8], &durations);
        assert_eq!(cost(&workers,&durations),16_000);
        assert_eq!(workers.len(),4);
    }
    #[test] fn empty_selection_stays_free() {
        assert!(schedule(&[false,false],&[0,100]).is_empty());
    }
    #[test] fn adds_zero_time_tests_only_with_existing_work() {
        let workers = schedule(&[false,true],&[0,100]);
        assert_eq!(workers,vec![vec![0,1]]);
        assert_eq!(cost(&workers,&[0,100]),2_100);
    }
    #[test] fn partition_is_complete_unique_and_deterministic() {
        let durations: Vec<_> = (0..500).map(|i| ((i * 977) % 3100) as u64).collect();
        let selection: Vec<_> = (0..500).map(|i| i % 3 != 0).collect();
        let workers = schedule(&selection,&durations);
        assert_eq!(workers,schedule(&selection,&durations));
        assert!(workers.len() <= 8);
        let mut counts=vec![0;500];
        for w in workers { for i in w { counts[i] += 1; } }
        for i in 0..500 { assert_eq!(counts[i],usize::from(selection[i] || durations[i]==0)); }
    }
    #[test] fn huge_single_test_does_not_waste_workers() {
        assert_eq!(schedule(&[true,true,true], &[100_000,1,1]).len(),1);
    }
    #[test] fn reserve_headroom_is_free_and_unique() {
        let durations = [10_000,4_000,5_000,1_000,8_000];
        let mut workers = vec![vec![0],vec![1]];
        let before = cost(&workers,&durations);
        augment_headroom(&mut workers,&[true,true,true,true,true],&durations);
        assert_eq!(cost(&workers,&durations),before);
        assert_eq!(workers,vec![vec![0],vec![1,2,3]]);
    }
    #[test] fn reserve_headroom_never_creates_workers_or_raises_cost() {
        let durations: Vec<_> = (0..500).map(|i| ((i * 977) % 3100) as u64).collect();
        let selection: Vec<_> = (0..500).map(|i| i % 7 == 0).collect();
        let mut workers = schedule(&selection,&durations);
        let before = cost(&workers,&durations);
        let worker_count = workers.len();
        augment_headroom(&mut workers,&[true;500],&durations);
        assert_eq!(cost(&workers,&durations),before);
        assert_eq!(workers.len(),worker_count);
        let mut counts = vec![0;500];
        for worker in workers { for test in worker { counts[test] += 1; } }
        for i in 0..500 { assert!(counts[i] <= 1); if selection[i] { assert_eq!(counts[i],1); } }
        let mut empty = Vec::new();
        augment_headroom(&mut empty,&[true;500],&durations);
        assert!(empty.is_empty());
    }
}

}

use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;

type TestSet = Arc<[usize]>;

const BASE_COMMIT: &str = "eb11aec4be8cb2122afe713a4816662c3f0fb2fa";
const STDOUT_LIMIT: usize = 2_000_000;

#[derive(Debug)]
struct TestCatalog {
    ids: Vec<String>,
    files: Vec<String>,
    durations: Vec<u64>,
}

impl TestCatalog {
    fn parse(input: &str) -> Result<Self, String> {
        let document = json::parse(input)?;
        let tests = document.get("tests")?.array()?;
        let mut catalog = Self { ids: Vec::new(), files: Vec::new(), durations: Vec::new() };
        let mut unique = BTreeSet::new();
        let mut total = 0u64;
        for (i, test) in tests.iter().enumerate() {
            if test.get("number")?.u64()? != i as u64 { return Err("test numbers must be contiguous and ordered".into()); }
            let id = test.get("id")?.string()?.to_owned();
            if !unique.insert(id.clone()) { return Err("duplicate pytest id".into()); }
            let duration = json::milliseconds(test.get("seconds")?)?;
            total = total.checked_add(duration).ok_or("total test duration overflow")?;
            catalog.ids.push(id);
            catalog.files.push(test.get("file")?.string()?.to_owned());
            catalog.durations.push(duration);
        }
        total.checked_add(schedule::WORKER_MS * 8).ok_or("worker cost overflow")?;
        Ok(catalog)
    }
    fn len(&self) -> usize { self.ids.len() }
}

#[derive(Debug)]
struct FunctionImpact {
    start: usize,
    end: usize,
    header_end: usize,
    tests: TestSet,
}

#[derive(Debug)]
struct FileImpact {
    lines: BTreeMap<usize, TestSet>,
    all: TestSet,
    functions: Vec<FunctionImpact>,
    importers: TestSet,
    source_sensitive: TestSet,
    source: Option<String>,
}

#[derive(Debug)]
struct ImpactMap { files: BTreeMap<String, FileImpact> }

impl ImpactMap {
    fn parse(input: &str, catalog: &TestCatalog) -> Result<Self, String> {
        let document = json::parse(input)?;
        if document.get("version")?.u64()? != 1 { return Err("unsupported impact-map version".into()); }
        if document.get("base_commit")?.string()? != BASE_COMMIT { return Err("impact-map base commit mismatch".into()); }
        if document.get("test_count")?.u64()? != catalog.len() as u64 { return Err("impact-map test count mismatch".into()); }
        if let Some(ids) = document.object()?.get("test_ids") {
            let ids = ids.array()?;
            if ids.len() != catalog.len() { return Err("impact-map test identity length mismatch".into()); }
            for (expected, actual) in ids.iter().zip(&catalog.ids) {
                if expected.string()? != actual { return Err("impact-map test identity mismatch".into()); }
            }
        }
        let sets = if let Some(values) = document.object()?.get("sets") {
            values.array()?.iter().map(|v| test_numbers(Some(v),catalog.len(),&[])).collect::<Result<Vec<_>,_>>()?
        } else { Vec::new() };
        let mut files = BTreeMap::new();
        for (path, file) in document.get("files")?.object()? {
            let fields = file.object()?;
            let mut lines = BTreeMap::new();
            if let Some(line_values) = fields.get("lines") {
                for (line, tests) in line_values.object()? {
                    let n = line.parse::<usize>().map_err(|_| "invalid coverage line")?;
                    // Some coverage engines report line zero for module entry.
                    // It cannot be targeted by a unified diff; file-level sets
                    // preserve its broader import dependency information.
                    if n == 0 { continue; }
                    lines.insert(n, test_numbers(Some(tests), catalog.len(),&sets)?);
                }
            }
            let mut functions = Vec::new();
            if let Some(function_values) = fields.get("functions") {
                for function in function_values.array()? {
                    let start = usize::try_from(function.get("start")?.u64()?).map_err(|_| "function start overflow")?;
                    let end = usize::try_from(function.get("end")?.u64()?).map_err(|_| "function end overflow")?;
                    let header_end = if let Some(v) = function.object()?.get("header_end") {
                        usize::try_from(v.u64()?).map_err(|_| "function header overflow")?
                    } else { start };
                    if start == 0 || end < start || header_end < start || header_end > end { return Err("invalid function range".into()); }
                    functions.push(FunctionImpact { start, end, header_end, tests: test_numbers(function.object()?.get("tests"),catalog.len(),&sets)? });
                }
            }
            functions.sort_by_key(|f| (f.end - f.start, f.start));
            let source = fields.get("source").map(|s| s.string().map(str::to_owned)).transpose()?;
            files.insert(path.clone(), FileImpact {
                lines, functions, source,
                all: test_numbers(fields.get("all"),catalog.len(),&sets)?,
                importers: test_numbers(fields.get("importers"),catalog.len(),&sets)?,
                source_sensitive: test_numbers(fields.get("source_sensitive"),catalog.len(),&sets)?,
            });
        }
        Ok(Self { files })
    }
}

fn test_numbers(value: Option<&json::Value>, count: usize, sets: &[TestSet]) -> Result<TestSet, String> {
    let Some(value) = value else { return Ok(Arc::from([])); };
    if matches!(value,json::Value::Number(_)) {
        let index = usize::try_from(value.u64()?).map_err(|_| "test-set reference overflow")?;
        return sets.get(index).cloned().ok_or_else(||"unknown interned test-set reference".into());
    }
    let mut numbers = Vec::new();
    for value in value.array()? {
        let number = usize::try_from(value.u64()?).map_err(|_| "test number overflow")?;
        if number >= count { return Err("impact-map contains unknown test".into()); }
        numbers.push(number);
    }
    numbers.sort_unstable(); numbers.dedup();
    Ok(numbers.into())
}

#[derive(Clone, Copy, Default, Debug)]
struct FileAnalysis { syntax_error: bool, ast_equal: bool }
#[derive(Default, Debug)]
struct CommitAnalysis { force_all: bool, files: BTreeMap<String, FileAnalysis> }
#[derive(Default, Debug)]
struct Analysis { commits: BTreeMap<String, CommitAnalysis> }

impl Analysis {
    fn parse(input: &str) -> Result<Self, String> {
        let document = json::parse(input)?;
        let mut result = Self::default();
        for (id, value) in document.get("commits")?.object()? {
            let mut commit = CommitAnalysis::default();
            commit.force_all = optional_bool(value.object()?.get("force_all"))?;
            if let Some(files) = value.object()?.get("files") {
                for (path, analysis) in files.object()? {
                    commit.files.insert(path.clone(), FileAnalysis {
                        syntax_error: optional_bool(analysis.object()?.get("syntax_error"))?,
                        ast_equal: optional_bool(analysis.object()?.get("ast_equal"))?,
                    });
                }
            }
            result.commits.insert(id.clone(),commit);
        }
        Ok(result)
    }
}

fn optional_bool(value: Option<&json::Value>) -> Result<bool,String> {
    match value { None => Ok(false), Some(json::Value::Bool(v)) => Ok(*v), _ => Err("analysis flag must be boolean".into()) }
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Policy { Line, Function }

fn extend(selected: &mut [bool], ids: &[usize]) { for id in ids { selected[*id] = true; } }

fn broad(selected: &mut [bool], info: &FileImpact) {
    extend(selected,&info.all);
    extend(selected,&info.importers);
    extend(selected,&info.source_sensitive);
}

fn select(changes: &[diff::FileChange], catalog: &TestCatalog, map: &ImpactMap, analysis: Option<&CommitAnalysis>, policy: Policy) -> Result<Vec<bool>,String> {
    if analysis.is_some_and(|a| a.force_all) { return Err("analysis requested conservative fallback".into()); }
    let mut selected = vec![false;catalog.len()];
    for change in changes {
        let path = change.path();
        let info = map.files.get(path).ok_or_else(|| format!("unmapped changed file: {path}"))?;
        if let Some(source) = &info.source {
            if change.old_path != "/dev/null" && !change.matches_source(source) { return Err(format!("patch does not match baseline: {path}")); }
        }
        extend(&mut selected,&info.source_sensitive);
        // Editing a test directly can affect its collection or its assertions.
        for (i, file) in catalog.files.iter().enumerate() {
            if file == &change.old_path || file == &change.new_path { selected[i] = true; }
        }
        if change.structural || change.old_path != change.new_path {
            broad(&mut selected,info);
            if change.new_path != change.old_path && change.new_path != "/dev/null" {
                if let Some(other) = map.files.get(&change.new_path) { broad(&mut selected,other); }
                else { return Err(format!("new or renamed destination is unmapped: {}",change.new_path)); }
            }
            continue;
        }
        let semantic = analysis.and_then(|a| a.files.get(path)).copied().unwrap_or_default();
        if semantic.syntax_error {
            // Import collection and lazy imports can reach a broken module
            // through paths absent from the baseline dynamic dependency graph.
            return Ok(vec![true;catalog.len()]);
        }
        if semantic.ast_equal && path.ends_with(".py") {
            // The sidecar is optional and must prove AST equality against the pinned
            // source. Source-reading tests above are never discarded by this flag.
            continue;
        }
        let (removed, insertions) = change.edits();
        if !path.ends_with(".py") {
            broad(&mut selected,info);
            continue;
        }
        for line in removed {
            select_line(&mut selected, info, line, policy);
        }
        for anchor in insertions {
            select_insertion(&mut selected,info,anchor,policy);
        }
    }
    Ok(selected)
}

fn function_at(info: &FileImpact,line: usize) -> Option<&FunctionImpact> {
    info.functions.iter().find(|f| f.start <= line && line <= f.end)
}

fn reserve_tests(changes: &[diff::FileChange], catalog: &TestCatalog, map: &ImpactMap) -> Vec<bool> {
    let mut reserves = vec![false;catalog.len()];
    for change in changes {
        let Some(info) = map.files.get(change.path()) else { continue; };
        let (removed,insertions) = change.edits();
        if change.structural || !change.path().ends_with(".py") { extend(&mut reserves,&info.all); continue; }
        for line in removed {
            if let Some(function) = function_at(info,line) { extend(&mut reserves,&function.tests); }
            else { extend(&mut reserves,&info.all); }
        }
        for anchor in insertions {
            for line in [anchor.saturating_sub(1),anchor] {
                if let Some(function) = function_at(info,line) { extend(&mut reserves,&function.tests); }
                else { extend(&mut reserves,&info.all); }
            }
        }
    }
    reserves
}

fn select_line(selected: &mut [bool], info: &FileImpact, line: usize, policy: Policy) {
    let function = function_at(info,line);
    if function.is_none() || function.is_some_and(|f| line <= f.header_end) {
        broad(selected,info);
        return;
    }
    let function = function.unwrap();
    if policy == Policy::Function {
        extend(selected,&function.tests);
        if function.tests.is_empty() { broad(selected,info); }
        return;
    }
    if let Some(tests) = info.lines.get(&line).filter(|tests| !tests.is_empty()) {
        extend(selected,tests);
    } else if !function.tests.is_empty() {
        extend(selected,&function.tests);
    } else {
        broad(selected,info);
    }
}

fn select_insertion(selected: &mut [bool], info: &FileImpact, anchor: usize, _policy: Policy) {
    let after = function_at(info,anchor);
    let before = anchor.checked_sub(1).and_then(|line|function_at(info,line));
    let function = match (before,after) {
        (Some(a),Some(b)) if a.start == b.start && a.end == b.end => a,
        // Inserting at a function boundary may replace a decorator or add module code.
        _ => { broad(selected,info); return; }
    };
    // An inserted else/except/return can make previously unexecuted paths
    // reachable. Neighbor-line coverage alone cannot bound that effect.
    if anchor <= function.header_end + 1 || function.tests.is_empty() { broad(selected,info); }
    else { extend(selected,&function.tests); }
}

struct Options { data: PathBuf, map: PathBuf, analysis: Option<PathBuf>, policy: Policy, baseline_all: bool }

fn options() -> Result<Options,String> {
    let mut result = Options { data: "/data".into(), map: "/opt/impact-map.json".into(), analysis: None, policy: Policy::Function, baseline_all: false };
    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--data" => result.data = args.next().ok_or("--data needs a directory")?.into(),
            "--map" => result.map = args.next().ok_or("--map needs a file")?.into(),
            "--analysis" => result.analysis = Some(args.next().ok_or("--analysis needs a file")?.into()),
            "--policy" => result.policy = match args.next().as_deref() { Some("line") => Policy::Line, Some("function") => Policy::Function, _ => return Err("--policy must be line or function".into()) },
            "--mode" => match args.next().as_deref() { Some("baseline-all") => result.baseline_all = true, Some("impact") => result.baseline_all = false, _ => return Err("--mode must be impact or baseline-all".into()) },
            "--help" | "-h" => {
                eprintln!("blast-radius-selector [--data /data] [--map /opt/impact-map.json] [--analysis FILE] [--policy function|line] [--mode impact|baseline-all]\nFunction is the default policy. Line is experimental and can miss short-circuit effects.\nOutputs only one JSON line per patch. Invalid maps/patches widen to every test.");
                std::process::exit(0);
            }
            _ => return Err(format!("unknown option: {arg}")),
        }
    }
    Ok(result)
}

fn read_limited(path: &Path, limit: u64) -> Result<String,String> {
    let metadata = fs::metadata(path).map_err(|e|format!("{}: {e}",path.display()))?;
    if metadata.len() > limit { return Err(format!("{} exceeds size limit",path.display())); }
    fs::read_to_string(path).map_err(|e|format!("{}: {e}",path.display()))
}

fn emit_line(output: &mut String,id: &str,workers: &[Vec<usize>]) {
    output.push_str("{\"commit\":"); output.push_str(&json::quote(id)); output.push_str(",\"workers\":[");
    for (i,worker) in workers.iter().enumerate() {
        if i > 0 { output.push(','); } output.push('[');
        for (j,test) in worker.iter().enumerate() {
            if j > 0 { output.push(','); } output.push_str(&test.to_string());
        }
        output.push(']');
    }
    output.push_str("]}\n");
}

fn run() -> Result<(),String> {
    let options = options()?;
    let catalog = TestCatalog::parse(&read_limited(&options.data.join("tests.json"),32_000_000)?)?;
    let map = if options.baseline_all { None } else {
        match read_limited(&options.map,128_000_000).and_then(|s| ImpactMap::parse(&s,&catalog)) {
            Ok(map) => Some(map),
            Err(error) => { eprintln!("map unavailable; selecting every test: {error}"); None }
        }
    };
    let mut analysis_failed = false;
    let analysis = if let Some(path) = &options.analysis {
        match read_limited(path,32_000_000).and_then(|s|Analysis::parse(&s)) {
            Ok(a) => Some(a),
            Err(error) => { eprintln!("analysis unavailable; selecting every test: {error}"); analysis_failed = true; None }
        }
    } else { None };
    let mut patches = Vec::new();
    for entry in fs::read_dir(options.data.join("commits")).map_err(|e|format!("cannot read commits: {e}"))? {
        let entry = entry.map_err(|e|format!("cannot read commit entry: {e}"))?;
        let path = entry.path();
        if path.extension().is_some_and(|extension| extension == "patch") { patches.push(path); }
    }
    patches.sort();
    let mut output = String::new();
    let mut simulated_ms = 0u64;
    let mut fallback_count = 0;
    let mut selected_count = 0;
    for path in &patches {
        let id = path.file_stem().and_then(|s|s.to_str()).ok_or("non-UTF8 commit filename")?;
        let missing_analysis = analysis.as_ref().is_some_and(|a| !a.commits.contains_key(id));
        let (selection,reserves) = if analysis_failed || missing_analysis || map.is_none() { (vec![true;catalog.len()],vec![false;catalog.len()]) } else {
            let attempt = read_limited(path,32_000_000).and_then(|s|diff::parse(&s)).and_then(|changes| {
                let map = map.as_ref().unwrap();
                select(&changes,&catalog,map,analysis.as_ref().and_then(|a|a.commits.get(id)),options.policy)
                    .map(|selection|(selection,reserve_tests(&changes,&catalog,map)))
            });
            match attempt {
                Ok(selection) => selection,
                Err(error) => { eprintln!("{id}: selecting every test ({error})"); fallback_count += 1; (vec![true;catalog.len()],vec![false;catalog.len()]) }
            }
        };
        let mut workers = schedule::schedule(&selection,&catalog.durations);
        schedule::augment_headroom(&mut workers,&reserves,&catalog.durations);
        simulated_ms += schedule::cost(&workers,&catalog.durations);
        selected_count += workers.iter().map(Vec::len).sum::<usize>();
        emit_line(&mut output,id,&workers);
        if output.len() > STDOUT_LIMIT { return Err("output would exceed conservative 2 MB limit".into()); }
    }
    // Build the complete response before writing, preventing partial JSON on an error.
    io::stdout().lock().write_all(output.as_bytes()).map_err(|e|format!("stdout write failed: {e}"))?;
    eprintln!("{} commits; {} scheduled tests; {} fallbacks; simulated selection cost {:.3}s (before misses and CPU)",patches.len(),selected_count,fallback_count,simulated_ms as f64/1000.0);
    Ok(())
}

fn main() {
    if let Err(error) = run() { eprintln!("selector error: {error}"); std::process::exit(2); }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn catalog() -> TestCatalog {
        TestCatalog::parse(r#"{"tests":[{"number":0,"id":"t0","file":"tests/a.py","seconds":0.1},{"number":1,"id":"t1","file":"tests/a.py","seconds":0.2},{"number":2,"id":"t2","file":"tests/b.py","seconds":0.3}]}"#).unwrap()
    }
    fn map() -> ImpactMap {
        let f=FileImpact { lines: BTreeMap::from([(2,Arc::from([0,1])),(3,Arc::from([0])),(4,Arc::from([1]))]), all:Arc::from([0,1]), functions:vec![FunctionImpact{start:1,end:5,header_end:1,tests:Arc::from([0,1])}], importers:Arc::from([0,1,2]), source_sensitive:Arc::from([2]),source:Some("def f():\n    x = 1\n    return x\n    x = 2\n    return x\n".into()) };
        ImpactMap{files:BTreeMap::from([("x.py".into(),f)])}
    }
    #[test] fn line_selection_preserves_source_sensitive_readers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return 2\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Line).unwrap(),vec![true,false,true]);
    }
    #[test] fn function_policy_broadens_execution() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return 2\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Function).unwrap(),vec![true,true,true]);
    }
    #[test] fn header_change_includes_importers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-def f():\n+def f(x=broken):\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Line).unwrap(),vec![true,true,true]);
    }
    #[test] fn ast_equivalence_keeps_source_sensitive_tests() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return x # comment\n";
        let a=CommitAnalysis{force_all:false,files:BTreeMap::from([("x.py".into(),FileAnalysis{syntax_error:false,ast_equal:true})])};
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),Some(&a),Policy::Line).unwrap(),vec![false,false,true]);
    }
    #[test] fn syntax_error_includes_importers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return (\n";
        let a=CommitAnalysis{force_all:false,files:BTreeMap::from([("x.py".into(),FileAnalysis{syntax_error:true,ast_equal:false})])};
        let mut incomplete_map=map();
        let file=incomplete_map.files.get_mut("x.py").unwrap();
        file.importers=Arc::from([0]);
        file.all=Arc::from([0]);
        file.source_sensitive=Arc::from([]);
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&incomplete_map,Some(&a),Policy::Function).unwrap(),vec![true,true,true]);
    }
    #[test] fn unknown_file_and_bad_baseline_are_not_silent_empty() {
        let unknown="--- a/unknown.py\n+++ b/unknown.py\n@@ -1 +1 @@\n-a\n+b\n";
        assert!(select(&diff::parse(unknown).unwrap(),&catalog(),&map(),None,Policy::Line).is_err());
        let wrong="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return wrong\n+    return x\n";
        assert!(select(&diff::parse(wrong).unwrap(),&catalog(),&map(),None,Policy::Line).is_err());
    }
    #[test] fn output_commit_is_json_escaped() {
        let mut out=String::new(); emit_line(&mut out,"quoted\"\n",&[vec![1,2]]);
        let value=json::parse(out.trim_end()).unwrap();
        assert_eq!(value.get("commit").unwrap().string().unwrap(),"quoted\"\n");
        assert_eq!(value.object().unwrap().len(),2);
    }
    #[test] fn wrong_numbering_and_identity_are_rejected() {
        assert!(TestCatalog::parse(r#"{"tests":[{"number":1,"id":"x","file":"f","seconds":1}]}"#).is_err());
        let document=format!("{{\"version\":1,\"base_commit\":\"{BASE_COMMIT}\",\"test_count\":3,\"test_ids\":[\"bad\",\"t1\",\"t2\"],\"files\":{{}}}}");
        assert!(ImpactMap::parse(&document,&catalog()).is_err());
    }
    #[test] fn interned_sets_are_validated_and_shared() {
        let document=format!(r#"{{"version":1,"base_commit":"{BASE_COMMIT}","test_count":3,"sets":[[],[0,2]],"files":{{"x.py":{{"lines":{{"1":1,"2":1}},"all":1,"importers":0,"source_sensitive":0,"functions":[]}}}}}}"#);
        let map=ImpactMap::parse(&document,&catalog()).unwrap();
        let file=&map.files["x.py"];
        assert_eq!(&*file.all,&[0,2]);
        assert!(Arc::ptr_eq(&file.all,&file.lines[&1]));
        assert!(Arc::ptr_eq(&file.lines[&1],&file.lines[&2]));
        assert!(ImpactMap::parse(&document.replace("\"all\":1","\"all\":9"),&catalog()).is_err());
    }
    #[test] fn insertion_includes_previously_unreached_branch() {
        let mut map=map();
        let info=map.files.get_mut("x.py").unwrap();
        info.lines.insert(3,Arc::from([0]));
        info.lines.insert(4,Arc::from([0]));
        let mut selection=vec![false;3];
        select_insertion(&mut selection,info,4,Policy::Line);
        assert_eq!(selection,vec![true,true,false]);
    }
    #[test] fn short_circuit_replacement_requires_function_scope() {
        let mut map=map();
        let file=map.files.get_mut("x.py").unwrap();
        file.source=Some("def f(a,b):\n    if (a\n        and b):\n        return 1\n    return 0\n".into());
        file.lines.insert(3,Arc::from([0]));
        let patch="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-        and b):\n+        or b):\n";
        let changes=diff::parse(patch).unwrap();
        assert_eq!(select(&changes,&catalog(),&map,None,Policy::Function).unwrap(),vec![true,true,true]);
        // Deliberately document why line mode is experimental, not the default.
        assert_eq!(select(&changes,&catalog(),&map,None,Policy::Line).unwrap(),vec![true,false,true]);
    }
}
