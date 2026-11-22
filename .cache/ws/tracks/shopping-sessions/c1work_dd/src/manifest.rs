pub fn top_level_string(json: &[u8], wanted: &[u8]) -> Option<Vec<u8>> {
    let mut parser = Parser { text: json, at: 0 };
    if parser.text.starts_with(b"\xef\xbb\xbf") {
        parser.at = 3;
    }
    parser.space();
    parser.expect(b'{')?;
    let mut found = None;
    parser.space();
    if parser.peek()? == b'}' {
        return None;
    }
    loop {
        parser.space();
        let key = parser.string()?;
        parser.space();
        parser.expect(b':')?;
        parser.space();
        if key == wanted && parser.peek()? == b'"' {
            found = Some(parser.string()?);
        } else {
            if key == wanted {
                found = None;
            }
            parser.skip_value(0)?;
        }
        parser.space();
        match parser.next()? {
            b',' => continue,
            b'}' => break,
            _ => return None,
        }
    }
    found
}

struct Parser<'a> {
    text: &'a [u8],
    at: usize,
}

impl Parser<'_> {
    fn peek(&self) -> Option<u8> {
        self.text.get(self.at).copied()
    }

    fn next(&mut self) -> Option<u8> {
        let byte = self.peek()?;
        self.at += 1;
        Some(byte)
    }

    fn expect(&mut self, byte: u8) -> Option<()> {
        (self.next()? == byte).then_some(())
    }

    fn space(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\t' | b'\n' | b'\r')) {
            self.at += 1;
        }
    }

    fn hex4(&mut self) -> Option<u32> {
        let mut value = 0;
        for _ in 0..4 {
            let digit = (self.next()? as char).to_digit(16)?;
            value = value * 16 + digit;
        }
        Some(value)
    }

    fn string(&mut self) -> Option<Vec<u8>> {
        self.expect(b'"')?;
        let mut out = Vec::new();
        loop {
            match self.next()? {
                b'"' => return Some(out),
                b'\\' => {
                    let escaped = match self.next()? {
                        b'"' => b'"',
                        b'\\' => b'\\',
                        b'/' => b'/',
                        b'b' => 8,
                        b'f' => 12,
                        b'n' => b'\n',
                        b'r' => b'\r',
                        b't' => b'\t',
                        b'u' => {
                            let mut code = self.hex4()?;
                            if (0xD800..0xDC00).contains(&code) {
                                self.expect(b'\\')?;
                                self.expect(b'u')?;
                                let low = self.hex4()?;
                                if !(0xDC00..0xE000).contains(&low) {
                                    return None;
                                }
                                code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00);
                            }
                            let ch = char::from_u32(code)?;
                            let mut buf = [0u8; 4];
                            out.extend_from_slice(ch.encode_utf8(&mut buf).as_bytes());
                            continue;
                        }
                        _ => return None,
                    };
                    out.push(escaped);
                }
                byte if byte < 0x20 => return None,
                byte => out.push(byte),
            }
        }
    }

    fn skip_value(&mut self, depth: usize) -> Option<()> {
        if depth > 512 {
            return None;
        }
        match self.peek()? {
            b'"' => {
                self.string()?;
            }
            b'{' => {
                self.at += 1;
                self.space();
                if self.peek()? == b'}' {
                    self.at += 1;
                    return Some(());
                }
                loop {
                    self.space();
                    self.string()?;
                    self.space();
                    self.expect(b':')?;
                    self.space();
                    self.skip_value(depth + 1)?;
                    self.space();
                    match self.next()? {
                        b',' => continue,
                        b'}' => break,
                        _ => return None,
                    }
                }
            }
            b'[' => {
                self.at += 1;
                self.space();
                if self.peek()? == b']' {
                    self.at += 1;
                    return Some(());
                }
                loop {
                    self.space();
                    self.skip_value(depth + 1)?;
                    self.space();
                    match self.next()? {
                        b',' => continue,
                        b']' => break,
                        _ => return None,
                    }
                }
            }
            _ => {
                let start = self.at;
                while matches!(self.peek(), Some(b'-' | b'+' | b'.' | b'0'..=b'9' | b'a'..=b'z' | b'A'..=b'Z')) {
                    self.at += 1;
                }
                if self.at == start {
                    return None;
                }
            }
        }
        Some(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn top_level_only() {
        let nested = br#"{"note":{"window_start":"1999-01-01T00:00:00Z","window_end":"1999-01-02T00:00:00Z"},"window_start":"2026-10-01T00:00:00Z","window_end":"2026-10-15T00:00:00Z"}"#;
        assert_eq!(top_level_string(nested, b"window_start").unwrap(), b"2026-10-01T00:00:00Z");
        assert_eq!(top_level_string(nested, b"window_end").unwrap(), b"2026-10-15T00:00:00Z");
        let variants = b"{\"window_end\":\"2026-10-14T06:00:00Z\",\"extra\":[1,2,{\"seed\":5}],\n\t\"window_start\" :  \"2026-10-01T12:30:00Z\"}";
        assert_eq!(top_level_string(variants, b"window_start").unwrap(), b"2026-10-01T12:30:00Z");
        assert_eq!(top_level_string(variants, b"window_end").unwrap(), b"2026-10-14T06:00:00Z");
        let listed = br#"{"a":["window_start","x"],"window_start":"2026-10-01T00:00:00Z","b":-1.5e3,"c":true,"d":null}"#;
        assert_eq!(top_level_string(listed, b"window_start").unwrap(), b"2026-10-01T00:00:00Z");
        let twice = br#"{"window_start":"2026-01-01T00:00:00Z","window_start":"2026-02-01T00:00:00Z"}"#;
        assert_eq!(top_level_string(twice, b"window_start").unwrap(), b"2026-02-01T00:00:00Z");
        assert_eq!(top_level_string(br#"{"w":{"window_start":"x"}}"#, b"window_start"), None);
        assert_eq!(top_level_string(b"{}", b"window_start"), None);
        assert_eq!(top_level_string(br#"{"window_start":5}"#, b"window_start"), None);
        assert_eq!(top_level_string(br#"{"window_start":"x""#, b"window_start"), None);
    }
}
