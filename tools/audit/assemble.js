/* Inline the SHOTS map into the audit page, producing the file that gets
   published.

   muster.html is the source and is kept lean on purpose: the images are a
   megabyte and a half of base64, which has no business in a diff. It carries a
   placeholder instead, and this swaps the real map in.

   The placeholder is matched exactly rather than by a loose regex, because the
   failure mode of getting this wrong is a page that publishes with no pictures
   and no error. */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, 'muster.html');
const SHOTS = path.join(DIR, 'shots-inline.js');
const OUT = path.join(DIR, 'muster-built.html');
const MARK = '<script>const SHOTS = {/*…*/};\n</script>';

if (!fs.existsSync(SHOTS)) {
  console.error('No shots-inline.js — run node tools/audit/build-shots.js first.');
  process.exit(1);
}

const lean = fs.readFileSync(SRC, 'utf8');
if (!lean.includes(MARK)) {
  console.error('The SHOTS placeholder is missing from muster.html; refusing to publish a page with no pictures.');
  process.exit(1);
}

const out = lean.replace(MARK, '<script>' + fs.readFileSync(SHOTS, 'utf8') + '</script>');

/* Every figure the page draws must have an image, and every image must have a
   figure. The page asserts this itself at runtime, but failing here is cheaper
   than failing in a browser after publishing. */
const wanted = [...lean.matchAll(/id="s-([a-z]+)"/g)].map(m => m[1]).sort();
const have = Object.keys(JSON.parse(
  /const SHOTS = (\{.*\});/s.exec(fs.readFileSync(SHOTS, 'utf8'))[1])).sort();
const missing = wanted.filter(k => !have.includes(k));
const spare = have.filter(k => !wanted.includes(k));
if (missing.length) { console.error('figures with no image:', missing); process.exit(1); }
if (spare.length) console.warn('note: images with no figure:', spare);

fs.writeFileSync(OUT, out);
console.log(`muster-built.html — ${Math.round(out.length / 1024)} KB, ${have.length} images`);
console.log('publish that file; keep muster.html as the thing you edit.');
