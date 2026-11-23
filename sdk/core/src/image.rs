// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Image fills: a `data:image/png;base64,...` URI decoded to RGBA8 with no dependency.
//!
//! The scene builder decodes every image once, so a source that cannot be drawn is refused
//! (and replaced by the placeholder) for every consumer alike, and the rasterizer reads the
//! same pixels. Nothing here reads a file or a network URL. Limits: a URI of at most
//! [`MAX_URI_BYTES`], a side of at most [`MAX_SIDE`] and at most [`MAX_PIXELS`] pixels, checked
//! from the header before any pixel is allocated. Not read: interlaced PNGs, `tRNS`
//! transparency, gamma and color profiles; checksums are not verified.

pub const MAX_URI_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_SIDE: u32 = 4096;
pub const MAX_PIXELS: u64 = 4_000_000;

/// A decoded image: `rgba` is `width * height * 4` bytes, not premultiplied.
#[derive(Debug, Clone, PartialEq)]
pub struct Decoded {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// Decode a `data:image/png;base64,...` URI.
pub fn decode_data_uri(uri: &str) -> Result<Decoded, String> {
    if uri.len() > MAX_URI_BYTES {
        return Err(format!(
            "the image is {} bytes, over the limit of {MAX_URI_BYTES}",
            uri.len()
        ));
    }
    let uri = uri.trim();
    let Some(rest) = uri
        .get(..5)
        .filter(|p| p.eq_ignore_ascii_case("data:"))
        .map(|_| &uri[5..])
    else {
        return Err("only a data: URI is read (no file or network source)".into());
    };
    let (head, body) = rest.split_once(',').ok_or("the data: URI has no comma")?;
    let mut parts = head.split(';').map(|p| p.trim().to_ascii_lowercase());
    let media = parts.next().unwrap_or_default();
    if media != "image/png" {
        return Err(format!(
            "the media type '{media}' is not drawn; only image/png is read"
        ));
    }
    if !parts.any(|p| p == "base64") {
        return Err("the data: URI is not base64".into());
    }
    decode_png(&base64(body)?)
}

fn base64(s: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::with_capacity(s.len() / 4 * 3);
    let (mut acc, mut bits, mut pad) = (0u32, 0u32, 0usize);
    for c in s.bytes().filter(|c| !c.is_ascii_whitespace()) {
        let v = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            b'=' => {
                pad += 1;
                continue;
            }
            _ => return Err("the base64 data is malformed".into()),
        };
        if pad > 0 {
            return Err("the base64 data is malformed".into());
        }
        acc = acc << 6 | u32::from(v);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((acc >> bits) as u8);
            acc &= (1 << bits) - 1;
        }
    }
    Ok(out)
}

fn be32(b: &[u8]) -> u32 {
    u32::from_be_bytes([b[0], b[1], b[2], b[3]])
}

