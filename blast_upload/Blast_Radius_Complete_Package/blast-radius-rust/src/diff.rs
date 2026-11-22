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
