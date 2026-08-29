#!/usr/bin/env node
/* Playthrough suites — the game, driven in a real browser.
 *
 *   npm run test:play                 every suite
 *   npm run test:play -- --suite run  just one
 *   PLAY_HEADED=1 npm run test:play   watch it happen
 *
 * tools/verify.js checks the things that can be checked without a browser: the
 * mathematics the generators claim to teach, and the knight codec. These check
 * the things that cannot — the run loop, the save referee, the first ninety
 * seconds, and the scheduler that decides what you are asked next.
 *
 * Each suite gets a fresh browser context, so a knight saved by one can never
 * leak into another.
 */
'use strict';

const { loadPlaywright, launchOptions, runSuite } = require('./play/harness');

const SUITES = [
  require('./play/save'),        // P0
  require('./play/wave'),        // P1
  require('./play/lock'),        // P3
  require('./play/run'),         // P4
  require('./play/frontdoor'),   // P5
  require('./play/adapt'),       // P6
  require('./play/skills'),      // S1
  require('./play/chain'),       // S2
  require('./play/foresight')    // S3
];

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : null;
}

(async () => {
  const only = arg('--suite');
  const picked = only ? SUITES.filter(s => s.name === only) : SUITES;
  if (only && !picked.length) {
    console.error(`No suite named "${only}". Try: ${SUITES.map(s => s.name).join(', ')}`);
    process.exit(2);
  }

  const { chromium } = loadPlaywright();
  let browser;
  try {
    browser = await chromium.launch(launchOptions());
  } catch (e) {
    console.error('Could not start Chromium: ' + e.message +
      '\nInstall it with: npx playwright install chromium');
    process.exit(2);
  }

  console.log('\nKnights of the Eigenrealm — playthrough');
  console.log('──────────────────────────────────────────────────────────');

  let failed = 0, total = 0;
  const started = Date.now();
  for (const suite of picked) {
    const checks = await runSuite(browser, suite);
    const bad = checks.filter(c => !c.pass);
    total += checks.length;
    failed += bad.length;
    const mark = bad.length ? '✗' : '✓';
    console.log(`\n  ${mark} ${suite.title}   ${checks.length - bad.length}/${checks.length}`);
    // Passing suites stay quiet; a failing one shows everything it knows.
    for (const c of bad) {
      console.log(`      FAIL  ${c.name}`);
      if (c.detail) console.log(`            ${c.detail}`);
    }
  }
  await browser.close();

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log('\n──────────────────────────────────────────────────────────');
  if (failed) {
    console.log(`\n${failed} of ${total} checks failed  (${secs}s)\n`);
    process.exit(1);
  }
  console.log(`\nAll ${total} checks passed  (${secs}s)\n`);
})();