fn decode_png(b: &[u8]) -> Result<Decoded, String> {
    if b.len() < 33 || b[..8] != [0x89, b'P', b'N', b'G', 13, 10, 26, 10] || &b[12..16] != b"IHDR" {
        return Err("the data is not a PNG".into());
    }
    let (w, h) = (be32(&b[16..]), be32(&b[20..]));
    let (depth, ctype, interlace) = (b[24], b[25], b[28]);
    if w == 0 || h == 0 || w > MAX_SIDE || h > MAX_SIDE || u64::from(w) * u64::from(h) > MAX_PIXELS
    {
        return Err(format!(
            "the image is {w}x{h}; at most {MAX_SIDE} on a side and {MAX_PIXELS} pixels are read"
        ));
    }
    if interlace != 0 {
        return Err("an interlaced PNG is not read".into());
    }
    let channels = match (ctype, depth) {
        (0, 1 | 2 | 4 | 8 | 16) => 1,
        (2, 8 | 16) => 3,
        (3, 1 | 2 | 4 | 8) => 1,
        (4, 8 | 16) => 2,
        (6, 8 | 16) => 4,
        _ => {
            return Err(format!(
                "PNG color type {ctype} at depth {depth} is not read"
            ))
        }
    };
    let (mut plte, mut idat) = (Vec::new(), Vec::new());
    let mut at = 8;
    while at + 8 <= b.len() {
        let len = be32(&b[at..]) as usize;
        let end = at
            .checked_add(12 + len)
            .filter(|e| *e <= b.len())
            .ok_or("the PNG is truncated")?;
        let data = &b[at + 8..at + 8 + len];
        match &b[at + 4..at + 8] {
            b"PLTE" => plte = data.to_vec(),
            b"IDAT" => idat.extend_from_slice(data),
            b"IEND" => break,
            _ => {}
        }
        at = end;
    }
    if ctype == 3 && plte.len() < 3 {
        return Err("the PNG has no palette".into());
    }
    let bits = usize::from(depth) * channels;
    let stride = (w as usize * bits).div_ceil(8);
    let raw = inflate(
        idat.get(2..).ok_or("the PNG has no image data")?,
        (stride + 1) * h as usize,
    )?;
    let bpp = bits.div_ceil(8);
    let mut prev = vec![0u8; stride];
    let mut rgba = Vec::with_capacity(w as usize * h as usize * 4);
    for row in raw.chunks_exact(stride + 1) {
        let mut cur = row[1..].to_vec();
        for i in 0..stride {
            let a = if i >= bpp { cur[i - bpp] } else { 0 };
            let (up, c) = (prev[i], if i >= bpp { prev[i - bpp] } else { 0 });
            let pred = match row[0] {
                0 => 0,
                1 => a,
                2 => up,
                3 => ((u16::from(a) + u16::from(up)) / 2) as u8,
                4 => paeth(a, up, c),
                _ => return Err("the PNG has a bad row filter".into()),
            };
            cur[i] = cur[i].wrapping_add(pred);
        }
        for x in 0..w as usize {
            let sample = |k: usize| -> u8 {
                match depth {
                    8 => cur[x * channels + k],
                    16 => cur[(x * channels + k) * 2],
                    d => {
                        let per = 8 / usize::from(d);
                        let v = (cur[x / per] >> (8 - usize::from(d) * (x % per + 1)))
                            & ((1u8 << d) - 1);
                        if ctype == 3 {
                            v
                        } else {
                            (u16::from(v) * 255 / ((1u16 << d) - 1)) as u8
                        }
                    }
                }
            };
            let px = match ctype {
                0 => [sample(0), sample(0), sample(0), 255],
                2 => [sample(0), sample(1), sample(2), 255],
                3 => {
                    let i = usize::from(sample(0)) * 3;
                    match plte.get(i..i + 3) {
                        Some(p) => [p[0], p[1], p[2], 255],
                        None => return Err("the PNG indexes past its palette".into()),
                    }
                }
                4 => [sample(0), sample(0), sample(0), sample(1)],
                _ => [sample(0), sample(1), sample(2), sample(3)],
            };
            rgba.extend_from_slice(&px);
        }
        prev = cur;
    }
    Ok(Decoded {
        width: w,
        height: h,
        rgba,
    })
}

fn paeth(a: u8, b: u8, c: u8) -> u8 {
    let (ia, ib, ic) = (i16::from(a), i16::from(b), i16::from(c));
    let p = ia + ib - ic;
    let (pa, pb, pc) = ((p - ia).abs(), (p - ib).abs(), (p - ic).abs());
    if pa <= pb && pa <= pc {
        a
    } else if pb <= pc {
        b
    } else {
        c
    }
}

struct Bits<'a> {
    s: &'a [u8],
    pos: usize,
    bit: u32,
}

impl Bits<'_> {
    fn get(&mut self, n: u32) -> Result<u32, String> {
        let mut v = 0;
        for i in 0..n {
            let byte = *self.s.get(self.pos).ok_or("the PNG data is truncated")?;
            v |= u32::from(byte >> self.bit & 1) << i;
            self.bit += 1;
            if self.bit == 8 {
                self.bit = 0;
                self.pos += 1;
            }
        }
        Ok(v)
    }
}

/// A canonical Huffman code: the count of codes per length, and the symbols in code order.
struct Huff(Vec<u16>, Vec<u16>);

impl Huff {
    fn new(lens: &[u8]) -> Huff {
        let mut count = vec![0u16; 16];
        lens.iter().for_each(|&l| count[usize::from(l)] += 1);
        count[0] = 0;
        let mut syms: Vec<u16> = (0..lens.len() as u16)
            .filter(|&s| lens[usize::from(s)] > 0)
            .collect();
        syms.sort_by_key(|&s| lens[usize::from(s)]);
        Huff(count, syms)
    }

    fn decode(&self, br: &mut Bits) -> Result<u16, String> {
        let (mut code, mut first, mut index) = (0i32, 0i32, 0i32);
        for len in 1..16 {
            code |= br.get(1)? as i32;
            let count = i32::from(self.0[len]);
            if code - count < first {
                return self
                    .1
                    .get((index + code - first) as usize)
                    .copied()
                    .ok_or_else(|| "the PNG data is corrupt".into());
            }
            index += count;
            first = (first + count) << 1;
            code <<= 1;
        }
        Err("the PNG data is corrupt".into())
    }
}

