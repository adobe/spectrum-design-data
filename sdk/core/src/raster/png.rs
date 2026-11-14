// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

//! Minimal PNG encoder: 8-bit RGBA, no filtering, zlib "stored" blocks (no compression).

const SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
/// Largest payload of one stored deflate block.
const STORED_MAX: usize = 65_535;

const fn crc_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut n = 0;
    while n < 256 {
        let mut c = n as u32;
        let mut k = 0;
        while k < 8 {
            c = if c & 1 != 0 {
                0xEDB8_8320 ^ (c >> 1)
            } else {
                c >> 1
            };
            k += 1;
        }
        table[n] = c;
        n += 1;
    }
    table
}

static CRC_TABLE: [u32; 256] = crc_table();

fn crc32(chunks: &[&[u8]]) -> u32 {
    let mut c = 0xFFFF_FFFFu32;
    for chunk in chunks {
        for b in *chunk {
            c = CRC_TABLE[((c ^ u32::from(*b)) & 0xFF) as usize] ^ (c >> 8);
        }
    }
    c ^ 0xFFFF_FFFF
}

fn adler32(data: &[u8]) -> u32 {
    let (mut a, mut b) = (1u32, 0u32);
    for chunk in data.chunks(5552) {
        for byte in chunk {
            a += u32::from(*byte);
            b += a;
        }
        a %= 65_521;
        b %= 65_521;
    }
    (b << 16) | a
}

fn chunk(out: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(kind);
    out.extend_from_slice(data);
    out.extend_from_slice(&crc32(&[kind, data]).to_be_bytes());
}

/// Encode `rgba` (`width * height * 4` bytes, straight alpha) as a PNG.
pub fn encode(width: u32, height: u32, rgba: &[u8]) -> Vec<u8> {
    let row = width as usize * 4;
    assert_eq!(rgba.len(), row * height as usize, "rgba length mismatch");
    let mut raw = Vec::with_capacity((row + 1) * height as usize);
    for line in rgba.chunks(row.max(1)).take(height as usize) {
        raw.push(0);
        raw.extend_from_slice(line);
    }
    let mut z = vec![0x78, 0x01];
    let blocks: Vec<&[u8]> = raw.chunks(STORED_MAX).collect();
    for (i, block) in blocks.iter().enumerate() {
        z.push(u8::from(i + 1 == blocks.len()));
        z.extend_from_slice(&(block.len() as u16).to_le_bytes());
        z.extend_from_slice(&(!(block.len() as u16)).to_le_bytes());
        z.extend_from_slice(block);
    }
    if blocks.is_empty() {
        z.extend_from_slice(&[1, 0, 0, 0xFF, 0xFF]);
    }
    z.extend_from_slice(&adler32(&raw).to_be_bytes());

    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.extend_from_slice(&[8, 6, 0, 0, 0]);

    let mut out = SIGNATURE.to_vec();
    chunk(&mut out, b"IHDR", &ihdr);
    chunk(&mut out, b"IDAT", &z);
    chunk(&mut out, b"IEND", &[]);
    out
}

/// A decoded PNG: size and straight-alpha RGBA bytes. Reads only what [`encode`] writes
/// (stored blocks, filter 0); used by tests and callers that check output.
#[derive(Debug, PartialEq)]
pub struct Decoded {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// Decode a PNG written by [`encode`], checking the signature, every chunk CRC and the Adler-32.
pub fn decode(png: &[u8]) -> Result<Decoded, String> {
    if png.get(..8) != Some(&SIGNATURE) {
        return Err("not a PNG".into());
    }
    let (mut pos, mut size, mut idat) = (8usize, None, Vec::new());
    while pos + 8 <= png.len() {
        let len = u32::from_be_bytes(png[pos..pos + 4].try_into().unwrap()) as usize;
        let kind: [u8; 4] = png[pos + 4..pos + 8].try_into().unwrap();
        let data = png.get(pos + 8..pos + 8 + len).ok_or("truncated chunk")?;
        let crc = png
            .get(pos + 8 + len..pos + 12 + len)
            .ok_or("truncated crc")?;
        if crc != crc32(&[&kind, data]).to_be_bytes() {
            return Err(format!("bad crc in {}", String::from_utf8_lossy(&kind)));
        }
        match &kind {
            b"IHDR" => {
                if data.get(8..13) != Some(&[8, 6, 0, 0, 0]) {
                    return Err("unsupported IHDR".into());
                }
                size = Some((
                    u32::from_be_bytes(data[0..4].try_into().unwrap()),
                    u32::from_be_bytes(data[4..8].try_into().unwrap()),
                ));
            }
            b"IDAT" => idat.extend_from_slice(data),
            _ => {}
        }
        pos += 12 + len;
    }
    let (width, height) = size.ok_or("missing IHDR")?;
    if idat.len() < 6 || idat[..2] != [0x78, 0x01] {
        return Err("bad zlib header".into());
    }
    let (mut raw, mut i) = (Vec::new(), 2usize);
    loop {
        let head = *idat.get(i).ok_or("truncated deflate")?;
        let len = u16::from_le_bytes(
            idat.get(i + 1..i + 3)
                .ok_or("truncated")?
                .try_into()
                .unwrap(),
        );
        let nlen = u16::from_le_bytes(
            idat.get(i + 3..i + 5)
                .ok_or("truncated")?
                .try_into()
                .unwrap(),
        );
        if len != !nlen || head & 0b110 != 0 {
            return Err("not a stored block".into());
        }
        raw.extend_from_slice(idat.get(i + 5..i + 5 + len as usize).ok_or("truncated")?);
        i += 5 + len as usize;
        if head & 1 == 1 {
            break;
        }
    }
    if idat.get(i..i + 4) != Some(&adler32(&raw).to_be_bytes()) {
        return Err("bad adler32".into());
    }
    let row = width as usize * 4;
    if raw.len() != (row + 1) * height as usize {
        return Err("pixel data length mismatch".into());
    }
    let mut rgba = Vec::with_capacity(row * height as usize);
    for line in raw.chunks(row + 1) {
        if line[0] != 0 {
            return Err("unsupported filter".into());
        }
        rgba.extend_from_slice(&line[1..]);
    }
    Ok(Decoded {
        width,
        height,
        rgba,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_checksums() {
        assert_eq!(crc32(&[b"IEND"]), 0xAE42_6082);
        assert_eq!(adler32(b"Wikipedia"), 0x11E6_0398);
    }

    #[test]
    fn round_trips_and_spans_stored_blocks() {
        let (w, h) = (300u32, 120u32);
        let rgba: Vec<u8> = (0..(w * h * 4) as usize)
            .map(|i| (i * 7 % 251) as u8)
            .collect();
        assert!(rgba.len() > STORED_MAX);
        let png = encode(w, h, &rgba);
        assert_eq!(&png[..8], &SIGNATURE);
        assert_eq!(
            decode(&png).unwrap(),
            Decoded {
                width: w,
                height: h,
                rgba
            }
        );
    }

    #[test]
    fn decode_rejects_corruption() {
        let mut png = encode(2, 2, &[9; 16]);
        let n = png.len();
        png[n - 20] ^= 0xFF;
        assert!(decode(&png).is_err());
        assert!(decode(b"nope").is_err());
    }

    #[test]
    fn empty_image_is_valid() {
        assert_eq!(decode(&encode(0, 0, &[])).unwrap().rgba.len(), 0);
    }
}
