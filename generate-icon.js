// 生成番茄钟图标 (pink circle, 64x64, ICO format)
const fs = require('fs');
const zlib = require('zlib');

const S = 64, cx = S/2, cy = S/2, R = S/2 - 2;
const pixels = Buffer.alloc(S * S * 4, 0);

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const dx = x - cx + 0.5, dy = y - cy + 0.5;
    const d = Math.sqrt(dx*dx + dy*dy);
    const i = (y * S + x) * 4;

    if (d <= R) {
      const grad = Math.max(0, 1 - d / R);
      const hl = Math.round(Math.pow(grad, 4) * 40);
      pixels[i] = 245 + hl;      // R
      pixels[i+1] = 87 + hl;     // G
      pixels[i+2] = 108;          // B
      pixels[i+3] = 255;          // A
    } else if (d <= R + 1) {
      const aa = Math.round(255 * (1 - (d - R)));
      pixels[i] = 245; pixels[i+1] = 87; pixels[i+2] = 108; pixels[i+3] = aa;
    }
  }
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcData = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, t, data, crc]);
}

// Raw rows with filter byte 0
const raw = Buffer.alloc(S * (1 + S * 4));
for (let y = 0; y < S; y++) {
  raw[y * (1 + S * 4)] = 0;
  pixels.copy(raw, y * (1 + S * 4) + 1, y * S * 4, (y + 1) * S * 4);
}
const compressed = zlib.deflateSync(raw, { level: 9 });

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; // RGBA

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

// ICO wrapper
const count = 1;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);     // reserved
header.writeUInt16LE(1, 2);     // type = ICO
header.writeUInt16LE(count, 4);

const entry = Buffer.alloc(16);
entry[0] = S >= 256 ? 0 : S;    // width
entry[1] = S >= 256 ? 0 : S;    // height
entry[2] = 0;                    // colors
entry[3] = 0;                    // reserved
entry.writeUInt16LE(1, 4);       // planes
entry.writeUInt16LE(32, 6);      // bpp
entry.writeUInt32LE(png.length, 8);   // size
entry.writeUInt32LE(22, 12);     // offset (6 + 16)

const ico = Buffer.concat([header, entry, png]);
fs.writeFileSync('build/icon.ico', ico);
console.log('✅ build/icon.ico generated (' + ico.length + ' bytes)');
