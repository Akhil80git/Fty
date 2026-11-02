import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPng(width, height, pixelFn) {
  const rowLen = width * 4;
  const rawData = Buffer.alloc((1 + rowLen) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + rowLen);
    rawData[rowOffset] = 0; // Filter type 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // non-interlaced

  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  ihdrChunk.writeUInt32BE(crc32(ihdrChunk.subarray(4, 21)), 21);

  // IDAT
  const idatChunk = Buffer.alloc(4 + 4 + deflated.length + 4);
  idatChunk.writeUInt32BE(deflated.length, 0);
  idatChunk.write('IDAT', 4);
  deflated.copy(idatChunk, 8);
  idatChunk.writeUInt32BE(crc32(idatChunk.subarray(4, 8 + deflated.length)), 8 + deflated.length);

  // IEND
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4);
  iendChunk.writeUInt32BE(crc32(Buffer.from('IEND')), 8);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate an awesome modern gradient icon with lightning / rocket / globe web opener icon
function drawIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w / 2;

  // Background gradient: Deep blue #0b1329 to electric indigo/purple #1e1b4b
  // With neon cyan/azure highlights
  const t = (x + y) / (w + h);
  let bgR = Math.round(15 + 20 * t);
  let bgG = Math.round(23 + 45 * t);
  let bgB = Math.round(42 + 90 * t);

  if (!isMaskable) {
    // Rounded squircle or circular container
    const cornerR = w * 0.22;
    // Check if within rounded rect
    const qx = Math.max(0, Math.abs(dx) - (w / 2 - cornerR));
    const qy = Math.max(0, Math.abs(dy) - (h / 2 - cornerR));
    const outsideDist = Math.sqrt(qx * qx + qy * qy);
    if (outsideDist > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
    if (outsideDist > cornerR - 1) {
      const alpha = Math.round(255 * (cornerR - outsideDist));
      return [bgR, bgG, bgB, Math.max(0, Math.min(255, alpha))];
    }
  }

  // Draw an inner glowing ring / globe motif & high-speed arrow/lightning in the center
  // Scale down for maskable safe zone (central 70%)
  const scale = isMaskable ? 0.72 : 0.85;
  const ndx = dx / (cx * scale);
  const ndy = dy / (cy * scale);
  const ndist = Math.sqrt(ndx * ndx + ndy * ndy);

  // Glowing circle outline
  if (Math.abs(ndist - 0.75) < 0.05) {
    const intensity = 1 - Math.abs(ndist - 0.75) / 0.05;
    return [
      Math.min(255, Math.round(bgR + 56 * intensity)),
      Math.min(255, Math.round(bgG + 189 * intensity)),
      Math.min(255, Math.round(bgB + 248 * intensity)),
      255
    ];
  }

  // High speed stylized "Lightning / Fast Opener" bolt in center
  // Normalized points for bolt: ([-0.1, -0.4], [0.35, -0.4], [-0.05, 0.05], [0.3, 0.05], [-0.3, 0.45], [-0.1, 0.05], [-0.35, 0.05])
  // Let's do a fast coordinate check or stylized web browser top bar + speed jet
  // Let's draw browser frame top bar ([-0.45, -0.45] to [0.45, 0.45])
  const bx = ndx;
  const by = ndy;

  // Browser capsule window
  if (Math.abs(bx) < 0.6 && Math.abs(by) < 0.45) {
    // Window header bar
    if (by > -0.45 && by < -0.22) {
      // 3 dots on top left
      const dot1 = Math.hypot(bx - (-0.42), by - (-0.335));
      const dot2 = Math.hypot(bx - (-0.30), by - (-0.335));
      const dot3 = Math.hypot(bx - (-0.18), by - (-0.335));
      if (dot1 < 0.04) return [239, 68, 68, 255]; // Red
      if (dot2 < 0.04) return [245, 158, 11, 255]; // Amber
      if (dot3 < 0.04) return [16, 185, 129, 255]; // Emerald

      // URL bar pills
      if (bx > -0.05 && bx < 0.52 && Math.abs(by - (-0.335)) < 0.04) {
        return [79, 140, 255, 220]; // Accent blue pill
      }
      return [30, 41, 59, 255]; // header dark
    }

    // Inside window: Electric lightning / speed rocket arrow
    // Check if inside bolt triangle 1:
    const inUpper = (by >= -0.15 && by <= 0.05 && bx >= -0.25 + (by + 0.15)*0.8 && bx <= 0.25 + (by + 0.15)*0.3);
    const inLower = (by > 0.02 && by <= 0.35 && bx >= -0.35 + (by - 0.02)*0.9 && bx <= 0.15 - (by - 0.02)*0.7);
    if (inUpper || inLower) {
      // Vibrant electric cyan to neon blue
      return [56, 189, 248, 255];
    }

    // Subtle dark surface
    return [15, 23, 42, 255];
  }

  // Border of the capsule
  if (Math.abs(bx) <= 0.63 && Math.abs(by) <= 0.48 && (Math.abs(bx) >= 0.58 || Math.abs(by) >= 0.43)) {
    return [99, 102, 241, 200]; // Indigo border
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => drawIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => drawIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => drawIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => drawIcon(x, y, w, h, false)));

console.log('Successfully generated all PWA PNG icons!');
