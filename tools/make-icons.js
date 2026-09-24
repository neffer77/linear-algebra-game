#!/usr/bin/env node
/*
 * Draws the app icons, rather than storing them.
 *
 *   node tools/make-icons.js         every icon
 *   node tools/make-icons.js ios     only the iOS app's
 *   -> icons/icon-192.png, icon-512.png, icon-180.png, icon-maskable-512.png
 *   -> ios/Eigenrealm/Assets.xcassets/AppIcon.appiconset/icon-1024.png
 *
 * Every other pixel in this project is drawn procedurally at runtime; the app
 * icon is the one image a browser insists on having as a file. So it is drawn
 * by the same kind of canvas code and exported once, which keeps the crest and
 * the palette in step with the game instead of drifting from it.
 *
 * Needs Playwright's Chromium, which is only a build dependency — the game
 * itself still has none.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
const IOS = path.join(__dirname, '..', 'ios', 'Eigenrealm', 'Assets.xcassets', 'AppIcon.appiconset');
const SIZES = [
  { file: 'icon-192.png', size: 192, pad: 0.06 },
  { file: 'icon-512.png', size: 512, pad: 0.06 },
  { file: 'icon-180.png', size: 180, pad: 0.06 },   // apple-touch-icon
  // Maskable icons are cropped to a circle by some launchers, so the crest
  // has to sit inside the middle 80% and the background must reach the edge.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.20 },
  // The iOS app. iOS rounds the corners itself, so the art is a full-bleed
  // square — which the backdrop already is — with the crest given more room
  // than a browser icon, since the mask eats further into the edges. And no
  // alpha channel: an app icon must be opaque, and a canvas only ever exports
  // RGBA, so this one is written as RGB by hand below.
  { file: 'icon-1024.png', size: 1024, pad: 0.12, dir: IOS, opaque: true, tag: 'ios' }
];

/** Drawn in the page, so this is browser canvas code. */
const DRAW = ({ size, pad, raw }) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const S = size;

  // backdrop: the game's night-purple, lit from the top left
  const bg = g.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#2a1d4a');
  bg.addColorStop(0.55, '#1b1233');
  bg.addColorStop(1, '#0d0918');
  g.fillStyle = bg;
  g.fillRect(0, 0, S, S);

  const glow = g.createRadialGradient(S * 0.32, S * 0.26, 0, S * 0.32, S * 0.26, S * 0.75);
  glow.addColorStop(0, 'rgba(242,193,78,.20)');
  glow.addColorStop(1, 'rgba(242,193,78,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, S, S);

  // the shield the knight carries, centred in the safe area
  const inset = S * pad;
  const w = S - inset * 2, h = w * 0.96;
  const x = inset, y = (S - h) / 2;
  const shield = () => {
    g.beginPath();
    g.moveTo(x + w * 0.5, y);
    g.lineTo(x + w * 0.94, y + h * 0.17);
    g.lineTo(x + w * 0.94, y + h * 0.56);
    g.quadraticCurveTo(x + w * 0.9, y + h * 0.86, x + w * 0.5, y + h);
    g.quadraticCurveTo(x + w * 0.1, y + h * 0.86, x + w * 0.06, y + h * 0.56);
    g.lineTo(x + w * 0.06, y + h * 0.17);
    g.closePath();
  };

  const face = g.createLinearGradient(x, y, x + w, y + h);
  face.addColorStop(0, '#4b7fd6');
  face.addColorStop(1, '#23406e');
  shield(); g.fillStyle = face; g.fill();

  g.save(); shield(); g.clip();
  g.fillStyle = 'rgba(255,255,255,.10)';
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x, y + h * 0.72); g.closePath(); g.fill();
  g.restore();

  shield();
  g.lineWidth = Math.max(2, S * 0.022);
  g.strokeStyle = '#f2c14e';
  g.stroke();

  // λ — the eigenvalue the whole game is named for
  g.fillStyle = '#f2c14e';
  g.font = `bold ${Math.round(h * 0.52)}px Georgia, "Times New Roman", serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,.45)';
  g.shadowBlur = S * 0.03;
  g.shadowOffsetY = S * 0.012;
  g.fillText('λ', x + w * 0.5, y + h * 0.48);

  // Smooth gradients are the worst case for PNG — the 512px icon came out at
  // 328 KB. Snapping each channel to a coarser grid costs nothing visible at
  // icon size and lets the compressor find runs to collapse.
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = (d[i]   & 0xF8) | 4;
    d[i+1] = (d[i+1] & 0xF8) | 4;
    d[i+2] = (d[i+2] & 0xF8) | 4;
  }
  g.putImageData(img, 0, 0);

  // The pixels themselves, for an icon that has to be written without alpha.
  if (raw) {
    let bin = '';
    for (let i = 0; i < d.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  return c.toDataURL('image/png');
};

/* A PNG with no alpha channel: colour type 2, eight bits a channel. Written by
   hand because the only other way to strip alpha is a dependency this project
   does not otherwise need. CRC-32 by table, so it runs on any Node. */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const rgbPng = (rgba, size) => {
  const stride = size * 3 + 1;
  const rows = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    rows[y * stride] = 0;                             // filter: none
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4, o = y * stride + 1 + x * 3;
      rows[o] = rgba[s]; rows[o + 1] = rgba[s + 1]; rows[o + 2] = rgba[s + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;                          // 8-bit, truecolour, no alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');

  const only = process.argv[2];
  for (const { file, size, pad, dir, opaque, tag } of SIZES) {
    if (only && tag !== only) continue;
    const into = dir || OUT;
    fs.mkdirSync(into, { recursive: true });
    let png;
    if (opaque) {
      const rgba = Buffer.from(await page.evaluate(DRAW, { size, pad, raw: true }), 'base64');
      png = rgbPng(rgba, size);
    } else {
      const url = await page.evaluate(DRAW, { size, pad });
      png = Buffer.from(url.split(',')[1], 'base64');
    }
    fs.writeFileSync(path.join(into, file), png);
    console.log(`${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB${opaque ? '  (RGB, no alpha)' : ''}`);
  }
  await browser.close();
})();