const LBASE: [u16; 29] = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
    163, 195, 227, 258,
];
const LEXT: [u8; 29] = [
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DBASE: [u16; 30] = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537,
    2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DEXT: [u8; 30] = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
    13,
];
const CL_ORDER: [usize; 19] = [
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
];

/// Raw DEFLATE (RFC 1951) of exactly `want` bytes; more output than that is refused, so a
/// small stream cannot expand past what the header declared.
fn inflate(src: &[u8], want: usize) -> Result<Vec<u8>, String> {
    let bad = || "the PNG data is corrupt".to_string();
    let trunc = || "the PNG data is truncated".to_string();
    let mut br = Bits {
        s: src,
        pos: 0,
        bit: 0,
    };
    let mut out: Vec<u8> = Vec::with_capacity(want);
    loop {
        let last = br.get(1)? == 1;
        match br.get(2)? {
            0 => {
                if br.bit != 0 {
                    br.bit = 0;
                    br.pos += 1;
                }
                let h = br.s.get(br.pos..br.pos + 4).ok_or_else(trunc)?;
                let len = usize::from(h[0]) | usize::from(h[1]) << 8;
                let data = br.s.get(br.pos + 4..br.pos + 4 + len).ok_or_else(trunc)?;
                if out.len() + len > want {
                    return Err(bad());
                }
                out.extend_from_slice(data);
                br.pos += 4 + len;
            }
            t @ (1 | 2) => {
                let (lit, dist) = if t == 1 {
                    let mut l = [8u8; 288];
                    l[144..256].fill(9);
                    l[256..280].fill(7);
                    (Huff::new(&l), Huff::new(&[5u8; 30]))
                } else {
                    let nl = br.get(5)? as usize + 257;
                    let nd = br.get(5)? as usize + 1;
                    let nc = br.get(4)? as usize + 4;
                    let mut cl = [0u8; 19];
                    for &o in &CL_ORDER[..nc] {
                        cl[o] = br.get(3)? as u8;
                    }
                    let ch = Huff::new(&cl);
                    let mut lens: Vec<u8> = Vec::with_capacity(nl + nd);
                    while lens.len() < nl + nd {
                        let s = ch.decode(&mut br)?;
                        let (v, n) = match s {
                            0..=15 => (s as u8, 1),
                            16 => (*lens.last().ok_or_else(bad)?, 3 + br.get(2)?),
                            17 => (0, 3 + br.get(3)?),
                            _ => (0, 11 + br.get(7)?),
                        };
                        lens.extend(std::iter::repeat_n(v, n as usize));
                    }
                    if lens.len() != nl + nd {
                        return Err(bad());
                    }
                    (Huff::new(&lens[..nl]), Huff::new(&lens[nl..]))
                };
                loop {
                    let s = usize::from(lit.decode(&mut br)?);
                    if s < 256 {
                        if out.len() >= want {
                            return Err(bad());
                        }
                        out.push(s as u8);
                    } else if s == 256 {
                        break;
                    } else {
                        let i = s - 257;
                        let base = usize::from(*LBASE.get(i).ok_or_else(bad)?);
                        let len = base + br.get(u32::from(LEXT[i]))? as usize;
                        let d = usize::from(dist.decode(&mut br)?);
                        let base = usize::from(*DBASE.get(d).ok_or_else(bad)?);
                        let off = base + br.get(u32::from(DEXT[d]))? as usize;
                        if off > out.len() || out.len() + len > want {
                            return Err(bad());
                        }
                        for _ in 0..len {
                            out.push(out[out.len() - off]);
                        }
                    }
                }
            }
            _ => return Err(bad()),
        }
        if last {
            break;
        }
    }
    if out.len() != want {
        return Err(trunc());
    }
    Ok(out)
}

