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
  require('./play/ladder'),      // a sliding ladder's two speeds
  require('./play/null'),        // the arrows a matrix crushes
  require('./play/gram'),        // taking a shadow away
  require('./play/geo'),         // an endless sum, term by term
  require('./play/bend'),        // the slope of the slope, and where the bend flips
  require('./play/avg'),         // the average value as the height an area settles at
  require('./play/tail'),        // improper integrals: which endless areas stay finite
  require('./play/lathe'),       // volumes of revolution as a stack of disks
  require('./play/swap'),        // u-substitution as a swap
  require('./play/implicit'),    // implicit differentiation round a curve
  require('./play/parts'),       // integration by parts as a split
  require('./play/detect'),      // eigenvalues where det(A − λI) = 0
  require('./play/hill'),        // the slope each way you face: ∇f · û
  require('./play/cof'),         // a 3×3 determinant along any row or column
  require('./play/cover'),       // partial fractions by covering up roots
  require('./play/slice'),       // double integrals one slice at a time
  require('./play/tracer'),      // the derivative traced out as dots
  require('./play/arrow'),       // adding, stretching and measuring vectors
  require('./play/horizon'),     // where a fraction heads as x grows
  require('./play/cross'),       // an arrow square to two others
  require('./play/quot'),        // the slope of f/g
  require('./play/anti'),        // the power rule run backwards
  require('./play/transpose'),   // rows into columns, by hand
  require('./play/diag'),        // eigenvectors make P⁻¹AP diagonal
  require('./play/trigint'),     // divide by the k inside
  require('./play/tanplane'),    // a height and two slopes
  require('./play/invslope'),   // mirror the curve, flip the slope
  require('./play/logdiff'),    // x in the base and the power: take ln first
  require('./play/pathchain'),  // dz/dt along a path: an x part and a y part
  require('./play/expint'),  // ∫ e^(kx) dx: fit F to a slope field, divide by k
  require('./play/wsindex'), // every workshop one tap from the top of the Tome
  require('./play/slopematch'), // see f, pick which of three graphs is f′
  require('./play/matpick'), // see a shape, pick which of four matrices makes it
  require('./play/eigspot'), // see four arrows, spot the one a matrix keeps on its line
  require('./play/intpick'), // see a shaded curve, pick which of four numbers is its integral
  require('./play/chainpick'), // see y = f(g(x)), pick which of four formulas is its slope
  require('./play/productpick'), // see y = f(x) · g(x), pick which of four formulas is its slope
  require('./play/quotpick'), // see y = f(x) / g(x), pick which of four formulas is its slope
  require('./play/lampick'),  // see a matrix, pick which of four pairs are its eigenvalues
  require('./play/spanpick'), // see two arrows and a ring, pick which of four mixes lands on it
  require('./play/dotpick'),  // see two arrows, pick which of four numbers is u·v
  require('./play/antipick'), // see f, pick which of four F has f as its slope
  require('./play/transpick'), // see A, pick which of four matrices is Aᵀ
  require('./play/crosspick'), // see u and v, pick which of four arrows is u × v
  require('./play/undopick'), // see A, pick which of four matrices is A⁻¹
  require('./play/nullpick'), // see a flat A, pick which of four arrows it crushes
  require('./play/grampick'), // see u₁ and u₂, pick which of four numbers is c
  require('./play/cofpick'), // see a 3×3 matrix, pick which of four numbers is det A
  require('./play/elimpick'), // see two rows, pick which of four numbers k clears x
  require('./play/hoppick'), // see a 0/0 ratio, pick which of four numbers is its limit
  require('./play/newtonpick'), // see a curve and a first guess, pick which of four numbers is the next guess
  require('./play/avgpick'), // see a curve and its area, pick which of four numbers is its average value
  require('./play/geopick'), // see a series, pick which of four numbers is its endless sum
  require('./play/ladpick'), // see a ladder, pick which of four numbers is the top's speed
  require('./play/imppick'), // see a curve and a point, pick which of four numbers is the slope there
  require('./play/covpick'), // see a fraction split in two, pick which of four numbers is A
  require('./play/trigpick'), // see a wave to undo, pick which of four numbers is c
  require('./play/flippick'), // see a cubic, pick which of four numbers is where its bend flips
  require('./play/tailpick'), // see an endless area, pick which of four numbers it closes in on
  require('./play/growpick'), // see an exponential, pick which of four numbers goes in front of its antiderivative
  require('./play/seriespick'), // see an exponential, pick which of four numbers sits in front of a power of x
  require('./play/lathepick'), // see a curve spun into a solid, pick which of four numbers is its volume
  require('./play/hillpick'), // see a hill, a point and a heading, pick which of four numbers is the slope that way
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
