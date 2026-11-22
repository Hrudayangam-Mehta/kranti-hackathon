pub fn fields<const N: usize>(line: &[u8]) -> Option<[&[u8]; N]> {
    if line.is_empty() {
        return None;
    }
    let mut out = [&line[..0]; N];
    let mut count = 0;
    for raw in line.split(|&byte| byte == b',') {
        if count == N {
            return None;
        }
        out[count] = unquote(raw)?;
        count += 1;
    }
    if count == N {
        Some(out)
    } else {
        None
    }
}

fn unquote(raw: &[u8]) -> Option<&[u8]> {
    if !raw.contains(&b'"') {
        return Some(raw);
    }
    let n = raw.len();
    if n >= 2 && raw[0] == b'"' && raw[n - 1] == b'"' && !raw[1..n - 1].contains(&b'"') {
        Some(&raw[1..n - 1])
    } else {
        None
    }
}

pub fn lines(chunk: &[u8]) -> impl Iterator<Item = &[u8]> {
    chunk.split(|&byte| byte == b'\n')
}

pub fn data_chunks(file: &[u8], target_bytes: usize) -> Vec<(usize, usize)> {
    let mut chunks = Vec::new();
    let Some(header_end) = file.iter().position(|&byte| byte == b'\n') else {
        return chunks;
    };
    let mut start = header_end + 1;
    while start < file.len() {
        let nominal = start.saturating_add(target_bytes.max(1));
        let end = if nominal >= file.len() {
            file.len()
        } else {
            match file[nominal..].iter().position(|&byte| byte == b'\n') {
                Some(offset) => nominal + offset + 1,
                None => file.len(),
            }
        };
        chunks.push((start, end));
        start = end;
    }
    chunks
}

pub fn rows(file: &[u8]) -> impl Iterator<Item = &[u8]> {
    let body = match file.iter().position(|&byte| byte == b'\n') {
        Some(header_end) => &file[header_end + 1..],
        None => &file[..0],
    };
    lines(body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dialect() {
        assert_eq!(fields::<2>(b"a,b"), Some([&b"a"[..], b"b"]));
        assert_eq!(fields::<2>(b"\"a\",\"\""), Some([&b"a"[..], b""]));
        assert_eq!(fields::<2>(b"\" a\",b "), Some([&b" a"[..], b"b "]));
        assert_eq!(fields::<2>(b"a,b\r"), Some([&b"a"[..], b"b\r"]));
        assert_eq!(fields::<2>(b"a,b,c"), None);
        assert_eq!(fields::<2>(b"a"), None);
        assert_eq!(fields::<2>(b""), None);
        assert_eq!(fields::<2>(b"a,b\""), None);
        assert_eq!(fields::<2>(b"a,\""), None);
        assert_eq!(fields::<2>(b"a,\"b\"c\""), None);
        assert_eq!(fields::<2>(b"a,x\"b\""), None);
        assert_eq!(fields::<1>(b"\r"), Some([&b"\r"[..]]));
    }

    #[test]
    fn chunking_covers_every_data_byte() {
        let file = b"h1,h2\nab,c\nd,e\n\nf,g";
        for target in 1..30 {
            let chunks = data_chunks(file, target);
            let mut joined = Vec::new();
            for &(start, end) in &chunks {
                assert!(end == file.len() || file[end - 1] == b'\n');
                joined.extend_from_slice(&file[start..end]);
            }
            assert_eq!(joined, &file[6..]);
        }
        assert!(data_chunks(b"h1,h2", 4).is_empty());
        assert!(data_chunks(b"", 4).is_empty());
        assert!(data_chunks(b"h1,h2\n", 4).is_empty());
    }
}
