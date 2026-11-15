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
  require('./play/foresight'),   // S3
  require('./play/tavern'),      // S4
  require('./play/passage'),     // S5
  require('./play/rumours'),     // S6
  require('./play/summit'),      // S7
  require('./play/sigil'),       // S8
  require('./play/wilds'),       // S9
  require('./play/thicket'),     // S10
  require('./play/sea'),         // S11a
  require('./play/library'),     // S11b
  require('./play/crucible'),    // S12
  require('./play/working'),     // S13
  require('./play/nudge'),       // the first step of the working, stopped short of the answer
  require('./play/a11y'),        // every control can be reached, named and pressed from the keyboard
  require('./play/again'),       // a miss is followed by a fresh question on the same topic
  require('./play/findslip'),    // a mastered topic is now and then asked as find the slip
  require('./play/talk'),        // foes speak: an opening line, gloats, worries and last words
  require('./play/slips'),       // the same mistake twice is named
  require('./play/review'),      // what has faded is named on the map and brought back
  require('./play/competency'),  // the curriculum on one screen, every topic on its rung
  require('./play/workshop'),    // a matrix turned by hand, the plane redrawn on each tap
  require('./play/dot'),         // two arrows set by hand, their dot product, angle and shadow
  require('./play/eig'),         // one arrow, four matrices: hunt the directions each only stretches
  require('./play/slope'),       // a secant becomes a tangent as h closes in
  require('./play/compose'),     // two moves of the plane, and why their order matters
  require('./play/limit'),       // closing in on a point from the left and the right
  require('./play/descent'),     // a walk down a valley against its gradient
  require('./play/span'),        // a of one arrow and b of another
  require('./play/elim'),        // two equations solved with row operations
  require('./play/undo'),        // the matrix that puts a move back
  require('./play/fit'),         // the line that misses least
  require('./play/newton'),      // a tangent's road to a root
  require('./play/chainrule'),   // why the slopes of two links multiply
  require('./play/castles'),     // the split a matrix leaves alone
  require('./play/optim'),       // the biggest build a fixed fence allows
  require('./play/cistern'),     // what an integral adds up
  require('./play/hopital'),     // ratios that give 0/0
  require('./play/handson'),     // the workshop that fits a fall
  require('./play/product'),     // two strips and a corner
  require('./play/area'),        // rectangles under a curve close in on the integral
  require('./play/taylor'),      // a function rebuilt from powers of x
  require('./play/lesson'),      // S14
  require('./play/keep'),        // S15
  require('./play/ios'),         // the iOS app's bridge
  require('./play/pwa'),         // the installed game finds the newest build
  require('./play/map'),         // M1
  require('./play/cheat')        // T1
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
