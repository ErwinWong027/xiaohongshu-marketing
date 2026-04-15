/**
 * generate-icons.mjs  — pure Node.js, zero native dependencies
 *
 * Uses only built-in `node:zlib` + `node:fs` to write PNG files.
 * Design: XHS red (#FF2442) rounded-rect background + white open-book shape.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'chrome-extension', 'public');
mkdirSync(PUBLIC_DIR, { recursive: true });

// ─── CRC32 ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ─── PNG writer ───────────────────────────────────────────────────────────────

function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB  = Buffer.allocUnsafe(4); lenB.writeUInt32BE(data.length, 0);
  const crcB  = Buffer.allocUnsafe(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

/**
 * Build a PNG from a pixel-getter function.
 * @param {number} w  width
 * @param {number} h  height
 * @param {(x:number, y:number) => [number,number,number,number]} pixel  returns [r,g,b,a] 0-255
 */
function makePNG(w, h, pixel) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Raw scanlines (filter byte 0 = None per row)
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter type None
    for (let x = 0; x < w; x++) {
      const off = y * (1 + w * 4) + 1 + x * 4;
      const [r, g, b, a] = pixel(x, y);
      raw[off]     = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon design ──────────────────────────────────────────────────────────────

/**
 * Returns [r, g, b, a] for one pixel of our icon at size `sz`.
 *
 * Design:
 *  • Red (#FF2442) rounded-rectangle background
 *  • White open-book silhouette (two pages + spine gap)
 *  • Horizontal ruled lines on each page (for size ≥ 32)
 */
function iconPixel(x, y, sz) {
  const fx = x / sz;  // 0..1
  const fy = y / sz;

  // ── Rounded-rect clip ──────────────────────────────────────────────────────
  const r  = 0.18;  // corner radius ratio
  const cx = Math.max(r, Math.min(1 - r, fx));
  const cy = Math.max(r, Math.min(1 - r, fy));
  const dx = fx - cx, dy = fy - cy;
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0]; // transparent outside

  // ── Background gradient: top-left #FF2442 → bottom-right #C8102E ──────────
  const t   = (fx + fy) / 2;
  const bgR = Math.round(0xff + t * (0xc8 - 0xff));
  const bgG = Math.round(0x24 + t * (0x10 - 0x24));
  const bgB = Math.round(0x42 + t * (0x2e - 0x42));

  // ── Open-book shape (white) ────────────────────────────────────────────────
  // Book occupies [20%..80%] horizontally, [22%..78%] vertically
  // Spine gap: [47%..53%] horizontally
  const bx1 = 0.18, bx2 = 0.82, by1 = 0.20, by2 = 0.80;
  const spineL = 0.465, spineR = 0.535;

  const inBook = fx >= bx1 && fx <= bx2 && fy >= by1 && fy <= by2;
  const inSpine = fx >= spineL && fx <= spineR;

  if (inBook && !inSpine) {
    // Check ruled lines (only for size ≥ 32)
    if (sz >= 32) {
      const lineCount = 3;
      const lineH = 0.018;
      const lineSpacing = (by2 - by1 - 0.10) / (lineCount + 1);
      for (let i = 1; i <= lineCount; i++) {
        const lineY = by1 + 0.06 + i * lineSpacing;
        if (Math.abs(fy - lineY) < lineH / 2) {
          return [0xff, 0xff, 0xff, 230]; // lighter white lines
        }
      }
    }
    return [0xff, 0xff, 0xff, 255]; // solid white page
  }

  // ── Spine: slightly lighter red ────────────────────────────────────────────
  if (inBook && inSpine) {
    return [bgR + 20 > 255 ? 255 : bgR + 20, bgG, bgB, 255];
  }

  return [bgR, bgG, bgB, 255];
}

// ─── Generate & write ─────────────────────────────────────────────────────────

const SIZES = [
  { sz: 16,  file: 'icon-16.png'  },
  { sz: 34,  file: 'icon-34.png'  },
  { sz: 48,  file: 'icon-48.png'  },
  { sz: 128, file: 'icon-128.png' },
];

for (const { sz, file } of SIZES) {
  const buf  = makePNG(sz, sz, (x, y) => iconPixel(x, y, sz));
  const dest = join(PUBLIC_DIR, file);
  writeFileSync(dest, buf);
  console.log(`✓  ${file}  (${sz}×${sz})  — ${buf.length} bytes`);
}

console.log('\nIcons written to chrome-extension/public/');
