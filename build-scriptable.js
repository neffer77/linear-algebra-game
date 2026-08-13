#!/usr/bin/env node
/*
 * Packages index.html into a standalone Scriptable script for iOS.
 *
 * The whole game is embedded as a string, so the resulting .js file runs
 * offline with no network access and no companion files.
 *
 *   node build-scriptable.js
 *   -> scriptable/KnightsOfTheEigenrealm.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Escape for a JS template literal: backslashes, backticks, and ${ interpolation.
const embedded = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const out = `// Knights of the Eigenrealm — a knight-battler that teaches
// linear algebra and calculus.
//
// GENERATED FILE. Edit index.html and re-run \`node build-scriptable.js\`.
//
// How to use:
//   1. Copy this whole file.
//   2. Open Scriptable on iOS, tap +, paste, and name it
//      "Knights of the Eigenrealm".
//   3. Tap ▶ to play. Add it to your home screen via the Shortcuts app
//      ("Run Script") for one-tap launching.
//
// Everything runs offline inside a WebView. Progress is saved to the
// WebView's local storage and also mirrored to iCloud/local Scriptable
// storage so it survives the app being closed.

// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: chess-knight;

const HTML = \`${embedded}\`;

const SAVE_FILE = "eigenrealm-save.json";
const fm = FileManager.local();
const savePath = fm.joinPath(fm.documentsDirectory(), SAVE_FILE);

// Pull any previously saved progress off disk so it survives app restarts.
let restored = "null";
if (fm.fileExists(savePath)) {
  try { restored = fm.readString(savePath) || "null"; } catch (e) { restored = "null"; }
}

// Bridge: seed localStorage before the game boots, and hand progress back
// to Scriptable whenever it changes.
const BRIDGE = \`
(function(){
  // Progress is spread across several keys now — the knight roster and one
  // save slot per knight — so the bridge carries the whole namespace rather
  // than a single key.
  var seed = \${JSON.stringify(restored)};
  try {
    var all = seed && seed !== "null" ? JSON.parse(seed) : null;
    if (all && typeof all === "object") {
      // Older builds stored the bare save string under one key; accept both.
      if (typeof all === "string" || all.hp !== undefined) {
        if (!localStorage.getItem("eigenrealm.v1")) localStorage.setItem("eigenrealm.v1", seed);
      } else {
        for (var k in all) if (Object.prototype.hasOwnProperty.call(all, k)) {
          if (localStorage.getItem(k) === null) localStorage.setItem(k, all[k]);
        }
      }
    }
  } catch(e) {}
})();
\`;

const wv = new WebView();
await wv.loadHTML(HTML);
await wv.evaluateJavaScript(BRIDGE, false);
await wv.present(true);

// After the player closes the view, write their progress to disk.
try {
  const finalSave = await wv.evaluateJavaScript(
    'completion(JSON.stringify(Object.keys(localStorage)' +
    '.filter(function(k){return k.indexOf("eigenrealm.") === 0;})' +
    '.reduce(function(o,k){o[k]=localStorage.getItem(k);return o;}, {})))', true
  );
  if (finalSave) fm.writeString(savePath, finalSave);
} catch (e) {
  // Nothing to persist — the player may have closed before any progress.
}

Script.complete();
`;

const dir = path.join(root, 'scriptable');
fs.mkdirSync(dir, { recursive: true });
const dest = path.join(dir, 'KnightsOfTheEigenrealm.js');
fs.writeFileSync(dest, out);

console.log(`Wrote ${path.relative(root, dest)}  (${(out.length / 1024).toFixed(1)} KB)`);
