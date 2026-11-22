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
