const fs = require('fs');
const path = require('path');

// Minimal PNG structure: creates a solid orange square
// PNG signature + IHDR + IDAT (compressed pixel data) + IEND
function createMinimalPNG(size, r, g, b) {
  // Use Node's built-in zlib for PNG IDAT compression
  const zlib = require('zlib');

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8);  // width
  ihdr.writeUInt32BE(size, 12); // height
  ihdr.writeUInt8(8, 16);  // bit depth
  ihdr.writeUInt8(2, 17);  // color type: RGB
  ihdr.writeUInt8(0, 18);  // compression
  ihdr.writeUInt8(0, 19);  // filter
  ihdr.writeUInt8(0, 20);  // interlace
  // CRC of IHDR
  const crc1 = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(crc1, 21);

  // Raw pixel data: each row starts with filter byte 0, then RGB triples
  const rowSize = 1 + size * 3;
  const rawData = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    rawData[y * rowSize] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const offset = y * rowSize + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // IDAT chunk
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const crc2 = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(crc2, 8 + compressed.length);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple CRC32 implementation
function crc32(buf) {
  const table = makeCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Orange: #F97316 = rgb(249, 115, 22)
// Only create placeholder if real icon doesn't exist (skip if logo icons are present)
for (const size of [192, 512]) {
  const iconPath = path.join(iconsDir, `icon-${size}.png`);
  if (fs.existsSync(iconPath)) {
    console.log(`icon-${size}.png already exists, skipping placeholder creation`);
    continue;
  }
  const png = createMinimalPNG(size, 249, 115, 22);
  fs.writeFileSync(iconPath, png);
  console.log(`Created icon-${size}.png (${size}x${size} orange square)`);
}