/// A valid PNG for tests (checksums included) with stored (uncompressed) deflate and filter 0,
/// written by hand so the decoder is checked against bytes it did not produce.
#[cfg(test)]
pub(crate) fn test_png(w: u32, h: u32, ctype: u8, px: &dyn Fn(u32, u32) -> Vec<u8>) -> Vec<u8> {
    let mut raw = Vec::new();
    for y in 0..h {
        raw.push(0);
        for x in 0..w {
            raw.extend(px(x, y));
        }
    }
    let mut z = vec![0x78, 0x01];
    let mut chunks = raw.chunks(65535).peekable();
    while let Some(c) = chunks.next() {
        z.push(u8::from(chunks.peek().is_none()));
        z.extend((c.len() as u16).to_le_bytes());
        z.extend((!(c.len() as u16)).to_le_bytes());
        z.extend(c);
    }
    let (mut a, mut b) = (1u32, 0u32);
    for &v in &raw {
        a = (a + u32::from(v)) % 65521;
        b = (b + a) % 65521;
    }
    z.extend((b << 16 | a).to_be_bytes());
    let mut out = vec![0x89, b'P', b'N', b'G', 13, 10, 26, 10];
    let mut chunk = |kind: &[u8], data: &[u8]| {
        out.extend((data.len() as u32).to_be_bytes());
        out.extend(kind);
        out.extend(data);
        let mut crc = !0u32;
        for &v in kind.iter().chain(data) {
            crc ^= u32::from(v);
            for _ in 0..8 {
                crc = if crc & 1 == 1 {
                    crc >> 1 ^ 0xEDB8_8320
                } else {
                    crc >> 1
                };
            }
        }
        out.extend((!crc).to_be_bytes());
    };
    let mut ihdr = Vec::new();
    ihdr.extend(w.to_be_bytes());
    ihdr.extend(h.to_be_bytes());
    ihdr.extend([8, ctype, 0, 0, 0]);
    chunk(b"IHDR", &ihdr);
    chunk(b"IDAT", &z);
    chunk(b"IEND", &[]);
    out
}

#[cfg(test)]
pub(crate) fn test_uri(png: &[u8]) -> String {
    const A: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut s = String::from("data:image/png;base64,");
    for c in png.chunks(3) {
        let n = c
            .iter()
            .enumerate()
            .fold(0u32, |a, (i, b)| a | u32::from(*b) << (16 - 8 * i));
        for i in 0..=c.len() {
            s.push(A[(n >> (18 - 6 * i) & 63) as usize] as char);
        }
        s.extend(std::iter::repeat_n('=', 3 - c.len()));
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_stored_rgba_png_decodes_to_its_pixels() {
        let png = test_png(2, 2, 6, &|x, y| {
            vec![
                (x * 200) as u8,
                (y * 100) as u8,
                7,
                255 - (x + y) as u8 * 50,
            ]
        });
        let d = decode_data_uri(&test_uri(&png)).unwrap();
        assert_eq!((d.width, d.height), (2, 2));
        assert_eq!(&d.rgba[4..8], &[200, 0, 7, 205]);
        assert_eq!(&d.rgba[8..12], &[0, 100, 7, 205]);
    }

    #[test]
    fn a_zlib_compressed_png_decodes_to_its_pixels() {
        // 16x16 RGB, pixel (x, y) = (16x, 16y, 8(x + y)); zlib level 9 (dynamic Huffman).
        let b64 = include_str!("image_testdata.b64").trim();
        let d = decode_data_uri(&format!("data:image/png;base64,{b64}")).unwrap();
        assert_eq!((d.width, d.height), (16, 16));
        let at = |x: usize, y: usize| &d.rgba[(y * 16 + x) * 4..][..4];
        assert_eq!(at(3, 5), &[48, 80, 64, 255]);
        assert_eq!(at(15, 15), &[240, 240, 240, 255]);
    }

    #[test]
    fn refusals_say_why() {
        let ok = test_uri(&test_png(1, 1, 6, &|_, _| vec![1, 2, 3, 4]));
        for (uri, why) in [
            ("https://x/y.png".to_string(), "data: URI"),
            ("file:///a.png".to_string(), "data: URI"),
            ("data:image/jpeg;base64,/9j/".to_string(), "image/png"),
            (
                "data:image/svg+xml;base64,PHN2Zz4=".to_string(),
                "image/png",
            ),
            ("data:image/gif;base64,R0lGOA==".to_string(), "image/png"),
            ("data:image/png,abc".to_string(), "not base64"),
            ("data:image/png;base64,@@@@".to_string(), "malformed"),
            ("data:image/png;base64,AAAA".to_string(), "not a PNG"),
            (ok[..ok.len() - 20].to_string(), "truncated"),
            (
                format!("data:image/png;base64,{}", "A".repeat(MAX_URI_BYTES)),
                "over the limit",
            ),
        ] {
            let e = decode_data_uri(&uri).unwrap_err();
            assert!(e.contains(why), "{uri:.40}: {e}");
        }
    }

    #[test]
    fn declared_sizes_are_limited_before_decoding() {
        let mut png = test_png(1, 1, 6, &|_, _| vec![0; 4]);
        png[16..20].copy_from_slice(&20000u32.to_be_bytes());
        png[20..24].copy_from_slice(&20000u32.to_be_bytes());
        let e = decode_data_uri(&test_uri(&png)).unwrap_err();
        assert!(e.contains("20000x20000"), "{e}");
        png[16..24].fill(0);
        assert!(decode_data_uri(&test_uri(&png)).is_err());
    }
}
